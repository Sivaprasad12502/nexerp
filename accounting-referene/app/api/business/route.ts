import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { businessSchema } from "@/lib/validations/business";
import { ensureOwnerSetup } from "@/lib/rbac";

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

    // Bootstrap the owner's "Super Admin" role + owner membership (idempotent).
    await ensureOwnerSetup(session.user.id);

    return NextResponse.json({ success: true, businessId: business.id }, { status: 201 });
  } catch (err) {
    console.error("[business]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
