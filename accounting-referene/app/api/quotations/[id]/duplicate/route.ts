import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const source = await prisma.quotation.findFirst({
    where: { id, businessId: ctx.businessId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Generate a new quotation number
  const count = await prisma.quotation.count({ where: { businessId: ctx.businessId } });
  const quotationNumber = `QT-${String(count + 1).padStart(4, "0")}`;

  const { id: _id, createdAt: _c, updatedAt: _u, items, ...rest } = source;

  try {
    const duplicate = await prisma.quotation.create({
      data: {
        ...rest,
        quotationNumber,
        status: "DRAFT",
        additionalCharges: rest.additionalCharges as object,
        customFields: rest.customFields as object,
        settings: rest.settings as object,
        items: {
          create: items.map(({ id: _iid, quotationId: _qid, ...item }) => item),
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: { select: { id: true, businessName: true } },
      },
    });

    return NextResponse.json({ quotation: duplicate }, { status: 201 });
  } catch (err: unknown) {
    console.error("[quotations:duplicate:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
