import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { deliveryChallanCreateSchema } from "@/lib/validations/quotation";
import { DOCUMENT_TYPE_PREFIX } from "@/lib/validations/document";
import { calcItem, calcTotals, numberToWords } from "@/lib/quotation-utils";

type ChallanSettings = {
  clientEmail?: string;
  challanWorkflowStatus?: string;
  seenAt?: string;
};

function parseSettings(settings: unknown): ChallanSettings {
  if (typeof settings !== "object" || settings === null) return {};
  return settings as ChallanSettings;
}

function getClientEmail(
  settings: unknown,
  clientEmail: string | null | undefined,
): string | null {
  if (clientEmail) return clientEmail;
  const s = parseSettings(settings);
  return s.clientEmail ?? null;
}

function deriveTaxRate(items: { taxRate: number }[]): string {
  if (items.length === 0) return "0%";
  const max = Math.max(...items.map((i) => i.taxRate ?? 0));
  return `${max}%`;
}

function deriveWorkflowStatus(
  settings: ChallanSettings,
  sentAt: Date | null,
): "CREATED" | "SENT" | "SEEN" {
  if (settings.seenAt || settings.challanWorkflowStatus === "SEEN") return "SEEN";
  if (sentAt || settings.challanWorkflowStatus === "SENT") return "SENT";
  return "CREATED";
}

export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "delivery-challans", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documents = await prisma.document.findMany({
    where: {
      businessId: ctx.businessId,
      type: "DELIVERY_CHALLAN",
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: { select: { id: true, businessName: true, logo: true, email: true } },
    },
  });

  const deliveryChallans = documents.map((doc) => {
    const settings = parseSettings(doc.settings);
    const issuedTo = doc.client?.businessName ?? doc.clientName ?? "";
    const clientEmail = getClientEmail(doc.settings, doc.client?.email);
    const workflowStatus = deriveWorkflowStatus(settings, doc.sentAt);

    return {
      id: doc.id,
      documentNumber: doc.documentNumber,
      documentDate: doc.documentDate,
      currency: doc.currency,
      subTotal: doc.subTotal,
      totalAmount: doc.totalAmount,
      challanAmount: doc.totalAmount,
      taxRate: deriveTaxRate(doc.items),
      status: doc.status,
      workflowStatus,
      sentAt: doc.sentAt,
      fromName: doc.fromName,
      issuedTo,
      clientName: issuedTo,
      clientEmail,
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
      settings: doc.settings,
      emailSent: Boolean(doc.sentAt),
      workflowName: "—",
      currentAssignee: "—",
      currentStage: "—",
      currentStatus: workflowStatus,
    };
  });

  return NextResponse.json({ deliveryChallans, total: deliveryChallans.length });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "delivery-challans", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = deliveryChallanCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;

  try {
    const document = await prisma.$transaction(async (tx) => {
      const count = await tx.document.count({
        where: { businessId: ctx.businessId, type: "DELIVERY_CHALLAN" },
      });
      const prefix = DOCUMENT_TYPE_PREFIX.DELIVERY_CHALLAN;
      const documentNumber =
        data.quotationNumber?.trim() ||
        `${prefix}-${String(count + 1).padStart(4, "0")}`;

      const enrichedItems = (data.items ?? []).map((item, i) => {
        const { amount, taxAmount, total } = calcItem({
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          discount: Number(item.discount) || 0,
          taxRate: Number(item.taxRate) || 0,
        });
        return { ...item, amount, taxAmount, total, sortOrder: i };
      });

      const additionalChargesTotal = (data.additionalCharges ?? []).reduce(
        (s, c) => s + (Number(c.amount) || 0),
        0,
      );

      const totals = calcTotals({
        items: enrichedItems,
        discountAmount: Number(data.discountAmount) || 0,
        additionalCharges: additionalChargesTotal,
      });

      const currency = data.currency || "AED";
      const amountInWords = numberToWords(totals.totalAmount, currency);

      const docStatus =
        data.status === "SAVED" || data.status === "SENT" || data.status === "APPROVED"
          ? ("ISSUED" as const)
          : ("DRAFT" as const);

      const ns = (v?: string | null) =>
        v === undefined || v === null || v.trim() === "" ? null : v.trim();

      const baseSettings =
        typeof data.settings === "object" && data.settings !== null
          ? (data.settings as object)
          : {};

      const { businessId, userId } = ctx;

      const doc = await tx.document.create({
        data: {
          businessId,
          type: "DELIVERY_CHALLAN",
          documentNumber,
          documentDate: data.quotationDate
            ? new Date(data.quotationDate)
            : new Date(),
          validTillDate: data.validTillDate ? new Date(data.validTillDate) : null,
          title: ns(data.quotationTitle) ?? "Delivery Challan",
          subtitle: ns(data.subtitle),
          logo: ns(data.logo),
          currency,
          fromName: ns(data.fromName),
          fromAddress: ns(data.fromAddress),
          fromGstin: ns(data.fromGstin),
          fromPan: ns(data.fromPan),
          clientId: ns(data.clientId),
          clientName: ns(data.clientName),
          clientAddress: ns(data.clientAddress),
          clientGstin: ns(data.clientGstin),
          discountLabel: ns(data.discountLabel),
          discountAmount: Number(data.discountAmount) || 0,
          additionalCharges: data.additionalCharges ?? [],
          subTotal: totals.subTotal,
          totalTax: totals.totalTax,
          totalDiscount: totals.totalDiscount,
          totalQuantity: totals.totalQuantity,
          totalAmount: totals.totalAmount,
          amountInWords,
          termsAndConditions: ns(data.termsAndConditions),
          notes: ns(data.notes),
          signature: ns(data.signature),
          additionalInfo: ns(data.additionalInfo),
          contactDetails: ns(data.contactDetails),
          attachments: data.attachments ?? [],
          customFields: data.customFields ?? [],
          settings: {
            ...baseSettings,
            challanWorkflowStatus: "CREATED",
          },
          status: docStatus,
          createdByUserId: userId,
          items: {
            create: enrichedItems.map(({ productId, ...item }) => ({
              ...item,
              productId: ns(productId as string | undefined),
            })),
          },
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          client: { select: { id: true, businessName: true } },
        },
      });

      return doc;
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/delivery-challans]", err);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
