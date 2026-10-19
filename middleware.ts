// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleReferral } from "./middleware/referralTracker";

const CANONICAL_HOST = "www.asvab-tutoring.com";
const NAKED_HOST = "asvab-tutoring.com";

function getRequestHost(request: NextRequest): string {
  // PHP proxy (index.php) forwards the original host via X-Forwarded-Host.
  const forwarded = request.headers.get("x-forwarded-host");
  const raw = forwarded ?? request.headers.get("host") ?? "";
  // Use the left-most host when proxies append multiple values.
  return raw.split(",")[0].split(":")[0].trim().toLowerCase();
}

function redirectToCanonicalHost(request: NextRequest): NextResponse {
  const destination = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    `https://${CANONICAL_HOST}`,
  );

  return NextResponse.redirect(destination, 301);
}

export function middleware(request: NextRequest) {
  if (getRequestHost(request) === NAKED_HOST) {
    return redirectToCanonicalHost(request);
  }

  const isAdminPage = request.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isAuthenticated = request.cookies.get("admin-auth")?.value === "true";

  if (isAdminPage && !isLoginPage && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next();

  // Handle Referral Logic
  response = handleReferral(request, response);

  return response;
}

export const config = {
  // Run on all routes so the naked domain always redirects, including /favicon.ico etc.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
