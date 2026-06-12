import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { vendorCreateSchema } from "@/lib/validations/vendor";

export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "ACTIVE";
  const search = searchParams.get("search") ?? "";

  const vendors = await prisma.vendor.findMany({
    where: {
      businessId: ctx.businessId,
      status: status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ vendors });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const result = vendorCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;

  const vendor = await prisma.vendor.create({
    data: {
      businessId:       ctx.businessId,
      linkedBusinessId: null,                       // manually-added vendors have no linked business
      name:      data.name,
      email:     data.email     || null,
      phone:     data.phone     || null,
      website:   data.website   || null,
      address:   data.address   || null,
      gstNumber: data.gstNumber || null,
    },
  });

  return NextResponse.json({ vendor }, { status: 201 });
}
