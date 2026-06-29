import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { mapVendorLeadRow } from "@/lib/vendor-lead-mapper";
import { vendorLeadCreateSchema } from "@/lib/validations/vendor-lead";

function ns(v?: string | null) {
  if (v === undefined || v === null) return undefined;
  const t = v.trim();
  return t === "" ? null : t;
}

const includePayment = {
  paymentAccount: {
    select: {
      id: true,
      displayName: true,
      bankName: true,
      accountNumber: true,
    },
  },
} as const;

async function resolveAssignee(assigneeId: string | null | undefined) {
  if (!assigneeId) return null;
  const user = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true, name: true, email: true },
  });
  return user;
}

async function validatePaymentAccount(businessId: string, paymentAccountId?: string | null) {
  if (!paymentAccountId) return null;
  const acct = await prisma.paymentAccount.findFirst({
    where: { id: paymentAccountId, businessId },
  });
  if (!acct) throw new Error("INVALID_PAYMENT_ACCOUNT");
  return paymentAccountId;
}

function leadDataFromInput(
  data: ReturnType<typeof vendorLeadCreateSchema.parse>,
): Omit<Prisma.VendorLeadCreateInput, "business"> {
  return {
    name: data.name,
    email: ns(data.email),
    phoneCode: ns(data.phoneCode) ?? "+91",
    phone: ns(data.phone),
    vendorType: data.vendorType,
    subject: ns(data.subject),
    notes: ns(data.notes),
    country: ns(data.country),
    state: ns(data.state),
    city: ns(data.city),
    postalCode: ns(data.postalCode),
    streetAddress: ns(data.streetAddress),
    gstNumber: data.gstNumber ? data.gstNumber.toUpperCase() : null,
    gstStateCode: ns(data.gstStateCode),
    panNumber: data.panNumber ? data.panNumber.toUpperCase() : null,
    nameAsPerPan: ns(data.nameAsPerPan),
    customFields: data.customFields ?? undefined,
    currentStatus: "Pending",
  };
}

export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "vendor-leads", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "ACTIVE";
  const country = searchParams.get("country") ?? "";
  const currentStage = searchParams.get("currentStage") ?? "";
  const currentStatus = searchParams.get("currentStatus") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const where: Prisma.VendorLeadWhereInput = {
    businessId: ctx.businessId,
    status:
      status === "ALL"
        ? undefined
        : (status as "ACTIVE" | "CONVERTED" | "REJECTED" | "ARCHIVED"),
    ...(country ? { country: { contains: country, mode: "insensitive" } } : {}),
    ...(currentStage ? { currentStage } : {}),
    ...(currentStatus ? { currentStatus } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.VendorLeadOrderByWithRelationInput =
    sortBy === "name"
      ? { name: sortDir }
      : sortBy === "country"
        ? { country: sortDir }
        : { createdAt: sortDir };

  const [leads, total] = await Promise.all([
    prisma.vendorLead.findMany({
      where,
      include: includePayment,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vendorLead.count({ where }),
  ]);

  const assigneeIds = [
    ...new Set(leads.map((l) => l.currentAssigneeId).filter(Boolean)),
  ] as string[];
  const assignees =
    assigneeIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const assigneeMap = new Map(assignees.map((u) => [u.id, u]));

  const vendorLeads = leads.map((lead) =>
    mapVendorLeadRow(
      lead,
      lead.currentAssigneeId
        ? assigneeMap.get(lead.currentAssigneeId) ?? null
        : null,
    ),
  );

  return NextResponse.json({ vendorLeads, total, page, limit });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "vendor-leads", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const result = vendorLeadCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const paymentAccountId = await validatePaymentAccount(
      ctx.businessId,
      result.data.paymentAccountId,
    );

    const lead = await prisma.vendorLead.create({
      data: {
        business: { connect: { id: ctx.businessId } },
        ...leadDataFromInput(result.data),
        ...(paymentAccountId
          ? { paymentAccount: { connect: { id: paymentAccountId } } }
          : {}),
      },
      include: includePayment,
    });

    return NextResponse.json(
      { vendorLead: mapVendorLeadRow(lead, null) },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_PAYMENT_ACCOUNT") {
      return NextResponse.json({ error: "Invalid payment account" }, { status: 400 });
    }
    console.error("[POST /api/vendor-leads]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
