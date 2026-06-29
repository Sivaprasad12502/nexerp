"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  ChevronRight,
  Loader2,
  Pencil,
  UserCheck,
} from "lucide-react";

import {
  useConvertVendorLead,
  useVendorLead,
} from "@/lib/hooks/use-vendor-leads";

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "Pending";
  const isApproved = s === "Approved" || s === "Onboarding";
  const isRejected = s === "Rejected";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
        isApproved
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : isRejected
            ? "bg-red-50 text-red-700 ring-red-200"
            : "bg-orange-50 text-orange-700 ring-orange-200"
      }`}
    >
      {s}
    </span>
  );
}

export default function VendorLeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, isError } = useVendorLead(params.id);
  const convertMutation = useConvertVendorLead();

  const lead = data?.vendorLead;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#7438dc]" />
      </div>
    );
  }

  if (isError || !lead) {
    return (
      <div className="p-8 text-center text-zinc-500">
        Vendor lead not found.
      </div>
    );
  }

  const handleConvert = () => {
    if (!confirm(`Convert "${lead.name}" to an active vendor?`)) return;
    convertMutation.mutate(lead.id, {
      onSuccess: () => router.push("/purchases/vendors"),
    });
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 pb-12">
      <div className="border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
        <nav className="mb-1 text-sm text-zinc-400">
          Vendor Lead Dashboard{" "}
          <ChevronRight className="mx-0.5 inline size-3.5" />
          {lead.name}
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{lead.name}</h1>
            <StatusBadge status={lead.currentStatus} />
            {lead.status === "CONVERTED" && (
              <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                Converted
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {lead.status !== "CONVERTED" && (
              <>
                <button
                  type="button"
                  onClick={() => router.push(`/purchases/vendor-leads/${lead.id}/edit`)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <Pencil className="size-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={convertMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#7438dc] px-3 py-2 text-sm font-semibold text-white hover:bg-[#6230c4] disabled:opacity-60"
                >
                  <UserCheck className="size-4" />
                  Convert to Vendor
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2">
        <DetailCard title="Contact">
          <Row label="Email" value={lead.email} />
          <Row label="Phone" value={lead.phone ? `${lead.phoneCode ?? ""} ${lead.phone}` : null} />
          <Row label="Vendor Type" value={lead.vendorType} />
          <Row label="Subject" value={lead.subject} />
        </DetailCard>
        <DetailCard title="Address">
          <Row label="Country" value={lead.country} />
          <Row label="State" value={lead.state} />
          <Row label="City" value={lead.city} />
          <Row label="Pincode" value={lead.postalCode} />
          <Row label="Street" value={lead.streetAddress} />
        </DetailCard>
        <DetailCard title="Tax">
          <Row label="GSTIN" value={lead.gstNumber} />
          <Row label="GST State Code" value={lead.gstStateCode} />
          <Row label="PAN" value={lead.panNumber} />
          <Row label="Name as per PAN" value={lead.nameAsPerPan} />
        </DetailCard>
        <DetailCard title="Workflow">
          <Row label="Workflow" value={lead.workflowName} />
          <Row label="Assignee" value={lead.currentAssigneeName} />
          <Row label="Stage" value={lead.currentStage} />
          <Row label="Status" value={lead.currentStatus} />
        </DetailCard>
        {lead.paymentAccount && (
          <DetailCard title="Bank Account" className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <Building2 className="size-8 text-zinc-400" />
              <div>
                <p className="font-medium text-zinc-900">{lead.paymentAccount.displayName}</p>
                <p className="text-sm text-zinc-500">{lead.paymentAccount.bankName}</p>
              </div>
            </div>
          </DetailCard>
        )}
        {lead.notes && (
          <DetailCard title="Notes" className="lg:col-span-2">
            <p className="text-sm text-zinc-700">{lead.notes}</p>
          </DetailCard>
        )}
      </div>
    </div>
  );
}

function DetailCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-zinc-200 bg-white p-5 shadow-sm ${className ?? ""}`}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium text-zinc-900">{value || "—"}</span>
    </div>
  );
}
