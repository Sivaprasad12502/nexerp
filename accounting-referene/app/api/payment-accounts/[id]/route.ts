import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import {
  derivePaymentAccountDisplayName,
  paymentAccountUpdateSchema,
} from "@/lib/validations/payment-account";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = paymentAccountUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = await prisma.paymentAccount.findFirst({
    where: { id, businessId: ctx.businessId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = result.data;

  const displayName = derivePaymentAccountDisplayName(
    {
      type: existing.type,
      displayName: data.displayName,
      bankName: data.bankName ?? existing.bankName,
      accountNumber: data.accountNumber ?? existing.accountNumber,
      accountHolderName: data.accountHolderName ?? existing.accountHolderName,
    },
    existing.displayName,
  );

  const account = await prisma.paymentAccount.update({
    where: { id },
    data: {
      displayName,
      status: data.status,
      accountHolderName: data.accountHolderName,
      bankName: data.bankName,
      accountNumber: data.accountNumber,
      ifsc: data.ifsc,
      branch: data.branch,
      accountType: data.accountType,
      upiId: data.upiId,
      country: data.country,
      currency: data.currency,
      swift: data.swift,
      department: data.department,
      ledgerName: data.ledgerName,
      customFields: data.customFields ?? undefined,
      linkedBankAccountId: data.linkedBankAccountId,
    },
    include: {
      linkedBankAccount: {
        select: { id: true, displayName: true, bankName: true },
      },
    },
  });

  return NextResponse.json({ account });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.paymentAccount.findFirst({
    where: { id, businessId: ctx.businessId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.paymentAccount.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
