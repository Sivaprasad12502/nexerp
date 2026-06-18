import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { paymentAccountCreateSchema } from "@/lib/validations/payment-account";

export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.paymentAccount.findMany({
    where: { businessId: ctx.businessId },
    orderBy: { createdAt: "asc" },
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

  // Auto-derive display name if not provided
  const displayName =
    data.displayName?.trim() ||
    (data.bankName && data.accountNumber
      ? `${data.bankName} ****${data.accountNumber.slice(-4)}`
      : data.bankName || data.accountHolderName || "Bank Account");

  const account = await prisma.paymentAccount.create({
    data: {
      businessId: ctx.businessId,
      type: data.type,
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
      customFields: data.customFields ?? undefined,
      linkedBankAccountId: data.linkedBankAccountId ?? null,
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}
