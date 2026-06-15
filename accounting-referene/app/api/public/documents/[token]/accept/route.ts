import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRbacContext } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  convertPurchaseOrderToSalesOrder,
  ConversionError,
} from "@/lib/document-conversion";

type RouteCtx = { params: Promise<{ token: string }> };

/**
 * POST — vendor accepts the purchase order and creates a Sales Order.
 * Auth required; vendor must have a business (getRbacContext).
 */
export async function POST(req: NextRequest, { params }: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const ctx = await getRbacContext();
  if (!ctx) {
    return NextResponse.json(
      { error: "You must have a business account to accept a purchase order." },
      { status: 403 },
    );
  }

  const { token } = await params;

  const document = await prisma.document.findUnique({
    where: { approvalToken: token },
    select: { id: true, type: true, businessId: true },
  });

  if (!document || document.type !== "PURCHASE_ORDER") {
    return NextResponse.json(
      { error: "Purchase order not found or link is invalid." },
      { status: 404 },
    );
  }

  try {
    const result = await convertPurchaseOrderToSalesOrder({
      purchaseOrderId: document.id,
      vendorBusinessId: ctx.businessId,
      vendorUserId: ctx.userId,
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
    console.error("[public:documents:accept:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
