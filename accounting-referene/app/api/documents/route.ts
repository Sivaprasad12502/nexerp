import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { documentListQuerySchema } from "@/lib/validations/document";
import type { DocumentType } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = { type: req.nextUrl.searchParams.get("type") ?? undefined };
  const result = documentListQuerySchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }
  const { type } = result.data;

  const documents = await prisma.document.findMany({
    where: {
      businessId: ctx.businessId,
      ...(type ? { type: type as DocumentType } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id:             true,
      type:           true,
      documentNumber: true,
      documentDate:   true,
      currency:       true,
      totalAmount:    true,
      status:         true,
      clientName:     true,
      client: { select: { id: true, businessName: true, logo: true } },
    },
  });

  return NextResponse.json({ documents });
}
