import { NextRequest, NextResponse } from "next/server";
import { postPhpApi } from "@/lib/php-api";

/**
 * Same-origin BFF for browser → PHP calls.
 * Avoids CORS / intermittent nginx 415 responses that never reach PHP CORS headers.
 *
 * Whitelist only interactive / dependent actions that cannot be prefetched as RSC props.
 */
const ALLOWED_ACTIONS = new Set([
  "get-package-session-list",
  "check-email",
  "user-registration",
  "tutor-request",
  "contact-us",
]);

export async function POST(request: NextRequest) {
  let body: Record<string, string> = {};

  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const json = (await request.json()) as Record<string, unknown>;
      for (const [key, value] of Object.entries(json)) {
        if (value == null) continue;
        body[key] = String(value);
      }
    } else if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded")
    ) {
      const form = await request.formData();
      form.forEach((value, key) => {
        if (typeof value === "string") {
          body[key] = value;
        }
      });
    } else {
      // Fallback: try formData first, then URL-encoded text
      try {
        const form = await request.formData();
        form.forEach((value, key) => {
          if (typeof value === "string") {
            body[key] = value;
          }
        });
      } catch {
        const text = await request.text();
        body = Object.fromEntries(new URLSearchParams(text));
      }
    }
  } catch {
    return NextResponse.json(
      { isSuccess: false, status: 400, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const action = body.action?.trim();
  if (!action) {
    return NextResponse.json(
      { isSuccess: false, status: 400, message: "Missing action." },
      { status: 400 },
    );
  }

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { isSuccess: false, status: 403, message: "Action not allowed." },
      { status: 403 },
    );
  }

  const { action: _action, ...params } = body;
  // Browser mutations hit intermittent nginx/Imunify 415s before PHP; retry longer.
  const result = await postPhpApi<unknown>(action, params, {
    cache: "no-store",
    maxAttempts: 6,
    retryBaseDelayMs: 300,
  });

  if (result == null) {
    return NextResponse.json(
      {
        isSuccess: false,
        status: 502,
        message:
          "Temporary connection issue with our server. Please try submitting again.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json(result);
}
