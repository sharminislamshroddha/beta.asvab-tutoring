import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/auth/logout]", err);
    return NextResponse.json(
      { success: false, message: "Could not log out." },
      { status: 500 },
    );
  }
}
