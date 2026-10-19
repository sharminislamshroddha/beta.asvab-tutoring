import { NextRequest, NextResponse } from "next/server";
import { phpAuthTokenLookup } from "@/lib/auth-php";
import {
  SESSION_COOKIE,
  encodeSession,
  sessionCookieOptions,
} from "@/lib/auth-session";
import {
  getPublicRequestOrigin,
  publicRequestUrl,
} from "@/lib/public-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_NEXT = "/pricing/1-on-1-tutoring";
const MAX_TOKEN_LENGTH = 400;

function isAllowedPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/package-details" ||
    pathname.startsWith("/package-details/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/")
  );
}

function safeNext(raw: string | null, origin: string): URL {
  const fallback = new URL(DEFAULT_NEXT, origin);
  if (!raw) return fallback;

  const value = raw.trim();
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)
  ) {
    return fallback;
  }

  try {
    const resolved = new URL(value, origin);
    if (resolved.origin !== new URL(origin).origin) return fallback;
    if (!isAllowedPath(resolved.pathname)) return fallback;
    return resolved;
  } catch {
    return fallback;
  }
}

function redirectNoStore(url: URL): NextResponse {
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: NextRequest) {
  const origin = getPublicRequestOrigin(req);
  const loginUrl = publicRequestUrl("/user-login", req);

  try {
    const auth_token = String(
      req.nextUrl.searchParams.get("auth_token") || "",
    ).trim();

    if (!auth_token || auth_token.length > MAX_TOKEN_LENGTH) {
      return redirectNoStore(loginUrl);
    }

    const user = await phpAuthTokenLookup(auth_token);
    if (!user?.user_id) {
      return redirectNoStore(loginUrl);
    }

    const dest = redirectNoStore(
      safeNext(req.nextUrl.searchParams.get("next"), origin),
    );
    dest.cookies.set(
      SESSION_COOKIE,
      encodeSession({
        auth_token,
        user_id: user.user_id,
      }),
      sessionCookieOptions(),
    );
    return dest;
  } catch (err) {
    console.error("[/api/auth/handoff]", err);
    return redirectNoStore(loginUrl);
  }
}
