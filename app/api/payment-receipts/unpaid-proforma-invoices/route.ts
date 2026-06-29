import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { parseInvoicePaymentStatus } from "@/lib/payment-receipt-utils";

export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payment-receipts", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const documents = await prisma.document.findMany({
    where: {
      businessId: ctx.businessId,
      type: "PROFORMA_INVOICE",
      clientId,
    },
    orderBy: { documentDate: "desc" },
    select: {
      id: true,
      documentNumber: true,
      documentDate: true,
      totalAmount: true,
      currency: true,
      settings: true,
      clientName: true,
    },
  });

  const unpaid = documents.filter(
    (d) => parseInvoicePaymentStatus(d.settings) !== "PAID",
  );

  return NextResponse.json({
    proformaInvoices: unpaid.map((d) => ({
      id: d.id,
      documentNumber: d.documentNumber,
      documentDate: d.documentDate.toISOString(),
      totalAmount: d.totalAmount,
      currency: d.currency,
      billedTo: d.clientName,
      paymentStatus: "UNPAID",
    })),
  });
}
