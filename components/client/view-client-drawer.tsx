"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Building2,
  Copy,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ClientRow } from "@/app/(protected)/sales-and-invoices/clients-prospects/components/client-form";

type Tab = "overview" | "contacts";

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="w-44 shrink-0 text-sm text-zinc-400">{label}</span>
      <span className="text-right text-sm text-zinc-900">{value}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </p>
  );
}

export function ViewClientDrawer({
  open,
  client,
  onClose,
  onEdit,
}: {
  open: boolean;
  client: ClientRow | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const qc = useQueryClient();

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

  useEffect(() => {
    if (open) setTab("overview");
  }, [open, client?.businessName]);

  const archive = useMutation({
    mutationFn: () =>
      fetch(`/api/clients/${client!.id}`, { method: "DELETE" }).then((r) =>
        r.json(),
      ),
    onSuccess: () => {
      toast.success("Client archived");
      qc.invalidateQueries({ queryKey: ["clients"] });
      onClose();
    },
    onError: () => toast.error("Failed to archive client"),
  });

  if (!client) return null;

  const initials = client.businessName.slice(0, 2).toUpperCase();
  const phone = client.phone
    ? `${client.phoneCode ?? ""} ${client.phone}`.trim()
    : null;

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
        aria-label="View Client"
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-950">View Client</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Edit"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              disabled={archive.isPending}
              onClick={() => {
                if (confirm("Archive this client?")) archive.mutate();
              }}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              aria-label="Archive"
            >
              {archive.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Archive className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* ── Identity ───────────────────────────────────── */}
        <div className="border-b border-zinc-100 px-6 py-5">
          <div className="flex items-center gap-4">
            {client.logo ? (
              <img
                src={client.logo}
                alt={client.businessName}
                className="size-14 rounded-xl object-cover ring-2 ring-zinc-100"
              />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-xl bg-zinc-800 text-xl font-semibold text-white">
                {initials}
              </span>
            )}
            <div>
              <p className="text-xl font-semibold text-zinc-950">
                {client.businessName}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                  {client.clientType === "INDIVIDUAL" ? "Individual" : "Company"}
                </span>
                {client.industry && (
                  <span className="text-sm text-zinc-500">{client.industry}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            {client.email && (
              <button
                type="button"
                onClick={() => copyToClipboard(client.email!)}
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"
              >
                <Mail className="size-4 text-zinc-400" />
                {client.email}
                <Copy className="size-3.5 text-zinc-400" />
              </button>
            )}
            {phone && (
              <button
                type="button"
                onClick={() => copyToClipboard(phone)}
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"
              >
                <Phone className="size-4 text-zinc-400" />
                {phone}
                <Copy className="size-3.5 text-zinc-400" />
              </button>
            )}
            {(client.city || client.country) && (
              <span className="flex items-center gap-1.5 text-sm text-zinc-500">
                <MapPin className="size-4 text-zinc-400" />
                {[client.city, client.country].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────── */}
        <div className="flex border-b border-zinc-200 px-6">
          {(
            [
              { key: "overview", label: "Overview" },
              {
                key: "contacts",
                label: `Contacts (${client.linkedContacts.length})`,
              },
            ] as { key: Tab; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`h-11 px-0 text-sm font-medium transition-colors first:mr-6 ${
                tab === key
                  ? "border-b-2 border-[#7438dc] text-[#7438dc]"
                  : "text-zinc-500 hover:text-zinc-950"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {tab === "overview" && (
            <div>
              {/* Basic */}
              <SectionLabel>Basic Information</SectionLabel>
              <div className="divide-y divide-zinc-100">
                <FieldRow label="Business Name" value={client.businessName} />
                <FieldRow label="Industry" value={client.industry} />
                <FieldRow label="Country" value={client.country} />
                <FieldRow label="City / Town" value={client.city} />
                <FieldRow
                  label="Client Type"
                  value={
                    client.clientType === "INDIVIDUAL" ? "Individual" : "Company"
                  }
                />
                <FieldRow label="Business Alias" value={client.businessAlias} />
                <FieldRow label="Unique Key" value={client.uniqueKey} />
              </div>

              {/* Tax */}
              {(client.trn || client.vatNumber || client.taxTreatment) && (
                <>
                  <SectionLabel>Tax Information</SectionLabel>
                  <div className="divide-y divide-zinc-100">
                    <FieldRow label="TRN" value={client.trn} />
                    <FieldRow label="VAT Number (TRN)" value={client.vatNumber} />
                    <FieldRow label="Tax Treatment" value={client.taxTreatment} />
                  </div>
                </>
              )}

              {/* Billing address */}
              {(client.addressCountry ||
                client.state ||
                client.streetAddress) && (
                <>
                  <SectionLabel>Billing Address</SectionLabel>
                  <div className="divide-y divide-zinc-100">
                    <FieldRow label="Country" value={client.addressCountry} />
                    <FieldRow label="State / Province" value={client.state} />
                    <FieldRow label="District" value={client.district} />
                    <FieldRow label="City / Town" value={client.addressCity} />
                    <FieldRow
                      label="Building Number"
                      value={client.buildingNumber}
                    />
                    <FieldRow label="Postal Code" value={client.postalCode} />
                    <FieldRow label="Street Address" value={client.streetAddress} />
                  </div>
                </>
              )}

              {/* Shipping */}
              {(client.shippingCountry || client.shippingStreet) && (
                <>
                  <SectionLabel>Shipping Details</SectionLabel>
                  <div className="divide-y divide-zinc-100">
                    <FieldRow label="Name" value={client.shippingName} />
                    <FieldRow label="Country" value={client.shippingCountry} />
                    <FieldRow label="State" value={client.shippingState} />
                    <FieldRow label="City / Town" value={client.shippingCity} />
                    <FieldRow
                      label="Postal Code"
                      value={client.shippingPostalCode}
                    />
                    <FieldRow
                      label="Street Address"
                      value={client.shippingStreet}
                    />
                  </div>
                </>
              )}

              {/* Additional */}
              {(client.email ||
                phone ||
                client.defaultDueDays != null ||
                client.paymentAccount) && (
                <>
                  <SectionLabel>Additional Details</SectionLabel>
                  <div className="divide-y divide-zinc-100">
                    <FieldRow label="Email" value={client.email} />
                    <FieldRow label="Phone" value={phone} />
                    <FieldRow
                      label="Default Due Date"
                      value={
                        client.defaultDueDays != null
                          ? `${client.defaultDueDays} days`
                          : null
                      }
                    />
                    <FieldRow
                      label="Payment Account"
                      value={client.paymentAccount}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "contacts" && (
            <div className="py-4">
              {client.linkedContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                  <Building2 className="mb-3 size-10 opacity-30" />
                  <p className="text-sm">No contacts linked yet.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {client.linkedContacts.map(({ contact }) => {
                    const fullName = [contact.firstName, contact.lastName]
                      .filter(Boolean)
                      .join(" ");
                    const ini = `${contact.firstName[0]}${contact.lastName?.[0] ?? ""}`.toUpperCase();
                    return (
                      <li
                        key={contact.id}
                        className="flex items-center gap-3 rounded-xl border border-zinc-100 px-4 py-3"
                      >
                        {contact.image ? (
                          <img
                            src={contact.image}
                            alt={fullName}
                            className="size-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-white">
                            {ini}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {fullName}
                          </p>
                          {contact.email && (
                            <p className="truncate text-xs text-zinc-500">
                              {contact.email}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-t border-zinc-100 px-6 py-4">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[#7438dc] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#6330c2]"
          >
            <Pencil className="size-4" />
            Edit Client
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
