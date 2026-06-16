import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { paymentCreateSchema } from "@/lib/validations/payment";
import { notifyBusinessOwner, NotificationType } from "@/lib/notifications";
import { sendPaymentApprovalEmail, getSellerEmailContext } from "@/lib/mailer";

type RouteCtx = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  const document = await prisma.document.findUnique({
    where: { approvalToken: token },
    include: {
      business: { select: { name: true, brandName: true, userId: true } },
    },
  });

  if (!document || document.type !== "INVOICE") {
    return NextResponse.json(
      { error: "Invoice not found or link is invalid." },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = paymentCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;
  const amountToSettle = Math.max(0, document.totalAmount - data.amountReceived);

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        businessId: document.businessId,
        documentId: document.id,
        amountReceived: data.amountReceived,
        transactionCharge: 0,
        tdsWithheld: 0,
        amountToSettle,
        paymentDate: new Date(data.paymentDate),
        method: data.method ?? "ACCOUNT_TRANSFER",
        refId: data.refId ?? null,
        notes: data.notes ?? null,
        attachments: data.attachments ?? [],
        status: "PENDING",
        recordedByName: data.recordedByName ?? null,
      },
    });

    await notifyBusinessOwner(tx, document.businessId, {
      type: NotificationType.PAYMENT_RECEIVED,
      title: "Payment recorded",
      message: `A payment of ${document.currency} ${data.amountReceived} was recorded for invoice ${document.documentNumber}. Please review and approve.`,
      entityType: "DOCUMENT",
      entityId: document.id,
    });

    return p;
  });

  // Fire-and-forget approval email to the business owner
  try {
    const seller = await getSellerEmailContext(document.businessId);
    if (seller?.user?.email) {
      const origin =
        req.headers.get("origin") ??
        process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
        "";
      const approveUrl = `${origin}/sales-and-invoices/documents/${document.id}?payment=${payment.id}`;
      await sendPaymentApprovalEmail({
        to: seller.user.email,
        businessName: seller.brandName ?? seller.name,
        invoiceNumber: document.documentNumber,
        amount: data.amountReceived,
        clientName: data.recordedByName ?? document.clientName ?? "Client",
        approveUrl,
      });
    }
  } catch (err) {
    console.error("[POST public/payments] approval email failed", err);
  }

  return NextResponse.json({ payment }, { status: 201 });
}
