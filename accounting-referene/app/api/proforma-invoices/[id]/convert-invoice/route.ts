import { NextRequest, NextResponse } from "next/server";

import { getRbacContext, ctxCan } from "@/lib/rbac";
import {
  convertProformaToInvoice,
  ConversionError,
} from "@/lib/document-conversion";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctxCan(ctx, "proforma-invoices", "edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await convertProformaToInvoice({
      proformaId: id,
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
    if (process.env.NODE_ENV === "development") {
      console.error("[proforma-invoices:convert-invoice:POST]", err);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
