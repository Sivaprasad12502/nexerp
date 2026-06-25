import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { adaptDocumentToQuotationRow } from "@/lib/document-adapter";

type RouteCtx = { params: Promise<{ token: string }> };

/** Authenticated GET — client opens a delivery challan from an email link. */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { token } = await params;

  const document = await prisma.document.findFirst({
    where: { approvalToken: token, type: "DELIVERY_CHALLAN" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: { select: { id: true, businessName: true, email: true } },
      business: {
        select: {
          name: true,
          brandName: true,
          businessSettings: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json(
      { error: "Delivery challan not found or link is invalid." },
      { status: 404 },
    );
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
    return NextResponse.json(
      {
        error:
          "Only the intended recipient can view this delivery challan. Please sign in with the email address this delivery challan was sent to.",
      },
      { status: 403 },
    );
  }

  let workflowStatus = (settings.challanWorkflowStatus as string) ?? "CREATED";
  if (!settings.seenAt) {
    const now = new Date().toISOString();
    await prisma.document.update({
      where: { id: document.id },
      data: {
        settings: {
          ...settings,
          seenAt: now,
          challanWorkflowStatus: "SEEN",
        },
      },
    });
    settings.seenAt = now;
    settings.challanWorkflowStatus = "SEEN";
    workflowStatus = "SEEN";
  }

  return NextResponse.json({
    document: adaptDocumentToQuotationRow(
      { ...document, settings } as never,
      "Delivery Challan",
    ),
    businessSettings: document.business?.businessSettings ?? null,
    clientEmail: document.client?.email ?? settings.clientEmail ?? null,
    workflowStatus,
  });
}
