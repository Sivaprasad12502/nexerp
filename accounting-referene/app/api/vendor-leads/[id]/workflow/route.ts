import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { mapVendorLeadRow } from "@/lib/vendor-lead-mapper";
import { vendorLeadWorkflowSchema } from "@/lib/validations/vendor-lead";

type RouteCtx = { params: Promise<{ id: string }> };

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

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "vendor-leads", "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.vendorLead.findFirst({
    where: { id, businessId: ctx.businessId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "CONVERTED") {
    return NextResponse.json(
      { error: "Converted vendor leads cannot be updated" },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const result = vendorLeadWorkflowSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;

  if (data.currentAssigneeId) {
    const member = await prisma.membership.findFirst({
      where: { businessId: ctx.businessId, userId: data.currentAssigneeId },
    });
    if (!member) {
      return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    }
  }

  const lead = await prisma.vendorLead.update({
    where: { id },
    data: {
      workflowName: data.workflowName,
      currentAssigneeId: data.currentAssigneeId || null,
      currentStage: data.currentStage,
      currentStatus: data.currentStatus,
    },
    include: includePayment,
  });

  const assignee = data.currentAssigneeId
    ? await prisma.user.findUnique({
        where: { id: data.currentAssigneeId },
        select: { id: true, name: true, email: true },
      })
    : null;

  return NextResponse.json({ vendorLead: mapVendorLeadRow(lead, assignee) });
}
