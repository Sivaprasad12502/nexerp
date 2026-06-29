import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getRbacContext } from "@/lib/rbac";
import { adaptDocumentToQuotationRow } from "@/lib/document-adapter";

type RouteCtx = { params: Promise<{ token: string }> };

/** Authenticated GET — client opens a debit note from an email link. */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { token } = await params;

  const document = await prisma.document.findFirst({
    where: { approvalToken: token, type: "DEBIT_NOTE" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: { select: { id: true, businessName: true, email: true } },
      business: {
        select: {
          name: true,
          brandName: true,
          businessSettings: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json(
      { error: "Debit note not found or link is invalid." },
      { status: 404 },
    );
  }

  const settings =
    typeof document.settings === "object" && document.settings !== null
      ? (document.settings as Record<string, unknown>)
      : {};

  const clientEmail = (
    document.client?.email ??
    (typeof settings.clientEmail === "string" ? settings.clientEmail : "")
  )
    .toLowerCase()
    .trim();

  const sessionEmail = session.user.email?.toLowerCase().trim() ?? "";

  if (!clientEmail || !sessionEmail || clientEmail !== sessionEmail) {
    return NextResponse.json(
      {
        error:
          "Only the intended recipient can view this debit note. Please sign in with the email address this debit note was sent to.",
      },
      { status: 403 },
    );
  }

  // Stamp seenAt on first view (mirror public invoice GET).
  if (!settings.seenAt) {
    await prisma.document.update({
      where: { id: document.id },
      data: {
        settings: { ...settings, seenAt: new Date().toISOString() },
      },
    });
    settings.seenAt = new Date().toISOString();
  }

  const payments = await prisma.payment.findMany({
    where: { documentId: document.id },
    orderBy: { paymentDate: "desc" },
    select: {
      id: true,
      amountReceived: true,
      paymentDate: true,
      method: true,
      status: true,
    },
  });

  const acceptanceStatus = (settings.acceptanceStatus as string) ?? null;
  const isDebitNoteAccepted = acceptanceStatus === "ACCEPTED";
  const paymentStatus = (settings.paymentStatus as string) ?? "UNPAID";
  const isPaid = paymentStatus === "PAID";

  // Resolve linked sales invoice via INVOICE → DEBIT_NOTE conversion.
  let linkedInvoiceId: string | null = null;
  let linkedInvoiceNumber: string | null = null;
  let linkedInvoiceApprovalToken: string | null = null;
  let expenditureAdded = false;
  let expenditureDocumentId: string | null = null;

  const invoiceConversion = await prisma.documentConversion.findFirst({
    where: {
      sourceType: "INVOICE",
      targetType: "DEBIT_NOTE",
      targetId: document.id,
      businessId: document.businessId,
    },
    select: { sourceId: true },
  });

  if (invoiceConversion) {
    const linkedInvoice = await prisma.document.findUnique({
      where: { id: invoiceConversion.sourceId },
      select: {
        id: true,
        documentNumber: true,
        approvalToken: true,
      },
    });

    if (linkedInvoice) {
      linkedInvoiceId = linkedInvoice.id;
      linkedInvoiceNumber = linkedInvoice.documentNumber;
      linkedInvoiceApprovalToken = linkedInvoice.approvalToken;
    }
  }

  const buyerCtx = await getRbacContext();
  if (buyerCtx) {
    const buyerConversion = await prisma.documentConversion.findFirst({
      where: {
        sourceType: "INVOICE",
        targetType: "DEBIT_NOTE",
        targetId: document.id,
        businessId: buyerCtx.businessId,
      },
      select: { sourceId: true },
    });
    expenditureDocumentId = buyerConversion?.sourceId ?? null;
    expenditureAdded = Boolean(buyerConversion);
  }

  return NextResponse.json({
    document: adaptDocumentToQuotationRow(
      { ...document, settings } as never,
      "Debit Note",
    ),
    businessSettings: document.business?.businessSettings ?? null,
    clientEmail: document.client?.email ?? settings.clientEmail ?? null,
    approvalToken: token,
    payments,
    acceptanceStatus,
    isDebitNoteAccepted,
    paymentStatus,
    isPaid,
    linkedInvoiceId,
    linkedInvoiceNumber,
    linkedInvoiceApprovalToken,
    expenditureAdded,
    expenditureDocumentId,
  });
}
