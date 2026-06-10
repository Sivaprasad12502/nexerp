import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { clientCreateSchema } from "@/lib/validations/client";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = clientCreateSchema.partial().extend({
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

const linkedContactsInclude = {
  linkedContacts: {
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true, image: true },
      },
    },
  },
};

export async function GET(_req: NextRequest, { params }: Ctx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, businessId: ctx.businessId },
    include: linkedContactsInclude,
  });

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.client.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues }, { status: 400 });
  }

  const data = result.data;
  const linkedContactIds: string[] | undefined = Array.isArray(body?.linkedContactIds)
    ? (body.linkedContactIds as string[])
    : undefined;

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.logo !== undefined && { logo: data.logo || null }),
      ...(data.businessName !== undefined && { businessName: data.businessName }),
      ...(data.industry !== undefined && { industry: data.industry || null }),
      ...(data.country !== undefined && { country: data.country || null }),
      ...(data.city !== undefined && { city: data.city || null }),
      ...(data.clientType !== undefined && { clientType: data.clientType }),
      ...(data.trn !== undefined && { trn: data.trn || null }),
      ...(data.vatNumber !== undefined && { vatNumber: data.vatNumber || null }),
      ...(data.taxTreatment !== undefined && { taxTreatment: data.taxTreatment || null }),
      ...(data.addressCountry !== undefined && { addressCountry: data.addressCountry || null }),
      ...(data.state !== undefined && { state: data.state || null }),
      ...(data.district !== undefined && { district: data.district || null }),
      ...(data.addressCity !== undefined && { addressCity: data.addressCity || null }),
      ...(data.buildingNumber !== undefined && { buildingNumber: data.buildingNumber || null }),
      ...(data.postalCode !== undefined && { postalCode: data.postalCode || null }),
      ...(data.streetAddress !== undefined && { streetAddress: data.streetAddress || null }),
      ...(data.shippingName !== undefined && { shippingName: data.shippingName || null }),
      ...(data.shippingCountry !== undefined && { shippingCountry: data.shippingCountry || null }),
      ...(data.shippingState !== undefined && { shippingState: data.shippingState || null }),
      ...(data.shippingCity !== undefined && { shippingCity: data.shippingCity || null }),
      ...(data.shippingPostalCode !== undefined && { shippingPostalCode: data.shippingPostalCode || null }),
      ...(data.shippingStreet !== undefined && { shippingStreet: data.shippingStreet || null }),
      ...(data.businessAlias !== undefined && { businessAlias: data.businessAlias || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.showEmailInInvoice !== undefined && { showEmailInInvoice: data.showEmailInInvoice }),
      ...(data.phoneCode !== undefined && { phoneCode: data.phoneCode || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.showPhoneInInvoice !== undefined && { showPhoneInInvoice: data.showPhoneInInvoice }),
      ...(data.defaultDueDays !== undefined && { defaultDueDays: data.defaultDueDays ?? null }),
      ...(data.paymentAccount !== undefined && { paymentAccount: data.paymentAccount || null }),
      ...(linkedContactIds !== undefined && {
        linkedContacts: {
          deleteMany: {},
          create: linkedContactIds.map((contactId) => ({ contactId })),
        },
      }),
    },
    include: linkedContactsInclude,
  });

  return NextResponse.json({ client: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const ctx = await getRbacContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.client.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  await prisma.client.update({ where: { id }, data: { status: "ARCHIVED" } });

  return NextResponse.json({ message: "Client archived" });
}
