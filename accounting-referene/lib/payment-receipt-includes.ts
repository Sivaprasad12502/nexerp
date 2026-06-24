/** Shared Prisma include for payment receipt allocation relations. */
export const paymentReceiptAllocationInclude = {
  include: {
    document: {
      select: {
        id: true,
        documentNumber: true,
        documentDate: true,
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

export const paymentReceiptIncludeRelations = {
  business: { select: { name: true, brandName: true, country: true } },
  client: { select: { id: true, businessName: true, email: true, country: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      paymentAccount: {
        select: { id: true, displayName: true, bankName: true, accountNumber: true },
      },
    },
  },
  allocations: paymentReceiptAllocationInclude,
} as const;
