import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/contact");
  const isBusinessNew = pathname === "/business-new";
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  // Unauthenticated user hitting protected areas
  if ((isProtected || isBusinessNew) && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token) {
    // Authenticated user with a business trying to hit auth pages or /business-new
    if ((isAuthPage || isBusinessNew) && token.hasBusiness) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Authenticated user without a business trying to hit auth pages
    if (isAuthPage && !token.hasBusiness) {
      return NextResponse.redirect(new URL("/business-new", req.url));
    }

    // Authenticated user without a business hitting /dashboard
    if (isProtected && !token.hasBusiness) {
      return NextResponse.redirect(new URL("/business-new", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
