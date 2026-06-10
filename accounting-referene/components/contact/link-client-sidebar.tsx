"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

type Contact = {
  id: string;
  firstName: string;
  lastName?: string | null;
};

export function LinkClientSidebar({
  open,
  onClose,
  contact,
}: {
  open: boolean;
  onClose: () => void;
  contact: Contact | null;
}) {
  const [clientName, setClientName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

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

  // Reset form when a new contact opens
  useEffect(() => {
    if (open) {
      setClientName("");
      setRole("");
      setDepartment("");
      setIsPrimary(false);
    }
  }, [open, contact?.id]);

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
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Link Client"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-950">Link Client</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Client Name */}
          <div className="mb-6">
            <label className="text-sm font-medium text-zinc-950">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Select Client to Link"
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc]"
            />
          </div>

          {/* Role + Department side by side */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-950">Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-950">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-[#7438dc]"
              />
            </div>
          </div>

          {/* Mark as Primary */}
          <label className="mb-6 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="size-4 rounded border-zinc-300 accent-[#7438dc]"
            />
            <span className="text-sm text-zinc-950">Mark as Primary</span>
          </label>

          {/* Add Custom Fields */}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#7438dc]"
          >
            <Plus className="size-4" />
            Add Custom Fields
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            className="h-10 rounded-md bg-[#7438dc] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#6330c2]"
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}
