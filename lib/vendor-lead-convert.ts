import type { Prisma } from "@/app/generated/prisma/client";
import type { VendorLead } from "@/app/generated/prisma/client";

type Db = Prisma.TransactionClient;

/** Map a vendor lead to Vendor.create data and mark lead converted. */
export async function convertVendorLeadToVendor(
  tx: Db,
  lead: VendorLead,
  businessId: string,
) {
  if (lead.status === "CONVERTED" && lead.convertedVendorId) {
    const existing = await tx.vendor.findUnique({
      where: { id: lead.convertedVendorId },
    });
    if (existing) return { vendor: existing, created: false };
  }

  let paymentAccountLabel: string | null = null;
  if (lead.paymentAccountId) {
    const acct = await tx.paymentAccount.findFirst({
      where: { id: lead.paymentAccountId, businessId },
      select: { displayName: true },
    });
    paymentAccountLabel = acct?.displayName ?? null;
  }

  const vendor = await tx.vendor.create({
    data: {
      businessId,
      linkedBusinessId: null,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      phoneCode: lead.phoneCode ?? "+91",
      vendorType: lead.vendorType,
      country: lead.country,
      state: lead.state,
      addressCity: lead.city,
      postalCode: lead.postalCode,
      streetAddress: lead.streetAddress,
      address: lead.notes ?? lead.streetAddress,
      gstNumber: lead.gstNumber,
      paymentAccount: paymentAccountLabel,
      status: "ACTIVE",
    },
  });

  const now = new Date();
  await tx.vendorLead.update({
    where: { id: lead.id },
    data: {
      status: "CONVERTED",
      convertedVendorId: vendor.id,
      convertedAt: now,
      currentStatus: "Approved",
    },
  });

  return { vendor, created: true };
}
