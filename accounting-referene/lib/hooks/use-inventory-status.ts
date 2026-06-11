import { useQuery } from "@tanstack/react-query";

export type InventoryStatus = {
  manageInventory: boolean;
  enableMultipleWarehouses: boolean;
  warehouseCount: number;
  isLoading: boolean;
};

export function useInventoryStatus(): InventoryStatus {
  const { data, isLoading } = useQuery({
    queryKey: ["inventory-status"],
    queryFn: async () => {
      const res = await fetch("/api/inventory-settings");
      if (!res.ok) throw new Error("Failed to load inventory settings");
      return res.json() as Promise<{
        manageInventory: boolean;
        enableMultipleWarehouses: boolean;
        warehouseCount: number;
      }>;
    },
    staleTime: 30_000,
  });

  return {
    manageInventory: data?.manageInventory ?? false,
    enableMultipleWarehouses: data?.enableMultipleWarehouses ?? false,
    warehouseCount: data?.warehouseCount ?? 0,
    isLoading,
  };
}
