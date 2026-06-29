"use client";

import { useMemo, useState } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";

import {
  ACTION_LABELS,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type PermissionAction,
  type PermissionSet,
} from "@/lib/permissions";

// Group modules in display order while preserving the order of PERMISSION_MODULES.
function groupModules() {
  const groups: { group: string; modules: typeof PERMISSION_MODULES }[] = [];
  for (const mod of PERMISSION_MODULES) {
    let bucket = groups.find((g) => g.group === mod.group);
    if (!bucket) {
      bucket = { group: mod.group, modules: [] };
      groups.push(bucket);
    }
    bucket.modules.push(mod);
  }
  return groups;
}

export function PermissionMatrix({
  value,
  onChange,
  disabled = false,
}: {
  value: PermissionSet;
  onChange: (next: PermissionSet) => void;
  disabled?: boolean;
}) {
  const groups = useMemo(() => groupModules(), []);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const setAction = (moduleKey: string, action: PermissionAction, checked: boolean) => {
    onChange({
      ...value,
      [moduleKey]: { ...value[moduleKey], [action]: checked },
    });
  };

  const setModuleRow = (moduleKey: string, checked: boolean) => {
    const row = { ...value[moduleKey] };
    for (const a of PERMISSION_ACTIONS) row[a] = checked;
    onChange({ ...value, [moduleKey]: row });
  };

  const setColumn = (action: PermissionAction, checked: boolean) => {
    const next: PermissionSet = { ...value };
    for (const mod of PERMISSION_MODULES) {
      next[mod.key] = { ...next[mod.key], [action]: checked };
    }
    onChange(next);
  };

  const setAll = (checked: boolean) => {
    const next: PermissionSet = {};
    for (const mod of PERMISSION_MODULES) {
      next[mod.key] = PERMISSION_ACTIONS.reduce(
        (acc, a) => ({ ...acc, [a]: checked }),
        {} as Record<PermissionAction, boolean>
      );
    }
    onChange(next);
  };

  const columnAllChecked = (action: PermissionAction) =>
    PERMISSION_MODULES.every((m) => value[m.key]?.[action]);

  const rowAllChecked = (moduleKey: string) =>
    PERMISSION_ACTIONS.every((a) => value[moduleKey]?.[a]);

  const everythingChecked = PERMISSION_MODULES.every((m) => rowAllChecked(m.key));

  return (
    <div className="overflow-x-auto rounded-md bg-white">
      <table className="w-full min-w-[720px] border-collapse text-sm text-zinc-700">
        <thead className="sticky top-0 z-10 bg-white text-zinc-500">
          <tr>
            <th className="w-[42%] px-5 py-3 text-left font-semibold text-zinc-800">
              <label className="flex w-fit items-center gap-2">
                <Check
                  checked={everythingChecked}
                  disabled={disabled}
                  onChange={(c) => setAll(c)}
                />
                All permissions
              </label>
            </th>
            {PERMISSION_ACTIONS.map((action) => (
              <th key={action} className="px-3 py-3 text-left font-normal">
                <label className="flex w-fit items-center gap-2">
                  <Check
                    checked={columnAllChecked(action)}
                    disabled={disabled}
                    onChange={(c) => setColumn(action, c)}
                  />
                  <span>{ACTION_LABELS[action]}</span>
                </label>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupRows
              key={group.group}
              group={group.group}
              modules={group.modules}
              isOpen={Boolean(openGroups[group.group])}
              onToggle={() =>
                setOpenGroups((current) => ({
                  ...current,
                  [group.group]: !current[group.group],
                }))
              }
              value={value}
              disabled={disabled}
              rowAllChecked={rowAllChecked}
              setModuleRow={setModuleRow}
              setAction={setAction}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({
  group,
  modules,
  isOpen,
  onToggle,
  value,
  disabled,
  rowAllChecked,
  setModuleRow,
  setAction,
}: {
  group: string;
  modules: typeof PERMISSION_MODULES;
  isOpen: boolean;
  onToggle: () => void;
  value: PermissionSet;
  disabled: boolean;
  rowAllChecked: (k: string) => boolean;
  setModuleRow: (k: string, c: boolean) => void;
  setAction: (k: string, a: PermissionAction, c: boolean) => void;
}) {
  return (
    <>
      <tr className="border-t border-zinc-200">
        <td colSpan={1 + PERMISSION_ACTIONS.length} className="px-5 pb-3 pt-7">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            className="flex items-center gap-2 text-lg font-semibold text-zinc-800"
          >
            <ChevronDown
              className={`size-5 fill-zinc-800 stroke-[3] transition-transform ${
                isOpen ? "" : "-rotate-90"
              }`}
            />
            <span>{group}</span>
            <CircleHelp className="size-5 text-zinc-400" />
          </button>
        </td>
      </tr>
      {isOpen && modules.map((mod) => (
        <tr key={mod.key} className="hover:bg-zinc-50/70">
          <td className="px-5 py-3.5">
            <label className="ml-7 flex w-fit items-center gap-3">
              <Check
                checked={rowAllChecked(mod.key)}
                disabled={disabled}
                onChange={(c) => setModuleRow(mod.key, c)}
              />
              <span className="text-base text-zinc-800">{mod.label}</span>
            </label>
          </td>
          {PERMISSION_ACTIONS.map((action) => (
            <td key={action} className="px-3 py-3.5">
              <Check
                checked={Boolean(value[mod.key]?.[action])}
                disabled={disabled}
                onChange={(c) => setAction(mod.key, action, c)}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Check({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 size-5 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span className="pointer-events-none size-5 rounded-full bg-zinc-300 transition-colors peer-checked:bg-zinc-300 peer-focus-visible:ring-2 peer-focus-visible:ring-[#7438dc]/25 peer-disabled:opacity-50" />
      <span className="pointer-events-none absolute size-2 rounded-full bg-transparent transition-colors peer-checked:bg-zinc-600 peer-disabled:opacity-50" />
    </span>
  );
}
