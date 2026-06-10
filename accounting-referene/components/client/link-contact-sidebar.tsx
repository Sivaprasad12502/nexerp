"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Search, X } from "lucide-react";

type Contact = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  image: string | null;
};

export function LinkContactSidebar({
  open,
  linkedIds,
  onLink,
  onUnlink,
  onClose,
}: {
  open: boolean;
  linkedIds: string[];
  onLink: (contact: Contact) => void;
  onUnlink: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ contacts: Contact[] }>({
    queryKey: ["contacts", "ACTIVE"],
    queryFn: () => fetch("/api/contacts?status=ACTIVE").then((r) => r.json()),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const contacts = (data?.contacts ?? []).filter((c) => {
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      (c.lastName ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/30"
          onClick={onClose}
          aria-hidden
        />
      )}

      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Link Contact"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">Link Contact</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Select contacts to link to this client
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-zinc-100 px-6 py-3">
          <div className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 px-3">
            <Search className="size-4 shrink-0 text-zinc-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts…"
              className="flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-6 animate-spin text-[#7438dc]" />
            </div>
          )}

          {!isLoading && contacts.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">
              {search ? "No contacts match your search." : "No contacts found."}
            </p>
          )}

          <ul className="space-y-2">
            {contacts.map((c) => {
              const linked = linkedIds.includes(c.id);
              const initials = `${c.firstName[0]}${c.lastName?.[0] ?? ""}`.toUpperCase();
              const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ");

              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 px-4 py-3"
                >
                  {c.image ? (
                    <img
                      src={c.image}
                      alt={fullName}
                      className="size-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-white">
                      {initials}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{fullName}</p>
                    {c.email && (
                      <p className="truncate text-xs text-zinc-500">{c.email}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => (linked ? onUnlink(c.id) : onLink(c))}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      linked
                        ? "bg-[#7438dc]/10 text-[#7438dc] hover:bg-red-50 hover:text-red-600"
                        : "bg-[#7438dc] text-white hover:bg-[#6330c2]"
                    }`}
                  >
                    {linked ? (
                      <span className="flex items-center gap-1">
                        <Check className="size-3" /> Linked
                      </span>
                    ) : (
                      "Link"
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md bg-[#7438dc] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#6330c2]"
          >
            Done ({linkedIds.length} linked)
          </button>
        </div>
      </div>
    </>
  );
}
