import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

const CALLBACK_STORAGE_KEY = "refrens_document_callback";
const EMAIL_STORAGE_KEY = "refrens_document_email";

/** Only allow same-origin relative paths (prevent open redirects). */
export function sanitizeCallbackUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

function appendQueryParams(
  path: string,
  params: Record<string, string | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Persist document callback across auth page navigation (e.g. header links). */
export function persistDocumentAuthContext(
  callbackPath: string | null | undefined,
  email?: string | null,
): void {
  if (typeof window === "undefined") return;
  const safe = sanitizeCallbackUrl(callbackPath);
  if (!safe || !isPublicDocumentCallback(safe)) return;
  try {
    sessionStorage.setItem(CALLBACK_STORAGE_KEY, safe);
    if (email) sessionStorage.setItem(EMAIL_STORAGE_KEY, email);
  } catch {
    // sessionStorage unavailable (private browsing, etc.)
  }
}

export function readDocumentAuthContext(): {
  callbackUrl: string | null;
  email: string | null;
} {
  if (typeof window === "undefined") {
    return { callbackUrl: null, email: null };
  }
  try {
    return {
      callbackUrl: sanitizeCallbackUrl(sessionStorage.getItem(CALLBACK_STORAGE_KEY)),
      email: sessionStorage.getItem(EMAIL_STORAGE_KEY),
    };
  } catch {
    return { callbackUrl: null, email: null };
  }
}

export function clearDocumentAuthContext(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CALLBACK_STORAGE_KEY);
    sessionStorage.removeItem(EMAIL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Resolve callback from URL param, falling back to sessionStorage. */
export function resolveAuthCallback(searchParam: string | null | undefined): string | null {
  return sanitizeCallbackUrl(searchParam) ?? readDocumentAuthContext().callbackUrl;
}

/** Resolve email from URL param, falling back to sessionStorage. */
export function resolveAuthEmail(searchParam: string | null | undefined): string | null {
  const fromUrl = searchParam?.trim();
  if (fromUrl) return fromUrl;
  return readDocumentAuthContext().email;
}

export function buildLoginUrl(callbackPath: string, email?: string | null): string {
  const safe = sanitizeCallbackUrl(callbackPath) ?? "/business-new";
  return appendQueryParams("/login", { callbackUrl: safe, email: email ?? undefined });
}

export function buildRegisterUrl(callbackPath: string, email?: string | null): string {
  const safe = sanitizeCallbackUrl(callbackPath) ?? "/business-new";
  return appendQueryParams("/register", { callbackUrl: safe, email: email ?? undefined });
}

export function buildBusinessNewUrl(callbackUrl: string | null | undefined): string {
  const safe = sanitizeCallbackUrl(callbackUrl);
  // Avoid nesting /business-new as its own callback — that loses the document target.
  if (!safe || safe === "/business-new") return "/business-new";
  return appendQueryParams("/business-new", { callbackUrl: safe });
}

/** True when callback points at a public document accept/view page. */
export function isPublicDocumentCallback(callbackUrl: string | null | undefined): boolean {
  const safe = sanitizeCallbackUrl(callbackUrl);
  if (!safe) return false;
  return (
    safe.startsWith("/quotation/approve/") ||
    safe.startsWith("/purchase-order/") ||
    safe.startsWith("/sales-order/") ||
    safe.startsWith("/invoice/") ||
    safe.startsWith("/proforma-invoice/") ||
    safe.startsWith("/sales-and-invoices/payement-receipts/received/") ||
    safe.startsWith("/sales-and-invoices/credit-notes/received/") ||
    safe.startsWith("/sales-and-invoices/delivery-challan/received/") ||
    safe.startsWith("/purchases/debit-note/received/") ||
    safe.startsWith("/purchases/payout-reciept/received/")
  );
}

/** True when the current pathname is a public document accept/view page. */
export function isPublicDocumentPath(pathname: string | null | undefined): boolean {
  return isPublicDocumentCallback(pathname);
}

export function redirectToAuth(
  router: AppRouterInstance,
  {
    callbackPath,
    email,
  }: {
    callbackPath: string;
    email?: string | null;
  },
): void {
  persistDocumentAuthContext(callbackPath, email);
  router.push(buildLoginUrl(callbackPath, email));
}
