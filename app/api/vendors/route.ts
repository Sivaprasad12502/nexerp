import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { vendorCreateSchema } from "@/lib/validations/vendor";

const linkedContactsInclude = {
  linkedContacts: {
    select: {
      contact: {
        select: {
          id:        true,
          firstName: true,
          lastName:  true,
          email:     true,
          image:     true,
        },
      },
    },
  },
} as const;

export async function GET(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "ACTIVE";
  const search = searchParams.get("search") ?? "";

  const vendors = await prisma.vendor.findMany({
    where: {
      businessId: ctx.businessId,
      status: status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
      ...(search
        ? { name: { contains: search, mode: "insensitive" } }
        : {}),
    },
    include: linkedContactsInclude,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ vendors });
}

export async function POST(req: NextRequest) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const result = vendorCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const linkedContactIds: string[] = Array.isArray(body?.linkedContactIds)
    ? (body.linkedContactIds as string[])
    : [];

  const data = result.data;

  const vendor = await prisma.vendor.create({
    data: {
      businessId:       ctx.businessId,
      linkedBusinessId: null,
      name:            data.name,
      logo:            data.logo            || null,
      industry:        data.industry        || null,
      country:         data.country         || null,
      city:            data.city            || null,
      vendorType:      data.vendorType      ?? "COMPANY",
      email:           data.email           || null,
      phoneCode:       data.phoneCode       || "+971",
      phone:           data.phone           || null,
      showEmailInDocs: data.showEmailInDocs ?? false,
      showPhoneInDocs: data.showPhoneInDocs ?? false,
      website:         data.website         || null,
      gstNumber:       data.gstNumber       || null,
      trn:             data.trn             || null,
      vatNumber:       data.vatNumber       || null,
      taxTreatment:    data.taxTreatment    || null,
      addressCountry:  data.addressCountry  || null,
      state:           data.state           || null,
      district:        data.district        || null,
      addressCity:     data.addressCity     || null,
      buildingNumber:  data.buildingNumber  || null,
      postalCode:      data.postalCode      || null,
      streetAddress:   data.streetAddress   || null,
      address:         data.address         || null,
      businessAlias:   data.businessAlias   || null,
      defaultDueDays:  data.defaultDueDays  ?? null,
      paymentAccount:  data.paymentAccount  || null,
      linkedContacts: {
        create: linkedContactIds.map((contactId) => ({ contactId })),
      },
    },
    include: linkedContactsInclude,
  });

  return NextResponse.json({ vendor }, { status: 201 });
}
