import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  _req: NextRequest,
  { params }: Ctx
) {
  const ctx = await getRbacContext();

  if (!ctx) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: {
      id,
      businessId: ctx.businessId,
      status: "ARCHIVED",
    },
  });

  if (!client) {
    return NextResponse.json(
      { error: "Client not found" },
      { status: 404 }
    );
  }

  await prisma.client.delete({
    where: { id },
  });

  return NextResponse.json({
    message: "Client deleted permanently",
  });
}