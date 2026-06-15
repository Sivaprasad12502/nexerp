import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { getVendorEmailFromDocument } from "@/lib/document-adapter";

export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documents = await prisma.document.findMany({
    where: { businessId: ctx.businessId, type: "PURCHASE_ORDER" },
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: { select: { id: true, businessName: true, logo: true, email: true } },
    },
  });

  const ids = documents.map((d) => d.id);

  const purchaseConversions = ids.length
    ? await prisma.documentConversion.findMany({
        where: {
          businessId: ctx.businessId,
          sourceType: "PURCHASE_ORDER",
          sourceId: { in: ids },
          targetType: "INVOICE",
        },
        select: { sourceId: true, targetId: true, createdAt: true },
      })
    : [];

  const conversionMap = new Map(
    purchaseConversions.map((c) => [c.sourceId, c]),
  );

  const purchaseIds = purchaseConversions.map((c) => c.targetId);
  const purchaseDocs = purchaseIds.length
    ? await prisma.document.findMany({
        where: { id: { in: purchaseIds } },
        select: { id: true, documentNumber: true },
      })
    : [];
  const purchaseDocMap = new Map(purchaseDocs.map((d) => [d.id, d]));

  const vendors = await prisma.vendor.findMany({
    where: { businessId: ctx.businessId, status: "ACTIVE" },
    select: { name: true, email: true, linkedBusinessId: true },
  });
  const vendorByName = new Map(
    vendors.map((v) => [v.name.toLowerCase(), v.email]),
  );

  const purchaseOrders = documents.map((doc) => {
    const conversion = conversionMap.get(doc.id);
    const purchaseDoc = conversion ? purchaseDocMap.get(conversion.targetId) : null;
    const vendorName = doc.client?.businessName ?? doc.clientName ?? "";
    const vendorEmail =
      getVendorEmailFromDocument(doc) ??
      (vendorName ? vendorByName.get(vendorName.toLowerCase()) ?? null : null);

    return {
      id: doc.id,
      documentNumber: doc.documentNumber,
      documentDate: doc.documentDate,
      currency: doc.currency,
      subTotal: doc.subTotal,
      totalAmount: doc.totalAmount,
      status: doc.status,
      sentAt: doc.sentAt,
      purchasedAt: doc.purchasedAt,
      clientName: doc.clientName,
      fromName: doc.fromName,
      vendorName,
      vendorEmail,
      client: doc.client,
      items: doc.items.map((item) => ({
        id: item.id,
        name: item.name,
        hsnSac: item.hsnSac,
        sku: item.sku,
        taxRate: item.taxRate,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        total: item.total,
      })),
      isConvertedToPurchase: Boolean(conversion),
      purchaseDocumentId: purchaseDoc?.id ?? null,
      purchaseDocumentNumber: purchaseDoc?.documentNumber ?? null,
      acceptanceStatus: doc.purchasedAt
        ? "ACCEPTED"
        : doc.sentAt
          ? "PENDING"
          : null,
      emailSent: Boolean(doc.sentAt),
      workflowStatus: doc.purchasedAt ? "Completed" : "Pending",
    };
  });

  return NextResponse.json({ purchaseOrders, total: purchaseOrders.length });
}
