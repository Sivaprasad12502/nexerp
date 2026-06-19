import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { syncBuyerExpenditureOnVendorInvoicePaid } from "@/lib/sync-vendor-payment";
import { paymentCreateSchema } from "@/lib/validations/payment";

type RouteCtx = { params: Promise<{ id: string }> };

/** GET — list payments for a document (protected). */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, businessId: ctx.businessId },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const payments = await prisma.payment.findMany({
    where: { documentId: id, businessId: ctx.businessId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ payments });
}

/** POST — sender records a payment directly (APPROVED immediately). */
export async function POST(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, businessId: ctx.businessId, type: "INVOICE" },
  });

  if (!document) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
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
  const now = new Date();

  const settings =
    typeof document.settings === "object" && document.settings !== null
      ? (document.settings as Record<string, unknown>)
      : {};

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        businessId: ctx.businessId,
        documentId: id,
        amountReceived: data.amountReceived,
        transactionCharge: 0,
        tdsWithheld: 0,
        amountToSettle,
        paymentDate: new Date(data.paymentDate),
        method: data.method ?? "ACCOUNT_TRANSFER",
        refId: data.refId ?? null,
        notes: data.notes ?? null,
        attachments: data.attachments ?? [],
        status: "APPROVED",
        recordedByUserId: ctx.userId,
        approvedByUserId: ctx.userId,
        approvedAt: now,
      },
    });

    // Mark invoice as paid
    await tx.document.update({
      where: { id },
      data: {
        settings: {
          ...settings,
          paymentStatus: "PAID",
          paymentDate: data.paymentDate,
        },
      },
    });

    await syncBuyerExpenditureOnVendorInvoicePaid(tx, id, data.paymentDate);

    return p;
  });

  return NextResponse.json({ payment }, { status: 201 });
}
