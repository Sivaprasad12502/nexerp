import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { contactCreateSchema } from "@/lib/validations/contact";

export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = (req.nextUrl.searchParams.get("status") ?? "ACTIVE").toUpperCase();
  const validStatuses = ["ACTIVE", "INACTIVE", "DELETED"];
  const resolvedStatus = validStatuses.includes(status) ? status : "ACTIVE";

  const contacts = await prisma.contact.findMany({
    where: { businessId: ctx.businessId, status: resolvedStatus as "ACTIVE" | "INACTIVE" | "DELETED" },
    orderBy: { createdAt: "desc" },
    include: {
      linkedClients: {
        include: {
          client: {
            select: {
              id: true,
              businessName: true,
              email: true,
              logo: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const result = contactCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;

  try {
    const contact = await prisma.contact.create({
      data: {
        businessId: ctx.businessId,
        prefix: data.prefix || null,
        firstName: data.firstName,
        lastName: data.lastName || null,
        email: data.email || null,
        phone: data.phone || null,
        country: data.country,
        contactCode: data.contactCode || null,
        secondaryEmail: data.secondaryEmail || null,
        secondaryPhone: data.secondaryPhone || null,
        image: data.image || null,
        panNumber: data.panNumber || null,
        aadhaarNumber: data.aadhaarNumber || null,
        passportNumber: data.passportNumber || null,
        linkedinUrl: data.linkedinUrl || null,
        xUrl: data.xUrl || null,
        facebookUrl: data.facebookUrl || null,
        githubUrl: data.githubUrl || null,
        addressCountry: data.addressCountry || null,
        state: data.state || null,
        district: data.district || null,
        city: data.city || null,
        building: data.building || null,
        postalCode: data.postalCode || null,
        zipCode: data.zipCode || null,
        street: data.street || null,
      },
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (err: unknown) {
    console.error("[contacts:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
