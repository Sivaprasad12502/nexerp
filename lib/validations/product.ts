import { z } from "zod";

const optionalStr = (max = 80) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalFloat = z.number().optional().nullable();
const optionalInt = z.number().int().optional().nullable();

export const productCreateSchema = z.object({
  itemType: z.enum(["PRODUCT", "SERVICE"]).default("PRODUCT"),
  name: z.string().trim().min(1, "Item name is required").max(200),
  sku: optionalStr(80),
  category: optionalStr(80),
  unit: optionalStr(40),
  hsnSac: optionalStr(40),
  canBeSold: z.boolean().default(true),
  manageStock: z.boolean().default(true),
  image: z.string().url().optional().or(z.literal("")),
  originalImage: z.string().url().optional().or(z.literal("")),
  description: optionalStr(2000),
  tags: z.array(z.string().trim().max(80)).default([]),

  // Accounting
  purchaseLedger: optionalStr(120),
  salesLedger: optionalStr(120),
  inventoryLedger: optionalStr(120),

  // Pricing & Taxation
  currency: optionalStr(40),
  buyingPrice: optionalFloat,
  sellingPrice: optionalFloat,
  landedCost: optionalFloat,
  taxRate: optionalFloat,
  priceInclusiveTax: z.boolean().default(false),

  // Dimensions
  length: optionalFloat,
  breadth: optionalFloat,
  height: optionalFloat,
  grossWeight: optionalFloat,
  netWeight: optionalFloat,

  // Stock management
  trackingMethod: z.enum(["NONE", "BATCHWISE", "SERIAL", "BATCH_SERIAL"]).default("NONE"),
  reorderPoint: optionalInt,
  overstockPoint: optionalInt,

  // Opening stock (only on create)
  initialStock: z.number().min(0).optional().nullable(),
  initialWarehouseId: z.string().optional().nullable(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
