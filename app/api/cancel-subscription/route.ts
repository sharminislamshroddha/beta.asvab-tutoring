// app/api/cancel-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

type CancelBody = {
  subscription_id?: string;
  cancel_reason?: string;
  user_id?: string | number;
};

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function safeStr(v: unknown, max = 500) {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/**
 * Shared-secret auth between PHP server and Next.js server
 *
 * PHP/cURL sends:  X-Internal-Key: <secret>
 * Next.js expects: INTERNAL_API_SECRET=<secret>
 */
function verifyInternalSecret(req: NextRequest) {
  const provided = safeStr(req.headers.get("x-internal-key") || "", 200);
  const expected = safeStr(process.env.INTERNAL_API_SECRET || "", 200);
  return !!expected && !!provided && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function squareConfig() {
  const accessToken = safeStr(process.env.SQUARE_ACCESS_TOKEN || "", 500);
  const version = safeStr(process.env.SQUARE_VERSION || "", 50);
  const env = safeStr(process.env.SQUARE_ENVIRONMENT || "sandbox", 20).toLowerCase();

  const base =
    env === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

  return { accessToken, version, base };
}

async function squareFetch(path: string, init?: RequestInit) {
  const { accessToken, version, base } = squareConfig();

  if (!accessToken || !version) {
    return {
      ok: false,
      status: 500,
      data: null,
      configError: true,
    };
  }

  const url = base + path;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": version,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  const data = safeJsonParse(text);

  return { ok: res.ok, status: res.status, data };
}

function friendlySquareFailureMessage(status: number) {
  // Keep this simple and user-friendly, without leaking gateway details.
  if (status === 401 || status === 403) {
    return "We couldn't verify the payment service credentials. Please contact support.";
  }
  if (status === 404) {
    return "We couldn't find that subscription. Please contact support.";
  }
  if (status === 409) {
    return "This subscription is already being updated. Please try again in a moment.";
  }
  if (status >= 500) {
    return "The subscription service is temporarily unavailable. Please try again shortly.";
  }
  return "We couldn't process your cancellation request right now. Please try again.";
}

export async function POST(req: NextRequest) {
  const reqId =
    (globalThis.crypto?.randomUUID?.() ??
      `req_${Date.now()}_${Math.random().toString(16).slice(2)}`);

  try {
    // Auth: internal only
    const expected = safeStr(process.env.INTERNAL_API_SECRET || "", 200);
    if (!expected) {
      return json(500, {
        ok: false,
        message:
          "The cancellation service is not configured properly. Please contact support.",
        request_id: reqId,
      });
    }

    if (!verifyInternalSecret(req)) {
      return json(401, {
        ok: false,
        message: "Unauthorized request.",
        request_id: reqId,
      });
    }

    let body: CancelBody = {};
    try {
      body = (await req.json()) as CancelBody;
    } catch {
      body = {};
    }

    const subscription_id = safeStr(body?.subscription_id, 120);
    const cancel_reason = safeStr(body?.cancel_reason, 500);
    const user_id = safeStr(body?.user_id ?? "", 50);

    if (!subscription_id) {
      return json(400, {
        ok: false,
        message: "Subscription ID is missing. Please try again.",
        request_id: reqId,
      });
    }

    if (!cancel_reason) {
      return json(400, {
        ok: false,
        message: "Please provide a reason for cancellation.",
        request_id: reqId,
      });
    }

    // 1) Cancel subscription
    const cancelPath = `/v2/subscriptions/${encodeURIComponent(subscription_id)}/cancel`;
    const cancelRes = await squareFetch(cancelPath, {
      method: "POST",
      body: JSON.stringify({}),
    });

    if ((cancelRes as any).configError) {
      return json(500, {
        ok: false,
        message:
          "The subscription service is not configured properly. Please contact support.",
        request_id: reqId,
      });
    }

    if (!cancelRes.ok) {
      return json(cancelRes.status, {
        ok: false,
        message: friendlySquareFailureMessage(cancelRes.status),
        subscription_id,
        user_id,
        request_id: reqId,
      });
    }

    // 2) Fetch subscription to determine effective date
    const getPath = `/v2/subscriptions/${encodeURIComponent(subscription_id)}`;
    const getRes = await squareFetch(getPath, { method: "GET" });

    if (!getRes.ok) {
      return json(getRes.status, {
        ok: false,
        message: friendlySquareFailureMessage(getRes.status),
        subscription_id,
        user_id,
        request_id: reqId,
      });
    }

    const sub = (getRes.data as any)?.subscription || {};
    const chargedThrough = safeStr(sub.charged_through_date || "", 20); // YYYY-MM-DD
    const nextBilling = safeStr(sub.next_billing_date || "", 20); // fallback
    const squareStatus = safeStr(sub.status || "", 40);

    const cancel_effective_date = chargedThrough || nextBilling || "";
    const status = cancel_effective_date ? "CANCEL_PENDING" : (squareStatus || "CANCEL_PENDING");

    return json(200, {
      ok: true,
      message:
        "Your cancellation request has been received. Your subscription will remain active until the effective cancellation date.",
      subscription_id,
      user_id,
      status,
      square_status: squareStatus,
      cancel_effective_date,
      cancel_reason,
      request_id: reqId,
      timestamp: nowIso(),
    });
  } catch {
    return json(500, {
      ok: false,
      message:
        "We couldn't process your cancellation request right now. Please try again later.",
      request_id: reqId,
      timestamp: nowIso(),
    });
  }
}