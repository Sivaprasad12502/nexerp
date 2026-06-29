import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { clientCreateSchema } from "@/lib/validations/client";

export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = (req.nextUrl.searchParams.get("status") ?? "ACTIVE").toUpperCase();
  const resolvedStatus = status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

  const clients = await prisma.client.findMany({
    where: {
      businessId: ctx.businessId,
      status: resolvedStatus as "ACTIVE" | "ARCHIVED",
      ...(search && {
        businessName: { contains: search, mode: "insensitive" },
      }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      linkedContacts: {
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const result = clientCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = result.data;
  const linkedContactIds: string[] = Array.isArray(body?.linkedContactIds)
    ? (body.linkedContactIds as string[])
    : [];

  try {
    const client = await prisma.client.create({
      data: {
        businessId: ctx.businessId,
        logo: data.logo || null,
        businessName: data.businessName,
        industry: data.industry || null,
        country: data.country || null,
        city: data.city || null,
        clientType: data.clientType,
        trn: data.trn || null,
        vatNumber: data.vatNumber || null,
        taxTreatment: data.taxTreatment || null,
        addressCountry: data.addressCountry || null,
        state: data.state || null,
        district: data.district || null,
        addressCity: data.addressCity || null,
        buildingNumber: data.buildingNumber || null,
        postalCode: data.postalCode || null,
        streetAddress: data.streetAddress || null,
        shippingName: data.shippingName || null,
        shippingCountry: data.shippingCountry || null,
        shippingState: data.shippingState || null,
        shippingCity: data.shippingCity || null,
        shippingPostalCode: data.shippingPostalCode || null,
        shippingStreet: data.shippingStreet || null,
        businessAlias: data.businessAlias || null,
        email: data.email || null,
        showEmailInInvoice: data.showEmailInInvoice,
        phoneCode: data.phoneCode || "+971",
        phone: data.phone || null,
        showPhoneInInvoice: data.showPhoneInInvoice,
        defaultDueDays: data.defaultDueDays ?? null,
        paymentAccount: data.paymentAccount || null,
        linkedContacts: {
          create: linkedContactIds.map((contactId) => ({ contactId })),
        },
      },
      include: {
        linkedContacts: {
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true, email: true, image: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (err: unknown) {
    console.error("[clients:POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
