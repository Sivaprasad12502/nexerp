/** Shared Prisma include for payout receipt allocation relations. */
export const payoutReceiptAllocationInclude = {
  include: {
    document: {
      select: {
        id: true,
        documentNumber: true,
        documentDate: true,
        clientName: true,
        totalAmount: true,
        currency: true,
      },
    },
    payment: {
      select: {
        id: true,
        tdsWithheld: true,
        transactionCharge: true,
      },
    },
  },
} as const;

export const payoutReceiptIncludeRelations = {
  business: {
    select: {
      name: true,
      brandName: true,
      country: true,
      businessSettings: true,
    },
  },
  vendor: { select: { id: true, name: true, email: true, country: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      paymentAccount: {
        select: { id: true, displayName: true, bankName: true, accountNumber: true },
      },
    },
  },
  allocations: payoutReceiptAllocationInclude,
} as const;
