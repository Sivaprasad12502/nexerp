// Single source of truth for the RBAC module/action matrix.
// Used by both the permission-editor UI and server-side enforcement.

export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
};

export type ModuleDef = {
  key: string;
  label: string;
  group: string;
};

// Modules mirror the "Manage Users" / "Manage Team Roles" spec.
export const PERMISSION_MODULES: ModuleDef[] = [
  { key: "business-profile", label: "Business Profile", group: "Business" },
  { key: "business-user-management", label: "Business User Management", group: "Business" },
  { key: "leads", label: "Leads Management", group: "CRM" },
  { key: "clients", label: "Client Management", group: "CRM" },
  { key: "vendor-leads", label: "Vendor Lead Management", group: "CRM" },
  { key: "inventory", label: "Inventory Management", group: "Inventory" },
  { key: "invoices", label: "Invoices", group: "Sales" },
  { key: "proforma-invoices", label: "Proforma Invoices", group: "Sales" },
  { key: "delivery-challans", label: "Delivery Challans", group: "Sales" },
  { key: "quotations", label: "Quotations", group: "Sales" },
  { key: "sales-orders", label: "Sales Orders", group: "Sales" },
  { key: "credit-notes", label: "Credit Notes", group: "Sales" },
  { key: "debit-notes", label: "Debit Notes", group: "Purchases" },
  { key: "purchase-orders", label: "Purchase Orders", group: "Purchases" },
  { key: "purchases-expenses", label: "Purchases & Expenses", group: "Purchases" },
  { key: "payment-receipts", label: "Payment Receipts", group: "Payments" },
  { key: "payment-records", label: "Payment Records", group: "Payments" },
  { key: "payout-records", label: "Payout Records", group: "Payments" },
  { key: "reports", label: "Reports & Analytics", group: "Insights" },
  { key: "advanced-accounting", label: "Advanced Accounting", group: "Insights" },
  { key: "audit-trail", label: "Audit Trail", group: "Insights" },
  { key: "approval-workflows", label: "Approval Workflows", group: "Insights" },
  { key: "ai-features", label: "AI Features", group: "Add-ons" },
  { key: "invoice-app-access", label: "Invoice App Access", group: "Add-ons" },
  { key: "premium-features", label: "Refrens Premium Features", group: "Add-ons" },
];

const MODULE_KEYS = new Set(PERMISSION_MODULES.map((m) => m.key));

export type ModulePermission = Record<PermissionAction, boolean>;
export type PermissionSet = Record<string, ModulePermission>;

function makeModulePermission(value: boolean): ModulePermission {
  return PERMISSION_ACTIONS.reduce((acc, action) => {
    acc[action] = value;
    return acc;
  }, {} as ModulePermission);
}

/** A permission set with every action denied. */
export function emptyPermissions(): PermissionSet {
  return PERMISSION_MODULES.reduce((acc, mod) => {
    acc[mod.key] = makeModulePermission(false);
    return acc;
  }, {} as PermissionSet);
}

/** A permission set with every action allowed (Super Admin / owner). */
export function fullPermissions(): PermissionSet {
  return PERMISSION_MODULES.reduce((acc, mod) => {
    acc[mod.key] = makeModulePermission(true);
    return acc;
  }, {} as PermissionSet);
}

/**
 * Coerce arbitrary stored JSON into a complete, well-formed PermissionSet,
 * dropping unknown modules/actions and filling in missing ones as `false`.
 */
export function normalizePermissions(input: unknown): PermissionSet {
  const base = emptyPermissions();
  if (!input || typeof input !== "object") return base;

  for (const [moduleKey, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!MODULE_KEYS.has(moduleKey) || !raw || typeof raw !== "object") continue;
    for (const action of PERMISSION_ACTIONS) {
      base[moduleKey][action] = Boolean((raw as Record<string, unknown>)[action]);
    }
  }
  return base;
}

/** Whether the given (already-normalized) set allows an action on a module. */
export function can(
  permissions: PermissionSet,
  moduleKey: string,
  action: PermissionAction
): boolean {
  return Boolean(permissions[moduleKey]?.[action]);
}

/** Count of modules that have at least one action enabled. */
export function countEnabledModules(permissions: PermissionSet): number {
  return PERMISSION_MODULES.reduce((count, mod) => {
    const mp = permissions[mod.key];
    return mp && PERMISSION_ACTIONS.some((a) => mp[a]) ? count + 1 : count;
  }, 0);
}

/** Human-readable summary like "All permissions" / "8 of 25 modules". */
export function summarizePermissions(permissions: PermissionSet): string {
  const enabled = countEnabledModules(permissions);
  const total = PERMISSION_MODULES.length;
  if (enabled === 0) return "No access";
  if (enabled === total) return "All permissions";
  return `${enabled} of ${total} modules`;
}
