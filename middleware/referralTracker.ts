// middleware/referral.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function handleReferral(request: NextRequest, response: NextResponse) {
  const { searchParams } = request.nextUrl;

  const refType = searchParams.get("ref_type");
  const refCode = searchParams.get("ref_code");

  if (refType && refCode) {
    // Security Check: Ensure values aren't suspiciously long
    // and don't contain malicious characters.
    const isValidLength = refType.length < 50 && refCode.length < 50;
    const isAlphanumeric = /^[a-zA-Z0-9_-]+$/.test(refCode); // Only allows letters, numbers, underscores, and hyphens

    if (isValidLength && isAlphanumeric) {
      const cookieOptions = {
        maxAge: 60 * 60 * 24 * 1, // 1 day
        path: "/",
        sameSite: "lax" as const,
        // secure: process.env.NODE_ENV === 'production', // Need to turn on for HTTPS site
      };

      response.cookies.set("ref_type", refType, cookieOptions);
      response.cookies.set("ref_code", refCode, cookieOptions);
    }
  }

  return response;
}
