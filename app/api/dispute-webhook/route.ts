// app/api/dispute-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * Square signature = base64(HMAC_SHA256(signatureKey, notificationUrl + rawBody))
 * - Must use RAW body exactly as received.
 * - Must NOT call timingSafeEqual unless lengths match.
 */
function verifySquareSignature(params: {
  signatureKey: string;
  notificationUrl: string;
  rawBody: string;
  signatureHeader: string | null;
}) {
  const signatureHeader = (params.signatureHeader ?? "").trim();
  if (!signatureHeader) return false;

  const expected = crypto
    .createHmac("sha256", params.signatureKey)
    .update(params.notificationUrl + params.rawBody, "utf8")
    .digest("base64");

  // Compare as utf8 buffers (Square sends base64 string)
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function safeStr(v: unknown, max = 300) {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function moneyToDecimal(amountMinor: any): string {
  // Square sends minor units (cents). Example: 8803 => "88.03"
  const n = Number(amountMinor);
  if (!Number.isFinite(n)) return "0.00";
  return (n / 100).toFixed(2);
}

function toMySqlDateTime(iso: any): string {
  // "2026-02-23T14:41:08.488Z" => "2026-02-23 14:41:08" (UTC)
  if (!iso || typeof iso !== "string") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (x: number) => String(x).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

function extractDispute(payload: any) {
  const eventType = safeStr(payload?.type || "", 80);
  const event_id = safeStr(payload?.event_id || "", 120);
  const merchant_id = safeStr(payload?.merchant_id || "", 120);
  const location_id = safeStr(payload?.location_id || "", 120);

  // Square dispute payloads: data.object.dispute
  const d = payload?.data?.object?.dispute || null;

  const dispute_id = safeStr(d?.id || "", 120);
  const payment_id = safeStr(d?.disputed_payment?.payment_id || "", 120);

  const amount_minor = d?.amount_money?.amount ?? null;
  const currency = safeStr(d?.amount_money?.currency || "", 10);

  const amount = moneyToDecimal(amount_minor);

  const card_brand = safeStr(d?.card_brand || "", 40);
  const reason = safeStr(d?.reason || "", 120);
  const state = safeStr(d?.state || "", 60);

  const due_at = safeStr(d?.due_at || "", 80);
  const square_created_at = safeStr(d?.created_at || payload?.created_at || "", 80);
  const square_updated_at = safeStr(d?.updated_at || "", 80);

  return {
    eventType,
    event_id,
    merchant_id,
    location_id,

    dispute_id,
    payment_id,

    amount_minor,
    amount,
    currency,

    card_brand,
    reason,
    state,

    due_at,
    square_created_at,
    square_updated_at,

    // MySQL-friendly
    due_at_mysql: toMySqlDateTime(due_at),
    square_created_at_mysql: toMySqlDateTime(square_created_at),
    square_updated_at_mysql: toMySqlDateTime(square_updated_at),
  };
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function postToPhp(params: {
  phpUrl: string;
  action: string;
  payload: Record<string, any>;
}) {
  const form = new URLSearchParams();
  form.set("action", params.action);

  for (const [k, v] of Object.entries(params.payload)) {
    if (v === undefined || v === null) continue;
    form.set(k, String(v));
  }

  const res = await fetchWithTimeout(
    params.phpUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json,text/plain,*/*",
      },
      body: form.toString(),
      cache: "no-store",
    },
    20_000
  );

  const text = await res.text();
  const data = safeJsonParse(text);

  return { ok: res.ok, status: res.status, data };
}

export async function POST(req: NextRequest) {
  // ✅ MUST match your .env
  const signatureKey = safeStr(process.env.SQUARE_DISPUTE_WEBHOOK_SIGNATURE_KEY || "", 500);
  const notificationUrl = safeStr(process.env.SQUARE_DISPUTE_WEBHOOK_URL || "", 500);
  const phpUrl = safeStr(process.env.NEXT_PUBLIC_PHP_API_URL || "", 800);

  // ---- Receive RAW body (required for signature)
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-square-hmacsha256-signature");

  // Config safety
  if (!signatureKey || !notificationUrl) {
    return json(500, {
      ok: false,
      message: "Webhook service is not configured properly.",
    });
  }

  const okSig = verifySquareSignature({
    signatureKey,
    notificationUrl,
    rawBody,
    signatureHeader,
  });

  if (!okSig) {
    return json(401, {
      ok: false,
      message: "Unauthorized webhook request.",
    });
  }

  // ---- Parse JSON
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, {
      ok: false,
      message: "Invalid webhook payload.",
    });
  }

  // ---- Only handle dispute events here
  const eventType = safeStr(payload?.type || "", 80);
  if (eventType !== "dispute.created" && eventType !== "dispute.state.updated") {
    return json(200, { ok: true });
  }

  const d = extractDispute(payload);

  // Safety checks: if Square changes structure, avoid bad inserts
  if (!d.dispute_id || !d.payment_id) {
    // Return 200 so Square doesn't retry forever; admin can review server logs if needed.
    return json(200, {
      ok: true,
      message: "Webhook received.",
    });
  }

  // ✅ Match YOUR table columns (lean version)
  // user_id will be resolved in PHP using payment_id -> edu_square_payments.user_id
  const phpPayload = {
    dispute_id: d.dispute_id,
    payment_id: d.payment_id,
    amount: d.amount,
    currency: d.currency,
    card_brand: d.card_brand,
    reason: d.reason,
    state: d.state,
    due_at: d.due_at_mysql,
    square_created_at: d.square_created_at_mysql,
    square_updated_at: d.square_updated_at_mysql,

    // Optional: tracing (PHP can ignore)
    event_id: d.event_id,
    merchant_id: d.merchant_id,
    location_id: d.location_id,
    event_type: d.eventType,
  };

  if (!phpUrl) {
    // Still return 200 so Square doesn't retry
    return json(200, {
      ok: true,
      message: "Webhook received.",
    });
  }

  // Simplify PHP: one action for both (UPSERT by dispute_id)
  const action = "square-dispute";

  try {
    const phpResult = await postToPhp({ phpUrl, action, payload: phpPayload });

    // Never return raw PHP body/errors to the client
    if (!phpResult.ok) {
      return json(200, {
        ok: true,
        message: "Webhook received.",
      });
    }

    return json(200, {
      ok: true,
      message: "Webhook received.",
    });
  } catch {
    // Return 200 so Square doesn't keep retrying; failures should be handled via server monitoring
    return json(200, {
      ok: true,
      message: "Webhook received.",
    });
  }
}