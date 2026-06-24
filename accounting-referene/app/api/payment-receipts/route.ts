import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { mapPaymentReceiptRow } from "@/lib/payment-receipt-mapper";
import {
  deriveReceiptStatus,
  settleInvoicesForReceipt,
  sumLines,
} from "@/lib/payment-receipt-settle";
import {
  generateReceiptNumber,
} from "@/lib/payment-receipt-utils";
import { paymentReceiptIncludeRelations as includeRelations } from "@/lib/payment-receipt-includes";
import { paymentReceiptCreateSchema } from "@/lib/validations/payment-receipt";

async function validateAccounts(businessId: string, accountIds: (string | null | undefined)[]) {
  const ids = [...new Set(accountIds.filter(Boolean))] as string[];
  if (ids.length === 0) return;
  const found = await prisma.paymentAccount.count({
    where: { businessId, id: { in: ids } },
  });
  if (found !== ids.length) throw new Error("INVALID_PAYMENT_ACCOUNT");
}

export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payment-receipts", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const clientId = searchParams.get("clientId") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const view = searchParams.get("view") ?? "active";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const sortBy = searchParams.get("sortBy") ?? "receiptDate";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const where: Prisma.PaymentReceiptWhereInput = {
    businessId: ctx.businessId,
    ...(view === "active" ? { status: { not: "ARCHIVED" } } : {}),
    ...(status === "SETTLED"
      ? {
          OR: [{ status: "SETTLED" }, { allocations: { some: {} } }],
        }
      : status
        ? { status: status as Prisma.EnumPaymentReceiptStatusFilter["equals"] }
        : {}),
    ...(clientId ? { clientId } : {}),
    ...(dateFrom || dateTo
      ? {
          receiptDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { receiptNumber: { contains: search, mode: "insensitive" } },
            { client: { businessName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.PaymentReceiptOrderByWithRelationInput =
    sortBy === "receiptNumber"
      ? { receiptNumber: sortDir }
      : sortBy === "totalAmount"
        ? { totalAmount: sortDir }
        : { receiptDate: sortDir };

  const [receipts, total] = await Promise.all([
    prisma.paymentReceipt.findMany({
      where,
      include: includeRelations,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.paymentReceipt.count({ where }),
  ]);

  return NextResponse.json({
    paymentReceipts: receipts.map(mapPaymentReceiptRow),
    total,
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payment-receipts", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const result = paymentReceiptCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, businessId: ctx.businessId, status: "ACTIVE" },
  });
  if (!client) {
    return NextResponse.json({ error: "Invalid client" }, { status: 400 });
  }

  try {
    await validateAccounts(
      ctx.businessId,
      data.lines.map((l) => l.paymentAccountId),
    );
  } catch {
    return NextResponse.json({ error: "Invalid payment account" }, { status: 400 });
  }

  const receiptNumber = data.receiptNumber?.trim() || (await generateReceiptNumber(ctx.businessId));
  const totalReceived = sumLines(data.lines);
  const totalAllocated = data.allocations.reduce((s, a) => s + a.amountAllocated, 0);
  const receiptType = data.type;
  const status = data.saveAsDraft
    ? ("DRAFT" as const)
    : deriveReceiptStatus(receiptType, totalReceived, totalAllocated);
  const primaryAccountId = data.lines[0]?.paymentAccountId ?? null;

  try {
    const receipt = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentReceipt.create({
        data: {
          businessId: ctx.businessId,
          receiptNumber,
          type: receiptType,
          status,
          clientId: data.clientId,
          receiptDate: new Date(data.receiptDate),
          currency: data.currency,
          numberFormat: data.numberFormat,
          decimalDigits: data.decimalDigits,
          customCurrencySymbol: data.customCurrencySymbol ?? null,
          totalAmount: totalReceived,
          notes: data.notes ?? null,
          signature: data.signature ?? null,
          additionalInfo: data.additionalInfo ?? null,
          contactDetails: data.contactDetails ?? null,
          attachments: data.attachments ?? [],
          settings: (data.settings ?? {}) as object,
          lines: {
            create: data.lines.map((line, idx) => ({
              paymentAccountId: line.paymentAccountId ?? null,
              method: line.method,
              refId: line.refId ?? null,
              amountReceived: line.amountReceived,
              amountInBaseCurrency: line.amountInBaseCurrency ?? line.amountReceived,
              transactionCharge: line.transactionCharge ?? 0,
              tags: line.tags ?? [],
              sortOrder: line.sortOrder ?? idx,
            })),
          },
        },
      });

      if (!data.saveAsDraft && data.allocations.length > 0) {
        await settleInvoicesForReceipt(tx, {
          businessId: ctx.businessId,
          userId: ctx.userId,
          receiptId: created.id,
          receiptDate: data.receiptDate,
          allocations: data.allocations,
          paymentAccountId: primaryAccountId,
        });
        await tx.paymentReceipt.update({
          where: { id: created.id },
          data: { status: "SETTLED" },
        });
      }

      return tx.paymentReceipt.findUniqueOrThrow({
        where: { id: created.id },
        include: includeRelations,
      });
    });

    return NextResponse.json(
      { paymentReceipt: mapPaymentReceiptRow(receipt) },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.startsWith("INVALID_INVOICE")) {
        return NextResponse.json({ error: "One or more invoices are invalid" }, { status: 400 });
      }
      if (err.message.startsWith("INVOICE_ALREADY_PAID")) {
        return NextResponse.json({ error: "One or more invoices are already paid" }, { status: 409 });
      }
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/payment-receipts]", err);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
