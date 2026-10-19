import { NextRequest, NextResponse } from "next/server";
import { phpUserLogin } from "@/lib/auth-php";
import { setSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let body: { email?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 },
      );
    }

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    const result = await phpUserLogin(email, password);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      );
    }

    await setSession({
      auth_token: result.data.auth_token,
      user_id: result.data.user_id,
    });

    return NextResponse.json({
      success: true,
      message: result.data.message,
      portalUrl: result.data.portalUrl,
      paidUser: result.data.paidUser,
      user: result.data.user,
    });
  } catch (err) {
    console.error("[/api/auth/login]", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to connect to the server.",
      },
      { status: 500 },
    );
  }
}
