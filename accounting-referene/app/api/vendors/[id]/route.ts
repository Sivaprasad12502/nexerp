import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { vendorCreateSchema } from "@/lib/validations/vendor";

type RouteCtx = { params: Promise<{ id: string }> };

const patchSchema = vendorCreateSchema
  .partial()
  .extend({ status: z.enum(["ACTIVE", "ARCHIVED"]).optional() });

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

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const { id } = await params;
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await prisma.vendor.findFirst({
    where: { id, businessId: ctx.businessId },
    include: linkedContactsInclude,
  });

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // Fetch related quotations via the business relationship, for the transaction history section
  let quotations: Array<{
    id: string;
    quotationNumber: string;
    quotationDate: Date;
    totalAmount: number;
    currency: string;
    status: string;
    approvedAt: Date | null;
  }> = [];

  if (vendor.linkedBusinessId) {
    const relationship = await prisma.businessRelationship.findUnique({
      where: {
        buyerBusinessId_sellerBusinessId: {
          buyerBusinessId:  ctx.businessId,
          sellerBusinessId: vendor.linkedBusinessId,
        },
      },
      select: {
        quotations: {
          select: {
            id:              true,
            quotationNumber: true,
            quotationDate:   true,
            totalAmount:     true,
            currency:        true,
            status:          true,
            approvedAt:      true,
          },
          orderBy: { approvedAt: "desc" },
          take: 20,
        },
      },
    });
    quotations = relationship?.quotations ?? [];
  }

  return NextResponse.json({ vendor, quotations });
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const { id } = await params;
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.vendor.findFirst({ where: { id, businessId: ctx.businessId } });
  if (!existing) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const linkedContactIds: string[] | undefined = Array.isArray(body?.linkedContactIds)
    ? (body.linkedContactIds as string[])
    : undefined;

  const data = result.data;
  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      ...(data.name            !== undefined && { name:            data.name }),
      ...(data.logo            !== undefined && { logo:            data.logo            || null }),
      ...(data.industry        !== undefined && { industry:        data.industry        || null }),
      ...(data.country         !== undefined && { country:         data.country         || null }),
      ...(data.city            !== undefined && { city:            data.city            || null }),
      ...(data.vendorType      !== undefined && { vendorType:      data.vendorType }),
      ...(data.email           !== undefined && { email:           data.email           || null }),
      ...(data.phoneCode       !== undefined && { phoneCode:       data.phoneCode       || null }),
      ...(data.phone           !== undefined && { phone:           data.phone           || null }),
      ...(data.showEmailInDocs !== undefined && { showEmailInDocs: data.showEmailInDocs }),
      ...(data.showPhoneInDocs !== undefined && { showPhoneInDocs: data.showPhoneInDocs }),
      ...(data.website         !== undefined && { website:         data.website         || null }),
      ...(data.gstNumber       !== undefined && { gstNumber:       data.gstNumber       || null }),
      ...(data.trn             !== undefined && { trn:             data.trn             || null }),
      ...(data.vatNumber       !== undefined && { vatNumber:       data.vatNumber       || null }),
      ...(data.taxTreatment    !== undefined && { taxTreatment:    data.taxTreatment    || null }),
      ...(data.addressCountry  !== undefined && { addressCountry:  data.addressCountry  || null }),
      ...(data.state           !== undefined && { state:           data.state           || null }),
      ...(data.district        !== undefined && { district:        data.district        || null }),
      ...(data.addressCity     !== undefined && { addressCity:     data.addressCity     || null }),
      ...(data.buildingNumber  !== undefined && { buildingNumber:  data.buildingNumber  || null }),
      ...(data.postalCode      !== undefined && { postalCode:      data.postalCode      || null }),
      ...(data.streetAddress   !== undefined && { streetAddress:   data.streetAddress   || null }),
      ...(data.address         !== undefined && { address:         data.address         || null }),
      ...(data.businessAlias   !== undefined && { businessAlias:   data.businessAlias   || null }),
      ...(data.defaultDueDays  !== undefined && { defaultDueDays:  data.defaultDueDays  ?? null }),
      ...(data.paymentAccount  !== undefined && { paymentAccount:  data.paymentAccount  || null }),
      ...(data.status          !== undefined && { status:          data.status }),
      ...(linkedContactIds !== undefined && {
        linkedContacts: {
          deleteMany: {},
          create: linkedContactIds.map((contactId) => ({ contactId })),
        },
      }),
    },
    include: linkedContactsInclude,
  });

  return NextResponse.json({ vendor });
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const { id } = await params;
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.vendor.findFirst({ where: { id, businessId: ctx.businessId } });
  if (!existing) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const vendor = await prisma.vendor.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json({ vendor });
}
