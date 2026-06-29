"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertCircle, Clock, Download, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

import { QuotationPreview } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import type { BusinessSettingsRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-preview";
import type { QuotationRow } from "@/app/(protected)/sales-and-invoices/quotation-estimates/components/quotation-form";
import { DEFAULT_QUOTATION_SETTINGS } from "@/lib/quotation-defaults";
import type { QuotationSettings } from "@/lib/validations/quotation";
import { redirectToAuth } from "@/lib/public-auth-flow";

type ApiResponse = {
  document: QuotationRow;
  businessSettings: BusinessSettingsRow | null;
  clientEmail: string | null;
};

export default function ReceivedCreditNotePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (sessionStatus === "unauthenticated") {
      redirectToAuth(router, {
        callbackPath: `/sales-and-invoices/credit-notes/received/${token}`,
      });
      return;
    }

    fetch(`/api/credit-notes/received/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (r.status === 401) {
          redirectToAuth(router, {
            callbackPath: `/sales-and-invoices/credit-notes/received/${token}`,
            email: body.clientEmail,
          });
          throw new Error("Authentication required");
        }
        if (!r.ok) throw new Error(body.error ?? "Failed to load credit note");
        return body as ApiResponse;
      })
      .then(setData)
      .catch((e: Error) => {
        if (e.message !== "Authentication required") setFetchError(e.message);
      })
      .finally(() => setLoading(false));
  }, [token, sessionStatus, router]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Credit Note", url });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  if (loading || sessionStatus === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500">
          <Clock className="size-5 animate-pulse" />
          <span>Loading credit note…</span>
        </div>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <div className="max-w-sm rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 size-10 text-red-400" />
          <h1 className="text-lg font-semibold text-zinc-900">Credit Note Unavailable</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {fetchError ?? "This link is invalid or has expired."}
          </p>
        </div>
      </div>
    );
  }

  const { document: doc, businessSettings } = data;
  const settings: QuotationSettings = {
    ...DEFAULT_QUOTATION_SETTINGS,
    ...(doc.settings as Partial<QuotationSettings>),
  };
  const bs: BusinessSettingsRow = businessSettings ?? {};

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Credit Note</h1>
            <p className="text-sm text-zinc-500">
              #{doc.quotationNumber} · {doc.clientName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <Printer className="size-4" />
              Print
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <Share2 className="size-4" />
              Share
            </button>
            <button
              type="button"
              onClick={() => toast.info("Download coming soon")}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <Download className="size-4" />
              Download
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <QuotationPreview
            quotation={doc}
            settings={settings}
            businessSettings={bs}
            documentLabel="Credit Note"
          />
        </div>
      </div>
    </div>
  );
}
