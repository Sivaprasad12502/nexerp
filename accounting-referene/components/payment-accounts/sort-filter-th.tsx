"use client";

import { ArrowUp, Filter } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SortDirection } from "./payment-account-utils";

const thClass =
  "whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-zinc-500 border-b border-zinc-200 bg-zinc-50/90";

export function SortFilterTh({
  label,
  sortDir,
  filterValue,
  onSort,
  onFilterChange,
}: {
  label: string;
  sortDir?: SortDirection | null;
  filterValue?: string;
  onSort: () => void;
  onFilterChange: (value: string) => void;
}) {
  return (
    <th className={thClass}>
      <span className="inline-flex items-center gap-1">
        {label}
        <button
          type="button"
          onClick={onSort}
          className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-600"
          aria-label={`Sort by ${label}`}
        >
          <ArrowUp
            className={`size-3 ${sortDir === "desc" ? "rotate-180" : ""} ${
              sortDir ? "text-zinc-600 opacity-100" : "opacity-40"
            }`}
          />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`rounded p-0.5 hover:bg-zinc-200/70 hover:text-zinc-600 ${
                filterValue ? "text-[#7438dc] opacity-100" : "text-zinc-400 opacity-40"
              }`}
              aria-label={`Filter ${label}`}
            >
              <Filter className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 p-3">
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Filter {label}
            </label>
            <input
              type="text"
              value={filterValue ?? ""}
              onChange={(e) => onFilterChange(e.target.value)}
              placeholder="Type to filter…"
              className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm text-zinc-800 outline-none focus:border-[#7438dc] focus:ring-1 focus:ring-[#7438dc]"
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </th>
  );
}

export { thClass };
