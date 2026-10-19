import { NextRequest, NextResponse } from "next/server";
import { phpAuthTokenLookupDetailed } from "@/lib/auth-php";
import { getSession } from "@/lib/auth-session";
import { resolvePortalLoginUrl } from "@/lib/portal-login";
import { publicRequestUrl } from "@/lib/public-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectNoStore(url: URL | string): NextResponse {
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: NextRequest) {
  const loginUrl = publicRequestUrl("/user-login", req);

  try {
    const session = await getSession();
    if (!session) {
      return redirectNoStore(loginUrl);
    }

    const lookedUp = await phpAuthTokenLookupDetailed(session.auth_token);
    if (!lookedUp || lookedUp.user.user_id !== session.user_id) {
      return redirectNoStore(loginUrl);
    }

    if (!lookedUp.portalUrl) {
      console.error(
        "[/api/auth/study-portal] auth-token-lookup returned no portal login url",
      );
    }

    return redirectNoStore(resolvePortalLoginUrl(lookedUp.portalUrl));
  } catch (err) {
    console.error("[/api/auth/study-portal]", err);
    return redirectNoStore(loginUrl);
  }
}
