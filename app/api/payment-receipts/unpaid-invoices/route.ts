import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { mapPaymentReceiptRow } from "@/lib/payment-receipt-mapper";
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

  const purchaseBillConversions = await prisma.documentConversion.findMany({
    where: {
      businessId: ctx.businessId,
      sourceType: "PURCHASE_ORDER",
      targetType: "INVOICE",
    },
    select: { targetId: true },
  });
  const excludeIds = purchaseBillConversions.map((c) => c.targetId);

  const documents = await prisma.document.findMany({
    where: {
      businessId: ctx.businessId,
      type: "INVOICE",
      clientId,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
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
    invoices: unpaid.map((d) => ({
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
