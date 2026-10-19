import { NextResponse } from "next/server";
import { phpAuthTokenLookup } from "@/lib/auth-php";
import { clearSession, getSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, authenticated: false, user: null },
        { status: 401 },
      );
    }

    const user = await phpAuthTokenLookup(session.auth_token);
    if (!user || user.user_id !== session.user_id) {
      await clearSession();
      return NextResponse.json(
        { success: false, authenticated: false, user: null },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user,
      // Expose token only to same-origin clients that need it for payment
      // (checkout). Prefer reading via getSession() on the server when possible.
      auth_token: session.auth_token,
    });
  } catch (err) {
    console.error("[/api/auth/me]", err);
    return NextResponse.json(
      { success: false, authenticated: false, user: null },
      { status: 500 },
    );
  }
}
