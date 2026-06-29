import { z } from "zod";

export const inventorySettingsPatchSchema = z.object({
  manageInventory: z.boolean().optional(),
  enableMultipleWarehouses: z.boolean().optional(),
});

export type InventorySettingsPatch = z.infer<typeof inventorySettingsPatchSchema>;
