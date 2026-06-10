import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getRbacContext } from "@/lib/rbac";
import { contactCreateSchema } from "@/lib/validations/contact";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = contactCreateSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "DELETED"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const ctx = await getRbacContext();
  if (!ctx)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!contact)
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const result = patchSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues }, { status: 400 });
  }

  const data = result.data;

  const updated = await prisma.contact.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.prefix !== undefined && { prefix: data.prefix || null }),
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.contactCode !== undefined && {
        contactCode: data.contactCode || null,
      }),
      ...(data.secondaryEmail !== undefined && {
        secondaryEmail: data.secondaryEmail || null,
      }),
      ...(data.secondaryPhone !== undefined && {
        secondaryPhone: data.secondaryPhone || null,
      }),
      ...(data.image !== undefined && { image: data.image || null }),
      ...(data.panNumber !== undefined && {
        panNumber: data.panNumber || null,
      }),
      ...(data.aadhaarNumber !== undefined && {
        aadhaarNumber: data.aadhaarNumber || null,
      }),
      ...(data.passportNumber !== undefined && {
        passportNumber: data.passportNumber || null,
      }),
      ...(data.linkedinUrl !== undefined && {
        linkedinUrl: data.linkedinUrl || null,
      }),
      ...(data.xUrl !== undefined && { xUrl: data.xUrl || null }),
      ...(data.facebookUrl !== undefined && {
        facebookUrl: data.facebookUrl || null,
      }),
      ...(data.githubUrl !== undefined && {
        githubUrl: data.githubUrl || null,
      }),
      ...(data.addressCountry !== undefined && {
        addressCountry: data.addressCountry || null,
      }),
      ...(data.state !== undefined && { state: data.state || null }),
      ...(data.district !== undefined && { district: data.district || null }),
      ...(data.city !== undefined && { city: data.city || null }),
      ...(data.building !== undefined && { building: data.building || null }),
      ...(data.postalCode !== undefined && {
        postalCode: data.postalCode || null,
      }),
      ...(data.zipCode !== undefined && { zipCode: data.zipCode || null }),
      ...(data.street !== undefined && { street: data.street || null }),
    },
  });

  return NextResponse.json({ contact: updated });
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const ctx = await getRbacContext();
  if (!ctx)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const contact = await prisma.contact.findFirst({
    where: { id, businessId: ctx.businessId },
    select: { id: true },
  });
  if (!contact)
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  await prisma.contact.update({
    where: { id}, 
    data: { status: "DELETED"},
  })
  return NextResponse.json({ message: "Contact deleted"})
}
