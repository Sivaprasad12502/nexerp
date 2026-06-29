import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { mapVendorLeadRow } from "@/lib/vendor-lead-mapper";
import { vendorLeadUpdateSchema } from "@/lib/validations/vendor-lead";

type RouteCtx = { params: Promise<{ id: string }> };

function ns(v?: string | null) {
  if (v === undefined) return undefined;
  if (v === null) return null;
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

async function getLeadForBusiness(id: string, businessId: string) {
  return prisma.vendorLead.findFirst({
    where: { id, businessId },
    include: includePayment,
  });
}

async function resolveAssignee(assigneeId: string | null | undefined) {
  if (!assigneeId) return null;
  return prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true, name: true, email: true },
  });
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "vendor-leads", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const lead = await getLeadForBusiness(id, ctx.businessId);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assignee = await resolveAssignee(lead.currentAssigneeId);
  return NextResponse.json({ vendorLead: mapVendorLeadRow(lead, assignee) });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "vendor-leads", "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getLeadForBusiness(id, ctx.businessId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "CONVERTED") {
    return NextResponse.json(
      { error: "Converted vendor leads cannot be edited" },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const result = vendorLeadUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;

  if (data.paymentAccountId) {
    const acct = await prisma.paymentAccount.findFirst({
      where: { id: data.paymentAccountId, businessId: ctx.businessId },
    });
    if (!acct) {
      return NextResponse.json({ error: "Invalid payment account" }, { status: 400 });
    }
  }

  const updateData: Prisma.VendorLeadUpdateInput = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.email !== undefined && { email: ns(data.email) }),
    ...(data.phoneCode !== undefined && { phoneCode: ns(data.phoneCode) }),
    ...(data.phone !== undefined && { phone: ns(data.phone) }),
    ...(data.vendorType !== undefined && { vendorType: data.vendorType }),
    ...(data.subject !== undefined && { subject: ns(data.subject) }),
    ...(data.notes !== undefined && { notes: ns(data.notes) }),
    ...(data.country !== undefined && { country: ns(data.country) }),
    ...(data.state !== undefined && { state: ns(data.state) }),
    ...(data.city !== undefined && { city: ns(data.city) }),
    ...(data.postalCode !== undefined && { postalCode: ns(data.postalCode) }),
    ...(data.streetAddress !== undefined && { streetAddress: ns(data.streetAddress) }),
    ...(data.gstNumber !== undefined && {
      gstNumber: data.gstNumber ? data.gstNumber.toUpperCase() : null,
    }),
    ...(data.gstStateCode !== undefined && { gstStateCode: ns(data.gstStateCode) }),
    ...(data.panNumber !== undefined && {
      panNumber: data.panNumber ? data.panNumber.toUpperCase() : null,
    }),
    ...(data.nameAsPerPan !== undefined && { nameAsPerPan: ns(data.nameAsPerPan) }),
    ...(data.customFields !== undefined && { customFields: data.customFields }),
    ...(data.paymentAccountId !== undefined && {
      paymentAccount: data.paymentAccountId
        ? { connect: { id: data.paymentAccountId } }
        : { disconnect: true },
    }),
  };

  const lead = await prisma.vendorLead.update({
    where: { id },
    data: updateData,
    include: includePayment,
  });

  const assignee = await resolveAssignee(lead.currentAssigneeId);
  return NextResponse.json({ vendorLead: mapVendorLeadRow(lead, assignee) });
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "vendor-leads", "delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getLeadForBusiness(id, ctx.businessId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "CONVERTED") {
    return NextResponse.json(
      { error: "Converted vendor leads cannot be deleted" },
      { status: 409 },
    );
  }

  await prisma.vendorLead.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
