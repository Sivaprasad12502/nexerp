import { NextRequest, NextResponse } from "next/server";

import { getRbacContext } from "@/lib/rbac";
import {
  convertPurchaseOrderToPurchase,
  ConversionError,
} from "@/lib/document-conversion";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const result = await convertPurchaseOrderToPurchase({
      purchaseOrderId: id,
      businessId: ctx.businessId,
      userId: ctx.userId,
    });

    return NextResponse.json(
      { document: result.document, created: result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (err: unknown) {
    if (err instanceof ConversionError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        NOT_APPROVED: 409,
        DUPLICATE: 409,
        NO_BUSINESS: 403,
      };
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] ?? 400 },
      );
    }
    console.error("[documents:convert-purchase:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
