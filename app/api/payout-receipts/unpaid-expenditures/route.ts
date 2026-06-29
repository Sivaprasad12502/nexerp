import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { parseInvoicePaymentStatus } from "@/lib/payout-receipt-utils";

export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payout-receipts", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vendorId = new URL(req.url).searchParams.get("vendorId");
  if (!vendorId) {
    return NextResponse.json({ error: "vendorId is required" }, { status: 400 });
  }

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, businessId: ctx.businessId, status: "ACTIVE" },
    select: { name: true },
  });
  if (!vendor) {
    return NextResponse.json({ error: "Invalid vendor" }, { status: 400 });
  }

  const documents = await prisma.document.findMany({
    where: {
      businessId: ctx.businessId,
      type: "INVOICE",
      purchasedAt: { not: null },
      clientName: { equals: vendor.name, mode: "insensitive" },
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

  const unpaid = documents.filter((d) => parseInvoicePaymentStatus(d.settings) !== "PAID");

  return NextResponse.json({
    expenditures: unpaid.map((d) => ({
      id: d.id,
      documentNumber: d.documentNumber,
      documentDate: d.documentDate.toISOString(),
      totalAmount: d.totalAmount,
      currency: d.currency,
      paidTo: d.clientName,
      paymentStatus: "UNPAID",
    })),
  });
}
