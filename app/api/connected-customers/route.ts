import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";

export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customers = await prisma.businessRelationship.findMany({
    where: {
      sellerBusinessId: ctx.businessId,
      status: "ACTIVE",
    },
    include: {
      buyerBusiness: {
        select: {
          id:        true,
          name:      true,
          brandName: true,
          phone:     true,
          website:   true,
          gstNumber: true,
          country:   true,
        },
      },
      _count: {
        select: { quotations: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ customers });
}
