"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BuyerBusiness = {
  id:        string;
  name:      string;
  brandName: string | null;
  phone:     string | null;
  website:   string | null;
  gstNumber: string | null;
  country:   string;
};

type ConnectedCustomer = {
  id:               string;
  buyerBusinessId:  string;
  sellerBusinessId: string;
  status:           string;
  createdAt:        string;
  buyerBusiness:    BuyerBusiness;
  _count:           { quotations: number };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConnectedCustomersPage() {
  const { data, isLoading } = useQuery<{ customers: ConnectedCustomer[] }>({
    queryKey: ["connected-customers"],
    queryFn: () => fetch("/api/connected-customers").then((r) => r.json()),
  });

  const customers = data?.customers ?? [];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-10">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-6 pb-4 pt-4 sm:px-8">
        <nav className="mb-1 text-sm text-zinc-400">
          Sales &amp; Invoices <ChevronRight className="mx-0.5 inline size-3.5" /> Connected Customers
        </nav>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-zinc-900">
          Connected Customers
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Businesses that have approved a quotation from you, creating an active relationship.
        </p>
      </div>

      {/* Content */}
      <div className="px-6 py-5 sm:px-8">
        {/* Loading */}
        {isLoading && (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            Loading…
          </div>
        )}

        {/* Empty */}
        {!isLoading && customers.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white py-20 text-center">
            <Users className="mb-3 size-10 text-zinc-300" />
            <p className="font-medium text-zinc-700">No connected customers yet</p>
            <p className="mt-1 text-sm text-zinc-400">
              When a buyer approves one of your quotations, they will appear here.
            </p>
          </div>
        )}

        {/* Table */}
        {!isLoading && customers.length > 0 && (
          <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Business Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      GST No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Country
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Approved Quotations
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                      Connected Since
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {customers.map((c) => {
                    const biz = c.buyerBusiness;
                    const displayName = biz.brandName ?? biz.name;
                    return (
                      <tr key={c.id} className="hover:bg-zinc-50/80">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-bold text-emerald-700">
                              {displayName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-zinc-900">{displayName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {biz.gstNumber ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {biz.phone ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">{biz.country}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            {c._count.quotations}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              c.status === "ACTIVE"
                                ? "bg-green-50 text-green-700"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {c.status === "ACTIVE" ? "Active" : c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                          {fmt(c.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500">
              Showing <strong className="text-zinc-700">{customers.length}</strong>{" "}
              {customers.length === 1 ? "customer" : "customers"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
