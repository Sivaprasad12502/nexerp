import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import {
  derivePaymentAccountDisplayName,
  paymentAccountCreateSchema,
} from "@/lib/validations/payment-account";
import type { PaymentAccountType, PaymentAccountStatus } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") as PaymentAccountType | null;
  const status = searchParams.get("status") as PaymentAccountStatus | null;
  const bankOnly = searchParams.get("bankOnly") === "true";

  const where: {
    businessId: string;
    type?: PaymentAccountType;
    status?: PaymentAccountStatus;
    OR?: Array<{ upiId: null } | { accountNumber: { not: null } }>;
  } = { businessId: ctx.businessId };

  if (type) where.type = type;
  if (status) where.status = status;

  // Bank tab: exclude pure UPI-only accounts (upiId set, no account number)
  if (bankOnly) {
    where.type = "BANK";
    where.OR = [{ upiId: null }, { accountNumber: { not: null } }];
  }

  const accounts = await prisma.paymentAccount.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      linkedBankAccount: {
        select: { id: true, displayName: true, bankName: true },
      },
    },
  });

  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = paymentAccountCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;
  const displayName = derivePaymentAccountDisplayName(data);

  const account = await prisma.paymentAccount.create({
    data: {
      businessId: ctx.businessId,
      type: data.type,
      status: data.status ?? "ACTIVE",
      displayName,
      accountHolderName: data.accountHolderName ?? null,
      bankName: data.bankName ?? null,
      accountNumber: data.accountNumber ?? null,
      ifsc: data.ifsc ?? null,
      branch: data.branch ?? null,
      accountType: data.accountType ?? null,
      upiId: data.upiId ?? null,
      country: data.country ?? null,
      currency: data.currency ?? null,
      swift: data.swift ?? null,
      department: data.department ?? null,
      ledgerName: data.ledgerName ?? null,
      customFields: data.customFields ?? undefined,
      linkedBankAccountId: data.linkedBankAccountId ?? null,
    },
    include: {
      linkedBankAccount: {
        select: { id: true, displayName: true, bankName: true },
      },
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}
