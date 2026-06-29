import type { VendorLead } from "@/app/generated/prisma/client";

type Assignee = { id: string; name: string; email: string } | null;

type PaymentAccountSummary = {
  id: string;
  displayName: string;
  bankName: string | null;
  accountNumber: string | null;
};

export function mapVendorLeadRow(
  lead: VendorLead & { paymentAccount?: PaymentAccountSummary | null },
  assignee?: Assignee,
) {
  return {
    id: lead.id,
    businessId: lead.businessId,
    name: lead.name,
    email: lead.email,
    phoneCode: lead.phoneCode,
    phone: lead.phone,
    vendorType: lead.vendorType,
    subject: lead.subject,
    notes: lead.notes,
    country: lead.country,
    state: lead.state,
    city: lead.city,
    postalCode: lead.postalCode,
    streetAddress: lead.streetAddress,
    gstNumber: lead.gstNumber,
    gstStateCode: lead.gstStateCode,
    panNumber: lead.panNumber,
    nameAsPerPan: lead.nameAsPerPan,
    workflowName: lead.workflowName,
    currentAssigneeId: lead.currentAssigneeId,
    currentAssigneeName: assignee?.name ?? null,
    currentAssigneeEmail: assignee?.email ?? null,
    currentStage: lead.currentStage,
    currentStatus: lead.currentStatus,
    status: lead.status,
    convertedVendorId: lead.convertedVendorId,
    convertedAt: lead.convertedAt?.toISOString() ?? null,
    paymentAccountId: lead.paymentAccountId,
    paymentAccount: lead.paymentAccount
      ? {
          id: lead.paymentAccount.id,
          displayName: lead.paymentAccount.displayName,
          bankName: lead.paymentAccount.bankName,
          accountNumber: lead.paymentAccount.accountNumber,
        }
      : null,
    customFields: lead.customFields,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export type VendorLeadRow = ReturnType<typeof mapVendorLeadRow>;
