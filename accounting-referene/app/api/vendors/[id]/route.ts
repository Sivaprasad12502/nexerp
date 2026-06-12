import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { vendorCreateSchema } from "@/lib/validations/vendor";

type RouteCtx = { params: Promise<{ id: string }> };

const patchSchema = vendorCreateSchema
  .partial()
  .extend({ status: z.enum(["ACTIVE", "ARCHIVED"]).optional() });

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const { id } = await params;
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await prisma.vendor.findFirst({
    where: { id, businessId: ctx.businessId },
  });

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // Fetch related quotations via the business relationship, for the transaction history section
  let quotations: Array<{
    id: string;
    quotationNumber: string;
    quotationDate: Date;
    totalAmount: number;
    currency: string;
    status: string;
    approvedAt: Date | null;
  }> = [];

  if (vendor.linkedBusinessId) {
    const relationship = await prisma.businessRelationship.findUnique({
      where: {
        buyerBusinessId_sellerBusinessId: {
          buyerBusinessId:  ctx.businessId,
          sellerBusinessId: vendor.linkedBusinessId,
        },
      },
      select: {
        quotations: {
          select: {
            id:              true,
            quotationNumber: true,
            quotationDate:   true,
            totalAmount:     true,
            currency:        true,
            status:          true,
            approvedAt:      true,
          },
          orderBy: { approvedAt: "desc" },
          take: 20,
        },
      },
    });
    quotations = relationship?.quotations ?? [];
  }

  return NextResponse.json({ vendor, quotations });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const { id } = await params;
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.vendor.findFirst({ where: { id, businessId: ctx.businessId } });
  if (!existing) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;
  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      ...(data.name      !== undefined && { name:      data.name }),
      ...(data.email     !== undefined && { email:     data.email     || null }),
      ...(data.phone     !== undefined && { phone:     data.phone     || null }),
      ...(data.website   !== undefined && { website:   data.website   || null }),
      ...(data.address   !== undefined && { address:   data.address   || null }),
      ...(data.gstNumber !== undefined && { gstNumber: data.gstNumber || null }),
      ...(data.status    !== undefined && { status:    data.status }),
    },
  });

  return NextResponse.json({ vendor });
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const { id } = await params;
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.vendor.findFirst({ where: { id, businessId: ctx.businessId } });
  if (!existing) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const vendor = await prisma.vendor.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json({ vendor });
}
