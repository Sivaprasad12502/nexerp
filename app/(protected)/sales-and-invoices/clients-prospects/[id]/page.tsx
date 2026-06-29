"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Archive,
  Building2,
  ChevronRight,
  Loader2,
  Pencil,
} from "lucide-react";

import type { ClientRow } from "../components/client-form";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-sm text-zinc-800">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-100 pt-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3">{children}</div>
    </div>
  );
}

export default function ViewClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ client: ClientRow }>({
    queryKey: ["clients", id],
    queryFn: () => fetch(`/api/clients/${id}`).then((r) => r.json()),
  });

  const archive = useMutation({
    mutationFn: () =>
      fetch(`/api/clients/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Client archived");
      qc.invalidateQueries({ queryKey: ["clients"] });
      router.push("/sales-and-invoices/clients-prospects");
    },
    onError: () => toast.error("Failed to archive client"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#7438dc]" />
      </div>
    );
  }

  if (isError || !data?.client) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Client not found.
      </div>
    );
  }

  const c = data.client;
  const initials = c.businessName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50 pb-10">
      {/* Header */}
      <div className="rounded-b-md bg-white px-6 py-9 shadow-sm ring-1 ring-zinc-100 sm:px-10">
        <div className="flex items-center gap-2 text-base text-zinc-500">
          <span
            className="cursor-pointer hover:text-zinc-700"
            onClick={() => router.push("/sales-and-invoices/clients-prospects")}
          >
            Your Clients
          </span>
          <ChevronRight className="size-5" />
          <span className="text-zinc-900">{c.businessName}</span>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {c.logo ? (
              <img
                src={c.logo}
                alt={c.businessName}
                className="size-16 rounded-xl object-cover ring-2 ring-zinc-100"
              />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-xl bg-zinc-800 text-xl font-semibold text-white">
                {initials}
              </span>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">{c.businessName}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                  {c.clientType === "INDIVIDUAL" ? "Individual" : "Company"}
                </span>
                {c.industry && (
                  <span className="text-sm text-zinc-500">{c.industry}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push(`/sales-and-invoices/clients-prospects/${id}/edit`)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <Pencil className="size-4" />
              Edit
            </button>
            <button
              type="button"
              disabled={archive.isPending}
              onClick={() => {
                if (confirm("Archive this client?")) archive.mutate();
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
            >
              {archive.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Archive className="size-4" />
              )}
              Archive
            </button>
          </div>
        </div>

        {/* Tab strip */}
        <div className="mt-8 flex items-center gap-8 border-b border-zinc-200 text-sm font-medium text-zinc-500">
          <button
            type="button"
            className="h-10 border-b-2 border-[#7438dc] text-zinc-900"
          >
            Overview
          </button>
          {["Invoices", "Quotations", "Credit Notes", "Leads"].map((tab) => (
            <button key={tab} type="button" className="h-10 hover:text-zinc-700">
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <main className="mx-auto max-w-4xl space-y-8 px-6 pt-10 sm:px-10">
        {/* Basic Info */}
        <Section title="Basic Information">
          <Field label="Business Name" value={c.businessName} />
          <Field label="Industry" value={c.industry} />
          <Field label="Country" value={c.country} />
          <Field label="City / Town" value={c.city} />
          <Field label="Client Type" value={c.clientType === "INDIVIDUAL" ? "Individual" : "Company"} />
          <Field label="Business Alias" value={c.businessAlias} />
        </Section>

        {/* Tax */}
        {(c.trn || c.vatNumber || c.taxTreatment) && (
          <Section title="Tax Information">
            <Field label="TRN" value={c.trn} />
            <Field label="VAT Number (TRN)" value={c.vatNumber} />
            <Field label="Tax Treatment" value={c.taxTreatment} />
          </Section>
        )}

        {/* Address */}
        {(c.addressCountry || c.state || c.streetAddress) && (
          <Section title="Billing Address">
            <Field label="Country" value={c.addressCountry} />
            <Field label="State / Province" value={c.state} />
            <Field label="District" value={c.district} />
            <Field label="City / Town" value={c.addressCity} />
            <Field label="Building Number" value={c.buildingNumber} />
            <Field label="Postal Code" value={c.postalCode} />
            <Field label="Street Address" value={c.streetAddress} />
          </Section>
        )}

        {/* Shipping */}
        {(c.shippingCountry || c.shippingStreet) && (
          <Section title="Shipping Details">
            <Field label="Name" value={c.shippingName} />
            <Field label="Country" value={c.shippingCountry} />
            <Field label="State" value={c.shippingState} />
            <Field label="City / Town" value={c.shippingCity} />
            <Field label="Postal Code" value={c.shippingPostalCode} />
            <Field label="Street Address" value={c.shippingStreet} />
          </Section>
        )}

        {/* Additional */}
        {(c.email || c.phone || c.defaultDueDays) && (
          <Section title="Additional Details">
            <Field label="Email" value={c.email} />
            <Field
              label="Phone"
              value={c.phone ? `${c.phoneCode ?? ""} ${c.phone}`.trim() : null}
            />
            <Field
              label="Default Due Date"
              value={c.defaultDueDays != null ? `${c.defaultDueDays} days` : null}
            />
            <Field label="Payment Account" value={c.paymentAccount} />
          </Section>
        )}

        {/* Linked Contacts */}
        <div className="border-t border-zinc-100 pt-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Linked Contacts ({c.linkedContacts.length})
          </h3>
          {c.linkedContacts.length === 0 ? (
            <p className="text-sm text-zinc-500">No contacts linked.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {c.linkedContacts.map(({ contact }) => {
                const fullName = [contact.firstName, contact.lastName]
                  .filter(Boolean)
                  .join(" ");
                const initials = `${contact.firstName[0]}${contact.lastName?.[0] ?? ""}`.toUpperCase();
                return (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white p-4"
                  >
                    {contact.image ? (
                      <img
                        src={contact.image}
                        alt={fullName}
                        className="size-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-white">
                        {initials}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">{fullName}</p>
                      {contact.email && (
                        <p className="truncate text-xs text-zinc-500">{contact.email}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
