import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { creditNoteCreateSchema } from "@/lib/validations/quotation";
import { DOCUMENT_TYPE_PREFIX } from "@/lib/validations/document";
import { calcItem, calcTotals, numberToWords } from "@/lib/quotation-utils";

type CreditNoteSettings = {
  creditReason?: string;
  discountOffered?: string;
  creditConsumed?: number;
  clientEmail?: string;
};

function parseSettings(settings: unknown): CreditNoteSettings {
  if (typeof settings !== "object" || settings === null) return {};
  return settings as CreditNoteSettings;
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

export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "credit-notes", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documents = await prisma.document.findMany({
    where: {
      businessId: ctx.businessId,
      type: "CREDIT_NOTE",
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: { select: { id: true, businessName: true, logo: true, email: true } },
    },
  });

  const ids = documents.map((d) => d.id);

  const sourceConversions = ids.length
    ? await prisma.documentConversion.findMany({
        where: {
          businessId: ctx.businessId,
          targetType: "CREDIT_NOTE",
          targetId: { in: ids },
        },
        select: { sourceType: true, sourceId: true, targetId: true },
      })
    : [];

  const conversionByTarget = new Map(
    sourceConversions.map((c) => [c.targetId, c]),
  );

  const invoiceIds = sourceConversions
    .filter((c) => c.sourceType === "INVOICE")
    .map((c) => c.sourceId);

  const invoices = invoiceIds.length
    ? await prisma.document.findMany({
        where: { id: { in: invoiceIds } },
        select: { id: true, documentNumber: true },
      })
    : [];
  const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));

  const creditNotes = documents.map((doc) => {
    const conversion = conversionByTarget.get(doc.id);
    const settings = parseSettings(doc.settings);
    const issuedTo = doc.client?.businessName ?? doc.clientName ?? "";
    const clientEmail = getClientEmail(doc.settings, doc.client?.email);
    const creditConsumed = settings.creditConsumed ?? 0;
    const amountDue = Math.max(0, doc.totalAmount - creditConsumed);

    const linkedInvoice =
      conversion?.sourceType === "INVOICE"
        ? invoiceMap.get(conversion.sourceId)
        : null;

    return {
      id: doc.id,
      documentNumber: doc.documentNumber,
      documentDate: doc.documentDate,
      currency: doc.currency,
      subTotal: doc.subTotal,
      totalAmount: doc.totalAmount,
      creditIssued: doc.totalAmount,
      creditConsumed,
      amountDue,
      taxRate: deriveTaxRate(doc.items),
      status: doc.status,
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
      creditReason: settings.creditReason ?? null,
      discountOffered: settings.discountOffered ?? null,
      emailSent: Boolean(doc.sentAt),
      acceptanceStatus: null as null,
      linkedInvoiceId: linkedInvoice?.id ?? null,
      linkedInvoiceNumber: linkedInvoice?.documentNumber ?? null,
      workflowName: "—",
      currentAssignee: "—",
      currentStage: "—",
      currentStatus: doc.status === "ISSUED" ? "Issued" : doc.status,
    };
  });

  return NextResponse.json({ creditNotes, total: creditNotes.length });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "credit-notes", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = creditNoteCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;
  const linkedInvoiceId = data.linkedInvoiceId;

  const sourceInvoice = await prisma.document.findFirst({
    where: {
      id: linkedInvoiceId,
      businessId: ctx.businessId,
      type: "INVOICE",
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!sourceInvoice) {
    return NextResponse.json({ error: "Linked invoice not found" }, { status: 400 });
  }

  try {
    const document = await prisma.$transaction(async (tx) => {
      const count = await tx.document.count({
        where: { businessId: ctx.businessId, type: "CREDIT_NOTE" },
      });
      const prefix = DOCUMENT_TYPE_PREFIX.CREDIT_NOTE;
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

      const currency = data.currency || sourceInvoice.currency || "AED";
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
          type: "CREDIT_NOTE",
          documentNumber,
          documentDate: data.quotationDate
            ? new Date(data.quotationDate)
            : new Date(),
          validTillDate: null,
          title: ns(data.quotationTitle) ?? "Credit Note",
          subtitle: ns(data.subtitle),
          logo: ns(data.logo) ?? sourceInvoice.logo,
          currency,
          fromName: ns(data.fromName) ?? sourceInvoice.fromName,
          fromAddress: ns(data.fromAddress) ?? sourceInvoice.fromAddress,
          fromGstin: ns(data.fromGstin) ?? sourceInvoice.fromGstin,
          fromPan: ns(data.fromPan) ?? sourceInvoice.fromPan,
          clientId: ns(data.clientId) ?? sourceInvoice.clientId,
          clientName: ns(data.clientName) ?? sourceInvoice.clientName,
          clientAddress: ns(data.clientAddress) ?? sourceInvoice.clientAddress,
          clientGstin: ns(data.clientGstin) ?? sourceInvoice.clientGstin,
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
            creditConsumed: 0,
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

      await tx.documentConversion.create({
        data: {
          businessId,
          sourceType: "INVOICE",
          sourceId: linkedInvoiceId,
          targetType: "CREDIT_NOTE",
          targetId: doc.id,
          createdByUserId: userId,
        },
      });

      return doc;
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/credit-notes]", err);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
