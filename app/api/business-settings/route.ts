import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { businessSettingsPatchSchema } from "@/lib/validations/business-settings";

// GET /api/business-settings — upsert-or-return defaults so client always gets a row
export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.businessSettings.upsert({
    where: { businessId: ctx.businessId },
    create: { businessId: ctx.businessId },
    update: {},
  });

  return NextResponse.json({ settings });
}

// PATCH /api/business-settings — update shared branding / finance data
export async function PATCH(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const result = businessSettingsPatchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  // Strip undefined values so we only update provided fields
  const data = Object.fromEntries(
    Object.entries(result.data).filter(([, v]) => v !== undefined),
  ) as Record<string, string>;

  const settings = await prisma.businessSettings.upsert({
    where: { businessId: ctx.businessId },
    create: { businessId: ctx.businessId, ...data },
    update: data,
  });

  return NextResponse.json({ settings });
}
