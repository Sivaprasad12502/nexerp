import { NextRequest, NextResponse } from "next/server";

import { getRbacContext } from "@/lib/rbac";
import { convertDocument, ConversionError } from "@/lib/document-conversion";
import { documentConvertSchema } from "@/lib/validations/document";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const result = documentConvertSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const { targetType } = result.data;

  try {
    const document = await convertDocument({
      businessId: ctx.businessId,
      userId:     ctx.userId,
      sourceType: "QUOTATION",
      sourceId:   id,
      targetType,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof ConversionError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND:    404,
        NOT_APPROVED: 409,
        DUPLICATE:    409,
        NO_BUSINESS:  403,
      };
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] ?? 400 },
      );
    }
    console.error("[quotations:convert:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
