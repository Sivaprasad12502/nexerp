import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { mapPayoutReceiptRow } from "@/lib/payout-receipt-mapper";
import { payoutReceiptIncludeRelations as includeRelations } from "@/lib/payout-receipt-includes";
import { payoutReceiptUpdateSchema } from "@/lib/validations/payout-receipt";

type RouteCtx = { params: Promise<{ id: string }> };

async function getReceipt(id: string, businessId: string) {
  return prisma.payoutReceipt.findFirst({
    where: { id, businessId },
    include: includeRelations,
  });
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payout-receipts", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const receipt = await getReceipt(id, ctx.businessId);
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ payoutReceipt: mapPayoutReceiptRow(receipt) });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payout-receipts", "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getReceipt(id, ctx.businessId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "SETTLED" && existing.allocations.length > 0) {
    return NextResponse.json(
      { error: "Settled receipts with expenditure allocations cannot be edited" },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const result = payoutReceiptUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;
  const mergedSettings =
    data.settings !== undefined
      ? {
          ...(typeof existing.settings === "object" && existing.settings !== null
            ? (existing.settings as object)
            : {}),
          ...data.settings,
        }
      : undefined;

  const updateData: Prisma.PayoutReceiptUpdateInput = {
    ...(data.receiptNumber !== undefined && { receiptNumber: data.receiptNumber }),
    ...(data.vendorId !== undefined && { vendorId: data.vendorId }),
    ...(data.receiptDate !== undefined && { receiptDate: new Date(data.receiptDate) }),
    ...(data.currency !== undefined && { currency: data.currency }),
    ...(data.numberFormat !== undefined && { numberFormat: data.numberFormat }),
    ...(data.decimalDigits !== undefined && { decimalDigits: data.decimalDigits }),
    ...(data.customCurrencySymbol !== undefined && {
      customCurrencySymbol: data.customCurrencySymbol,
    }),
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.signature !== undefined && { signature: data.signature }),
    ...(data.additionalInfo !== undefined && { additionalInfo: data.additionalInfo }),
    ...(data.contactDetails !== undefined && { contactDetails: data.contactDetails }),
    ...(data.attachments !== undefined && { attachments: data.attachments }),
    ...(mergedSettings !== undefined && { settings: mergedSettings as object }),
  };

  const receipt = await prisma.payoutReceipt.update({
    where: { id },
    data: updateData,
    include: includeRelations,
  });

  return NextResponse.json({ payoutReceipt: mapPayoutReceiptRow(receipt) });
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "payout-receipts", "delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getReceipt(id, ctx.businessId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "SETTLED") {
    return NextResponse.json(
      { error: "Settled payout receipts cannot be deleted" },
      { status: 409 },
    );
  }

  await prisma.payoutReceipt.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
