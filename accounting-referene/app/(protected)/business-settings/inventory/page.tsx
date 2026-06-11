"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, Pencil, Trash2, MoreHorizontal, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WarehouseFormModal } from "@/components/inventory/warehouse-form-modal";

type InventorySettings = {
  manageInventory: boolean;
  enableMultipleWarehouses: boolean;
  warehouseCount: number;
};

type WarehouseRow = {
  id: string;
  name: string;
  warehouseCode?: string | null;
  location?: string | null;
  contactInfo?: string | null;
  notes?: string | null;
  isDefault: boolean;
  warehouseStatus: string;
  vatNumber?: string | null;
  _count?: { stockLevels: number };
};

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6d28d9] ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${checked ? "bg-[#6d28d9]" : "bg-zinc-300"}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function AccordionSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="font-semibold text-zinc-900">{title}</span>
        {open ? (
          <ChevronUp className="size-5 text-zinc-400" />
        ) : (
          <ChevronDown className="size-5 text-zinc-400" />
        )}
      </button>
      {open && <div className="border-t border-zinc-100 px-6 pb-6 pt-5">{children}</div>}
    </div>
  );
}

export default function InventorySettingsPage() {
  const qc = useQueryClient();

  const { data: settingsData, isLoading: settingsLoading } = useQuery<InventorySettings>({
    queryKey: ["inventory-status"],
    queryFn: async () => {
      const res = await fetch("/api/inventory-settings");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const { data: warehouseData, isLoading: warehousesLoading } = useQuery<{ warehouses: WarehouseRow[] }>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error("Failed to load warehouses");
      return res.json();
    },
  });

  const [manageInventory, setManageInventory] = useState(false);
  const [enableMultipleWarehouses, setEnableMultipleWarehouses] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseRow | null>(null);

  useEffect(() => {
    if (settingsData) {
      setManageInventory(settingsData.manageInventory);
      setEnableMultipleWarehouses(settingsData.enableMultipleWarehouses);
    }
  }, [settingsData]);

  const settingsMutation = useMutation({
    mutationFn: async (patch: Partial<InventorySettings>) => {
      const res = await fetch("/api/inventory-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to save");
      return body as InventorySettings;
    },
    onSuccess: (updated) => {
      toast.success("Settings saved");
      qc.setQueryData(["inventory-status"], updated);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      if (settingsData) {
        setManageInventory(settingsData.manageInventory);
        setEnableMultipleWarehouses(settingsData.enableMultipleWarehouses);
      }
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/warehouses/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to delete");
    },
    onSuccess: () => {
      toast.success("Warehouse deleted");
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      qc.invalidateQueries({ queryKey: ["inventory-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const warehouses = warehouseData?.warehouses ?? [];
  const multiWarehouseEnabled = settingsData?.enableMultipleWarehouses ?? false;
  const warehouseCount = settingsData?.warehouseCount ?? 0;
  const canAddMore = manageInventory && (enableMultipleWarehouses || warehouseCount === 0);

  if (settingsLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-zinc-400">Loading…</div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Manage Inventory & Behavior */}
      <AccordionSection title="Manage Inventory & Behavior">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-medium text-zinc-900">Manage Inventory</p>
              <p className="mt-0.5 text-sm text-zinc-500">
                Enable inventory tracking for your products. Once enabled, you can add warehouses
                and track stock levels.
              </p>
            </div>
            <Toggle
              checked={manageInventory}
              onChange={(val) => {
                setManageInventory(val);
                settingsMutation.mutate({ manageInventory: val });
              }}
              disabled={settingsMutation.isPending}
            />
          </div>
        </div>
      </AccordionSection>

      {/* Inventory Configuration */}
      <AccordionSection title="Inventory Configuration">
        <p className="text-sm text-zinc-400 italic">Configuration options coming soon.</p>
      </AccordionSection>

      {/* Inventory Price Configuration */}
      <AccordionSection title="Inventory Price Configuration">
        <p className="text-sm text-zinc-400 italic">Price configuration options coming soon.</p>
      </AccordionSection>

      {/* Warehouses */}
      <AccordionSection title="Warehouses" defaultOpen>
        <div className="space-y-5">
          {/* Enable Multi Warehouses toggle */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <p className="font-medium text-zinc-900">Enable Multi Warehouses</p>
              <p className="mt-0.5 text-sm text-zinc-500">
                Warehouses help you track inventory stored across multiple locations, maintain
                stock levels and fulfill orders from different facilities.
              </p>
              <button
                type="button"
                className="mt-2 flex items-center gap-1 text-sm font-medium text-[#6d28d9] hover:underline"
              >
                Learn More
                <ExternalLink className="size-3.5" />
              </button>
              {multiWarehouseEnabled && (
                <p className="mt-2 text-xs text-zinc-400">
                  Multiple warehouses are enabled and cannot be disabled.
                </p>
              )}
            </div>
            <Toggle
              checked={enableMultipleWarehouses}
              onChange={(val) => {
                if (!val) return;
                setEnableMultipleWarehouses(val);
                settingsMutation.mutate({ enableMultipleWarehouses: val });
              }}
              disabled={settingsMutation.isPending || !manageInventory || multiWarehouseEnabled}
            />
          </div>

          {/* Add warehouse button */}
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingWarehouse(null); setShowWarehouseModal(true); }}
              disabled={!canAddMore}
              title={
                !manageInventory
                  ? "Enable Manage Inventory first"
                  : !enableMultipleWarehouses && warehouseCount >= 1
                  ? "Enable Multiple Warehouses to add more"
                  : undefined
              }
              className="flex items-center gap-1.5 rounded-md border border-[#6d28d9] px-4 py-2 text-sm font-medium text-[#6d28d9] hover:bg-[#f3effc] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-4" />
              Add New Warehouse
            </button>
          </div>

          {/* Warehouses table */}
          {warehousesLoading ? (
            <p className="py-4 text-center text-sm text-zinc-400">Loading warehouses…</p>
          ) : warehouses.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-400">
              No warehouses yet.{" "}
              {canAddMore && (
                <button
                  onClick={() => { setEditingWarehouse(null); setShowWarehouseModal(true); }}
                  className="text-[#6d28d9] underline"
                >
                  Add one now.
                </button>
              )}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">
                      <span className="flex items-center gap-1">
                        Warehouse ID
                        <svg className="size-3 text-zinc-400" viewBox="0 0 12 12" fill="none">
                          <path d="M6 2v8M3 5l3-3 3 3M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Address</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Contact</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Warehouse VAT</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {warehouses.map((w) => (
                    <tr key={w.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{w.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{w.warehouseCode || "—"}</td>
                      <td className="px-4 py-3 text-zinc-600 max-w-[200px] truncate">{w.location || "—"}</td>
                      <td className="px-4 py-3 text-zinc-600">{w.contactInfo || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            w.warehouseStatus === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {w.warehouseStatus === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{w.vatNumber || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100">
                              <MoreHorizontal className="size-4" />
                              More
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => { setEditingWarehouse(w); setShowWarehouseModal(true); }}
                            >
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm(`Delete "${w.name}"?`)) {
                                  deleteWarehouseMutation.mutate(w.id);
                                }
                              }}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AccordionSection>

      <WarehouseFormModal
        open={showWarehouseModal}
        onClose={() => setShowWarehouseModal(false)}
        editingWarehouse={editingWarehouse}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["warehouses"] });
          qc.invalidateQueries({ queryKey: ["inventory-status"] });
          toast.success(editingWarehouse ? "Warehouse updated" : "Warehouse added");
        }}
      />
    </div>
  );
}
