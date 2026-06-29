import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { businessSchema, businessProfilePatchSchema } from "@/lib/validations/business";
import { ensureOwnerSetup, getRbacContext } from "@/lib/rbac";

// GET /api/business — fetch the current user's business profile
export async function GET() {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: {
      id: true,
      name: true,
      brandName: true,
      country: true,
      city: true,
      address: true,
      gstNumber: true,
      hasGst: true,
      panNumber: true,
      phone: true,
      website: true,
      currency: true,
    },
  });

  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ business });
}

// PATCH /api/business — update business profile fields (from the Business details modal)
export async function PATCH(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = businessProfilePatchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;

  const business = await prisma.business.update({
    where: { id: ctx.businessId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.country !== undefined ? { country: data.country } : {}),
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
      ...(data.gstNumber !== undefined ? { gstNumber: data.gstNumber } : {}),
      ...(data.hasGst !== undefined ? { hasGst: data.hasGst } : {}),
      ...(data.panNumber !== undefined ? { panNumber: data.panNumber } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.website !== undefined ? { website: data.website } : {}),
    },
    select: {
      id: true,
      name: true,
      brandName: true,
      country: true,
      city: true,
      address: true,
      gstNumber: true,
      hasGst: true,
      panNumber: true,
      phone: true,
      website: true,
      currency: true,
    },
  });

  return NextResponse.json({ business });
}

// POST /api/business — initial business setup (kept for onboarding flow)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = businessSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      name, brandName, teamSize, website, phone,
      country, currency, hasGst, gstNumber,
      usedFor, category,
    } = result.data;

    const business = await prisma.business.upsert({
      where: { userId: session.user.id },
      update: {
        name, brandName, teamSize, website: website || null,
        phone, country, currency, hasGst,
        gstNumber: hasGst ? gstNumber : null,
        usedFor: usedFor ?? [], category,
      },
      create: {
        userId: session.user.id,
        name, brandName, teamSize, website: website || null,
        phone, country, currency, hasGst,
        gstNumber: hasGst ? gstNumber : null,
        usedFor: usedFor ?? [], category,
      },
    });

    await ensureOwnerSetup(session.user.id);

    return NextResponse.json({ success: true, businessId: business.id }, { status: 201 });
  } catch (err) {
    console.error("[business]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
