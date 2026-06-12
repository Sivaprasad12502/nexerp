import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { quotationRejectSchema } from "@/lib/validations/quotation";

type RouteCtx = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;

  // Must be authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const quotation = await prisma.quotation.findFirst({
    where: { approvalToken: token },
    include: {
      client: { select: { email: true } },
    },
  });

  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found or link is invalid" }, { status: 404 });
  }

  // Check approver email matches client email
  const clientEmail = quotation.client?.email?.toLowerCase().trim();
  const sessionEmail = session.user.email?.toLowerCase().trim();
  if (!clientEmail || !sessionEmail || clientEmail !== sessionEmail) {
    return NextResponse.json(
      {
        error:
          "Only the intended recipient can reject this quotation. Please sign in with the email address this quotation was sent to.",
      },
      { status: 403 },
    );
  }

  // Already decided
  if (quotation.status === "APPROVED" || quotation.status === "REJECTED") {
    return NextResponse.json(
      { error: `This quotation has already been ${quotation.status.toLowerCase()}`, status: quotation.status },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => null);
  const result = quotationRejectSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const { rejectionReason } = result.data;

  await prisma.quotation.update({
    where: { id: quotation.id },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason,
    },
  });

  await prisma.quotationActivity.create({
    data: {
      quotationId: quotation.id,
      action: "QUOTATION_REJECTED",
      userId: session.user.id,
      metadata: { rejectedByEmail: sessionEmail, rejectionReason },
    },
  });

  return NextResponse.json({ success: true, status: "REJECTED" });
}
