import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { mapPayoutReceiptRow } from "@/lib/payout-receipt-mapper";
import {
  derivePayoutReceiptStatus,
  settleExpendituresForPayout,
  sumPayoutLines,
} from "@/lib/payout-receipt-settle";
import { generatePayoutReceiptNumber } from "@/lib/payout-receipt-utils";
import { backfillAllPayoutReceipts } from "@/lib/payout-receipt-sync";
import { payoutReceiptIncludeRelations as includeRelations } from "@/lib/payout-receipt-includes";
import { payoutReceiptCreateSchema } from "@/lib/validations/payout-receipt";

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
  if (!ctxCan(ctx, "payout-receipts", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ensure paid expenditures have matching settled payout receipts (idempotent backfill)
  await backfillAllPayoutReceipts();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const vendorId = searchParams.get("vendorId") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const view = searchParams.get("view") ?? "active";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const sortBy = searchParams.get("sortBy") ?? "receiptDate";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const where: Prisma.PayoutReceiptWhereInput = {
    businessId: ctx.businessId,
    ...(view === "active" ? { status: { not: "ARCHIVED" } } : {}),
    ...(status === "SETTLED"
      ? {
          OR: [{ status: "SETTLED" }, { allocations: { some: {} } }],
        }
      : status
        ? { status: status as Prisma.EnumPayoutReceiptStatusFilter["equals"] }
        : {}),
    ...(vendorId ? { vendorId } : {}),
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
            { vendor: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.PayoutReceiptOrderByWithRelationInput =
    sortBy === "receiptNumber"
      ? { receiptNumber: sortDir }
      : sortBy === "totalAmount"
        ? { totalAmount: sortDir }
        : { receiptDate: sortDir };

  const [receipts, total] = await Promise.all([
    prisma.payoutReceipt.findMany({
      where,
      include: includeRelations,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payoutReceipt.count({ where }),
  ]);

  return NextResponse.json({
    payoutReceipts: receipts.map(mapPayoutReceiptRow),
    total,
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payout-receipts", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const result = payoutReceiptCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;

  const vendor = await prisma.vendor.findFirst({
    where: { id: data.vendorId, businessId: ctx.businessId, status: "ACTIVE" },
  });
  if (!vendor) {
    return NextResponse.json({ error: "Invalid vendor" }, { status: 400 });
  }

  try {
    await validateAccounts(
      ctx.businessId,
      data.lines.map((l) => l.paymentAccountId),
    );
  } catch {
    return NextResponse.json({ error: "Invalid payment account" }, { status: 400 });
  }

  const receiptNumber =
    data.receiptNumber?.trim() || (await generatePayoutReceiptNumber(ctx.businessId));
  const totalReceived = sumPayoutLines(data.lines);
  const totalAllocated = data.allocations.reduce((s, a) => s + a.amountAllocated, 0);
  const receiptType = data.type;
  const status = data.saveAsDraft
    ? ("DRAFT" as const)
    : derivePayoutReceiptStatus(receiptType, totalReceived, totalAllocated);
  const primaryAccountId = data.lines[0]?.paymentAccountId ?? null;

  try {
    const receipt = await prisma.$transaction(async (tx) => {
      const created = await tx.payoutReceipt.create({
        data: {
          businessId: ctx.businessId,
          receiptNumber,
          type: receiptType,
          status,
          vendorId: data.vendorId,
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
        await settleExpendituresForPayout(tx, {
          businessId: ctx.businessId,
          userId: ctx.userId,
          receiptId: created.id,
          receiptDate: data.receiptDate,
          allocations: data.allocations,
          paymentAccountId: primaryAccountId,
        });
        await tx.payoutReceipt.update({
          where: { id: created.id },
          data: { status: "SETTLED" },
        });
      }

      return tx.payoutReceipt.findUniqueOrThrow({
        where: { id: created.id },
        include: includeRelations,
      });
    });

    return NextResponse.json({ payoutReceipt: mapPayoutReceiptRow(receipt) }, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.startsWith("INVALID_EXPENDITURE")) {
        return NextResponse.json(
          { error: "One or more expenditures are invalid" },
          { status: 400 },
        );
      }
      if (err.message.startsWith("EXPENDITURE_ALREADY_PAID")) {
        return NextResponse.json(
          { error: "One or more expenditures are already paid" },
          { status: 409 },
        );
      }
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/payout-receipts]", err);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
