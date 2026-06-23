import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext, ctxCan } from "@/lib/rbac";
import { convertVendorLeadToVendor } from "@/lib/vendor-lead-convert";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "vendor-leads", "approve")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const lead = await prisma.vendorLead.findFirst({
    where: { id, businessId: ctx.businessId },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const result = await prisma.$transaction(async (tx) =>
      convertVendorLeadToVendor(tx, lead, ctx.businessId),
    );

    return NextResponse.json({
      vendor: result.vendor,
      created: result.created,
      vendorLeadId: lead.id,
    });
  } catch (err) {
    console.error("[POST /api/vendor-leads/[id]/convert]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
