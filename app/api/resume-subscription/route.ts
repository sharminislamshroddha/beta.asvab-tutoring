// app/api/resume-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

type Payload = {
  subscription_id?: string;
  user_id?: number | string;
};

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function safeStr(v: unknown, max = 500) {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function getSquareBaseUrl() {
  const env = safeStr(process.env.SQUARE_ENVIRONMENT || "sandbox", 20).toLowerCase();
  return env === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

function requireEnv(name: string) {
  const v = safeStr(process.env[name] || "", 1000);
  return v;
}

/**
 * Shared-secret auth between PHP server and Next.js server
 *
 * PHP/cURL sends:  X-Internal-Key: <secret>
 * Next.js expects: INTERNAL_API_SECRET=<secret>
 */
function verifyInternalSecret(req: NextRequest) {
  const provided = safeStr(req.headers.get("x-internal-key") || "", 300);
  const expected = safeStr(process.env.INTERNAL_API_SECRET || "", 300);

  if (!expected || !provided) return false;

  // timingSafeEqual requires equal length buffers
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

async function squareFetch(path: string, init: RequestInit) {
  const baseUrl = getSquareBaseUrl();
  const url = `${baseUrl}${path}`;

  const squareVersion = safeStr(process.env.SQUARE_VERSION || "2026-01-22", 50);
  const token = safeStr(process.env.SQUARE_ACCESS_TOKEN || "", 1000);

  if (!token || !squareVersion) {
    return { ok: false, status: 500, data: null, configError: true as const };
  }

  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Square-Version", squareVersion);
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  const data = safeJsonParse(text);

  return { ok: res.ok, status: res.status, data, configError: false as const };
}

function friendlySquareMessage(status: number, fallback: string) {
  if (status === 401 || status === 403) {
    return "We couldn't verify the subscription service credentials. Please contact support.";
  }
  if (status === 404) {
    return "We couldn't find that subscription. Please double-check the subscription ID.";
  }
  if (status === 409) {
    return "This subscription is currently being updated. Please try again in a moment.";
  }
  if (status >= 500) {
    return "The subscription service is temporarily unavailable. Please try again shortly.";
  }
  return fallback;
}

export async function POST(req: NextRequest) {
  try {
    // ---- Env safety checks (no crash)
    const internalSecret = requireEnv("INTERNAL_API_SECRET");
    if (!internalSecret) {
      return json(500, {
        ok: false,
        message:
          "The resume service is not configured properly. Please contact support.",
      });
    }

    if (!verifyInternalSecret(req)) {
      return json(401, { ok: false, message: "Unauthorized request." });
    }

    const token = safeStr(process.env.SQUARE_ACCESS_TOKEN || "", 1000);
    if (!token) {
      return json(500, {
        ok: false,
        message:
          "The subscription service is not configured properly. Please contact support.",
      });
    }

    let payload: Payload = {};
    try {
      payload = (await req.json()) as Payload;
    } catch {
      return json(400, {
        ok: false,
        message: "Invalid request body. Please try again.",
      });
    }

    const subscriptionId = safeStr(payload.subscription_id || "", 120);
    const userId = safeStr(payload.user_id ?? "", 50);

    if (!subscriptionId) {
      return json(400, {
        ok: false,
        message: "Subscription ID is missing. Please try again.",
      });
    }

    // 1) Fetch current subscription
    const getRes = await squareFetch(
      `/v2/subscriptions/${encodeURIComponent(subscriptionId)}`,
      { method: "GET" }
    );

    if ((getRes as any).configError) {
      return json(500, {
        ok: false,
        message:
          "The subscription service is not configured properly. Please contact support.",
      });
    }

    if (!getRes.ok) {
      return json(getRes.status || 400, {
        ok: false,
        message: friendlySquareMessage(
          getRes.status || 400,
          "We couldn't retrieve the subscription right now. Please try again."
        ),
        subscription_id: subscriptionId,
        user_id: userId,
      });
    }

    const sub = (getRes.data as any)?.subscription || {};
    const status = safeStr(sub?.status || "", 40).toUpperCase();
    const canceledDate = safeStr(sub?.canceled_date || "", 20); // scheduled cancel/end date if present

    // 2) If PAUSED/DEACTIVATED, use /resume (Square requirement)
    if (status === "PAUSED" || status === "DEACTIVATED") {
      const resumeRes = await squareFetch(
        `/v2/subscriptions/${encodeURIComponent(subscriptionId)}/resume`,
        { method: "POST", body: JSON.stringify({}) }
      );

      if (!resumeRes.ok) {
        return json(resumeRes.status || 400, {
          ok: false,
          message: friendlySquareMessage(
            resumeRes.status || 400,
            "We couldn't resume your subscription right now. Please try again."
          ),
          subscription_id: subscriptionId,
          user_id: userId,
        });
      }

      // Re-fetch for updated dates/status
      const refRes = await squareFetch(
        `/v2/subscriptions/${encodeURIComponent(subscriptionId)}`,
        { method: "GET" }
      );

      const sub2 = (refRes.data as any)?.subscription || {};
      return json(200, {
        ok: true,
        message: "Your subscription has been resumed successfully.",
        subscription_id: subscriptionId,
        user_id: userId,
        status: safeStr(sub2?.status || "ACTIVE", 40).toUpperCase(),
        next_billing_date: safeStr(sub2?.next_billing_date || "", 20),
        cancel_effective_date: safeStr(sub2?.canceled_date || "", 20),
      });
    }

    // 3) Otherwise: treat as “undo cancel” by clearing canceled_date (if present)
    if (!canceledDate) {
      return json(400, {
        ok: false,
        message:
          "This subscription does not have a scheduled cancellation to remove.",
        subscription_id: subscriptionId,
        user_id: userId,
      });
    }

    const version = sub?.version;

    const updateBody: any = {
      subscription: {
        id: subscriptionId,
        canceled_date: null,
      },
    };

    if (typeof version === "number") {
      updateBody.subscription.version = version;
    }

    const putRes = await squareFetch(
      `/v2/subscriptions/${encodeURIComponent(subscriptionId)}`,
      { method: "PUT", body: JSON.stringify(updateBody) }
    );

    if (!putRes.ok) {
      return json(putRes.status || 400, {
        ok: false,
        message: friendlySquareMessage(
          putRes.status || 400,
          "We couldn't remove the scheduled cancellation right now. Please try again."
        ),
        subscription_id: subscriptionId,
        user_id: userId,
      });
    }

    const subUpdated = (putRes.data as any)?.subscription || {};

    return json(200, {
      ok: true,
      message: "The scheduled cancellation has been removed successfully.",
      subscription_id: subscriptionId,
      user_id: userId,
      status: safeStr(subUpdated?.status || "ACTIVE", 40).toUpperCase(),
      next_billing_date: safeStr(subUpdated?.next_billing_date || "", 20),
      cancel_effective_date: safeStr(subUpdated?.canceled_date || "", 20),
    });
  } catch {
    return json(500, {
      ok: false,
      message:
        "We couldn't process your request right now. Please try again later.",
    });
  }
}