import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { sanitizeCallbackUrl } from "@/lib/public-auth-flow";

function redirectTo(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url));
}

function redirectWithCallback(req: NextRequest, fallback: string) {
  const callbackUrl = sanitizeCallbackUrl(req.nextUrl.searchParams.get("callbackUrl"));
  return redirectTo(req, callbackUrl ?? fallback);
}

function redirectToBusinessNew(req: NextRequest) {
  const callbackUrl = sanitizeCallbackUrl(req.nextUrl.searchParams.get("callbackUrl"));
  if (!callbackUrl || callbackUrl === "/business-new") return redirectTo(req, "/business-new");
  const url = new URL("/business-new", req.url);
  url.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isReceivedPaymentReceipt = pathname.startsWith(
    "/sales-and-invoices/payement-receipts/received/",
  );
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/contact");
  const isBusinessNew = pathname === "/business-new";
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  // Unauthenticated client opening a shared payment receipt link
  if (isReceivedPaymentReceipt && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Unauthenticated user hitting protected areas
  if ((isProtected || isBusinessNew) && !token) {
    if (isBusinessNew) {
      const documentCallback = sanitizeCallbackUrl(
        req.nextUrl.searchParams.get("callbackUrl"),
      );
      const loginUrl = new URL("/login", req.url);
      if (documentCallback) loginUrl.searchParams.set("callbackUrl", documentCallback);
      return NextResponse.redirect(loginUrl);
    }
    return redirectTo(req, "/login");
  }

  if (token) {
    // Authenticated user with a business on auth or onboarding pages
    if ((isAuthPage || isBusinessNew) && token.hasBusiness) {
      return redirectWithCallback(req, "/dashboard");
    }

    // Authenticated user without a business on auth pages → finish onboarding first
    if (isAuthPage && !token.hasBusiness) {
      return redirectToBusinessNew(req);
    }

    // Authenticated user without a business hitting protected dashboard routes
    if (isProtected && !token.hasBusiness) {
      return redirectToBusinessNew(req);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
