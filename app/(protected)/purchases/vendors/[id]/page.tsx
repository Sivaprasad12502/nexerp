"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  ChevronRight,
  Building2,
  ExternalLink,
} from "lucide-react";
import type { VendorRow } from "../components/vendor-form";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuotationSummary = {
  id:              string;
  quotationNumber: string;
  quotationDate:   string;
  totalAmount:     number;
  currency:        string;
  status:          string;
  approvedAt:      string | null;
};

type VendorDetailResponse = {
  vendor:     VendorRow;
  quotations: QuotationSummary[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[180px_1fr] gap-2 py-1.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-800">{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-6 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<VendorDetailResponse>({
    queryKey: ["vendors", id],
    queryFn: () => fetch(`/api/vendors/${id}`).then((r) => r.json()),
  });

  const archiveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/vendors/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Vendor archived");
      qc.invalidateQueries({ queryKey: ["vendors"] });
      router.push("/purchases/vendors");
    },
    onError: () => toast.error("Failed to archive vendor"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  if (isError || !data?.vendor) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-red-500">
        Vendor not found.
      </div>
    );
  }

  const { vendor, quotations } = data;
  const isAuto = !!vendor.linkedBusinessId;

  // Build structured address string for display
  const structuredAddress = [
    vendor.streetAddress,
    vendor.buildingNumber ? `Bldg ${vendor.buildingNumber}` : null,
    vendor.district,
    vendor.addressCity,
    vendor.state,
    vendor.postalCode,
    vendor.addressCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const hasTax =
    vendor.gstNumber || vendor.trn || vendor.vatNumber || vendor.taxTreatment;

  const hasAddress =
    structuredAddress || vendor.address;

  const hasAdditional =
    vendor.businessAlias || vendor.defaultDueDays != null || vendor.paymentAccount;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-12">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <nav className="mb-1 text-sm text-zinc-400">
          Purchases &amp; Expenses{" "}
          <ChevronRight className="mx-0.5 inline size-3.5" /> Vendors{" "}
          <ChevronRight className="mx-0.5 inline size-3.5" />
          <span className="text-zinc-700">{vendor.name}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-base font-bold text-violet-700">
              {vendor.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{vendor.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    vendor.status === "ACTIVE"
                      ? "bg-green-50 text-green-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {vendor.status === "ACTIVE" ? "Active" : "Archived"}
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                  {vendor.vendorType === "INDIVIDUAL" ? "Individual" : "Company"}
                </span>
                {isAuto && (
                  <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
                    Auto-linked
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/purchases/vendors/${id}/edit`)}
              className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Pencil className="size-4" />
              Edit
            </button>
            {vendor.status === "ACTIVE" && (
              <button
                type="button"
                disabled={archiveMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Archive "${vendor.name}"?`)) {
                    archiveMutation.mutate();
                  }
                }}
                className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="size-4" />
                Archive
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-3xl space-y-4 px-4 pt-8 sm:px-6">

        {/* Basic Information */}
        <Section title="Basic Information">
          <Field label="Name"     value={vendor.name} />
          <Field label="Industry" value={vendor.industry} />
          <Field label="Country"  value={vendor.country} />
          <Field label="City"     value={vendor.city} />
          {vendor.website ? (
            <div className="grid grid-cols-[180px_1fr] gap-2 py-1.5 text-sm">
              <span className="text-zinc-500">Website</span>
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#7438dc] hover:underline"
              >
                {vendor.website}
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          ) : null}
          <Field label="Added on" value={fmt(vendor.createdAt)} />
        </Section>

        {/* Contact Information */}
        <Section title="Contact Information">
          <Field
            label="Email"
            value={vendor.email}
          />
          <Field
            label="Phone"
            value={
              vendor.phone
                ? `${vendor.phoneCode ?? ""} ${vendor.phone}`.trim()
                : null
            }
          />
        </Section>

        {/* Tax Information */}
        {hasTax && (
          <Section title="Tax Information">
            <Field label="GST Number"    value={vendor.gstNumber} />
            <Field label="TRN"           value={vendor.trn} />
            <Field label="VAT Number"    value={vendor.vatNumber} />
            <Field label="Tax Treatment" value={vendor.taxTreatment} />
          </Section>
        )}

        {/* Billing Address */}
        {hasAddress && (
          <Section title="Billing Address">
            {structuredAddress ? (
              <>
                <Field label="Country"         value={vendor.addressCountry} />
                <Field label="State / Province" value={vendor.state} />
                <Field label="District"        value={vendor.district} />
                <Field label="City"            value={vendor.addressCity} />
                <Field label="Building Number" value={vendor.buildingNumber} />
                <Field label="Postal Code"     value={vendor.postalCode} />
                <Field label="Street Address"  value={vendor.streetAddress} />
              </>
            ) : (
              vendor.address && (
                <p className="whitespace-pre-wrap text-sm text-zinc-800">
                  {vendor.address}
                </p>
              )
            )}
          </Section>
        )}

        {/* Additional Details */}
        {hasAdditional && (
          <Section title="Additional Details">
            <Field label="Business Alias"    value={vendor.businessAlias} />
            <Field
              label="Default Due Days"
              value={
                vendor.defaultDueDays != null
                  ? `${vendor.defaultDueDays} days`
                  : null
              }
            />
            <Field label="Payment Account"   value={vendor.paymentAccount} />
          </Section>
        )}

        {/* Linked Contacts */}
        {vendor.linkedContacts && vendor.linkedContacts.length > 0 && (
          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-6 py-3">
              <h2 className="text-sm font-semibold text-zinc-800">
                Linked Contacts
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  {vendor.linkedContacts.length}
                </span>
              </h2>
            </div>
            <ul className="divide-y divide-zinc-50 px-6 py-2">
              {vendor.linkedContacts.map(({ contact: c }) => {
                const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ");
                const initials = `${c.firstName[0]}${c.lastName?.[0] ?? ""}`.toUpperCase();
                return (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    {c.image ? (
                      <img src={c.image} alt={fullName} className="size-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-white">
                        {initials}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{fullName}</p>
                      {c.email && <p className="text-xs text-zinc-500">{c.email}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Transaction History */}
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-6 py-3">
            <h2 className="text-sm font-semibold text-zinc-800">
              Transaction History
              {quotations.length > 0 && (
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  {quotations.length}
                </span>
              )}
            </h2>
          </div>
          {quotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <Building2 className="mb-2 size-8 text-zinc-200" />
              <p className="text-sm text-zinc-500">
                No transactions yet. Approved quotations will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                      Quotation #
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                      Date
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">
                      Amount
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                      Approved
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {quotations.map((q) => (
                    <tr
                      key={q.id}
                      className="cursor-pointer hover:bg-zinc-50/80"
                      onClick={() =>
                        router.push(
                          `/sales-and-invoices/quotation-estimates/${q.id}`,
                        )
                      }
                    >
                      <td className="px-4 py-2.5 font-medium text-zinc-900">
                        {q.quotationNumber}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-600">
                        {fmt(q.quotationDate)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-zinc-900">
                        {q.currency}{" "}
                        {q.totalAmount.toLocaleString("en-AE", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500">
                        {fmt(q.approvedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
