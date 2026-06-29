import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { DOCUMENT_TYPE_PREFIX, DOCUMENT_TYPES } from "@/lib/validations/document";
import type { DocumentTypeValue } from "@/lib/validations/document";
import type { DocumentType } from "@/app/generated/prisma/client";

/**
 * GET /api/documents/next-number?type=INVOICE
 * Returns the next sequential document number for the given type in the
 * current business. Used by the "Convert to Invoice" modal to preview the
 * number before creation.
 */
export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as DocumentTypeValue | null;

  if (!type || !DOCUMENT_TYPES.includes(type as DocumentTypeValue)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${DOCUMENT_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const count = await prisma.document.count({
    where: { businessId: ctx.businessId, type: type as DocumentType },
  });

  const prefix = DOCUMENT_TYPE_PREFIX[type as DocumentTypeValue];
  const nextNumber = `${prefix}-${String(count + 1).padStart(4, "0")}`;

  return NextResponse.json({ nextNumber, type });
}
