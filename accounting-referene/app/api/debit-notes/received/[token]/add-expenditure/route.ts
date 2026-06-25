import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getRbacContext } from "@/lib/rbac";
import {
  convertDebitNoteToBuyerExpenditure,
  ConversionError,
} from "@/lib/document-conversion";

type RouteCtx = { params: Promise<{ token: string }> };

/** Resolve authenticated debit note recipient context. */
async function loadDebitNoteContext(token: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  const document = await prisma.document.findFirst({
    where: { approvalToken: token, type: "DEBIT_NOTE" },
    include: { client: { select: { email: true } } },
  });

  if (!document) {
    return {
      error: NextResponse.json(
        { error: "Debit note not found or link is invalid." },
        { status: 404 },
      ),
    };
  }

  const settings =
    typeof document.settings === "object" && document.settings !== null
      ? (document.settings as Record<string, unknown>)
      : {};

  const clientEmail = (
    document.client?.email ??
    (typeof settings.clientEmail === "string" ? settings.clientEmail : "")
  )
    .toLowerCase()
    .trim();

  const sessionEmail = session.user.email?.toLowerCase().trim() ?? "";

  if (!clientEmail || !sessionEmail || clientEmail !== sessionEmail) {
    return {
      error: NextResponse.json(
        {
          error:
            "Only the intended recipient can perform this action. Please sign in with the email address this debit note was sent to.",
        },
        { status: 403 },
      ),
    };
  }

  return { session, document };
}

/** Client accepts debit note as expenditure in their business. */
export async function POST(_req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;
  const ctx = await loadDebitNoteContext(token);
  if ("error" in ctx && ctx.error) return ctx.error;

  const { document } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const buyerCtx = await getRbacContext();
  if (!buyerCtx) {
    return NextResponse.json(
      { error: "You need a business account to add this as an expenditure." },
      { status: 403 },
    );
  }

  try {
    const result = await convertDebitNoteToBuyerExpenditure({
      debitNoteDocumentId: document.id,
      buyerBusinessId: buyerCtx.businessId,
      buyerUserId: buyerCtx.userId,
    });

    return NextResponse.json(
      {
        document: result.document,
        created: result.created,
        vendorCreated: result.vendorCreated,
      },
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
      console.error("[debit-notes:received:add-expenditure:POST]", err);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
