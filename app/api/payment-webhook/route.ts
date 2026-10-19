// app/api/payment-webhook/route.ts
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

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

// Best-effort idempotency (in-memory). Production idempotency must be DB-level in PHP.
const seenEventIds = new Set<string>();

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function safeStr(v: unknown, max = 800) {
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

function envConfig() {
  const signatureKey = safeStr(process.env.SQUARE_PAYMENT_WEBHOOK_SIGNATURE_KEY || "", 500);
  const notificationUrl = safeStr(process.env.SQUARE_PAYMENT_WEBHOOK_URL || "", 800);
  const phpUrl = safeStr(process.env.NEXT_PUBLIC_PHP_API_URL || "", 800);
  return { signatureKey, notificationUrl, phpUrl };
}

async function forwardToPhp(params: {
  phpUrl: string;
  action: string;
  body: URLSearchParams;
}) {
  // Ensure action exists (PHP expects it)
  params.body.set("action", params.action);

  const res = await fetchWithTimeout(
    params.phpUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: params.body.toString(),
      cache: "no-store",
    },
    15_000
  );

  const text = await res.text().catch(() => "");
  const data = safeJsonParse(text);

  return { ok: res.ok, status: res.status, data };
}

function extractPayment(event: any) {
  const eventType = safeStr(event?.type ?? "", 80);
  const eventId = safeStr(event?.event_id ?? "", 120);
  const eventCreatedAt = safeStr(event?.created_at ?? "", 80);

  const payment = event?.data?.object?.payment ?? null;

  const paymentId = safeStr(payment?.id ?? event?.data?.id ?? "", 120);
  const orderId = safeStr(payment?.order_id ?? "", 120);
  const status = safeStr(payment?.status ?? "", 60);

  const amountMinor = payment?.amount_money?.amount;
  const currency = safeStr(payment?.amount_money?.currency ?? "", 10);

  const squareCustomerId = safeStr(payment?.customer_id ?? "", 120);
  const paymentCreatedAt = safeStr(payment?.created_at ?? "", 80);
  const paymentUpdatedAt = safeStr(payment?.updated_at ?? "", 80);

  const sourceType = safeStr(payment?.source_type ?? "", 40);
  const receiptNumber = safeStr(payment?.receipt_number ?? "", 60);
  const receiptUrl = safeStr(payment?.receipt_url ?? "", 400);

  const cardLast4 = safeStr(payment?.card_details?.card?.last_4 ?? "", 8);
  const cardBrand = safeStr(payment?.card_details?.card?.card_brand ?? "", 30);

  // Buyer email (present in many payment events)
  const buyerEmailAddress = safeStr(payment?.buyer_email_address ?? "", 120);

  return {
    eventType,
    eventId,
    eventCreatedAt,

    paymentId,
    orderId,
    status,
    amountMinor:
      amountMinor === undefined || amountMinor === null ? "" : safeStr(amountMinor, 32),
    currency,

    squareCustomerId,
    paymentCreatedAt,
    paymentUpdatedAt,

    sourceType,
    receiptNumber,
    receiptUrl,
    cardLast4,
    cardBrand,

    buyerEmailAddress,
  };
}

export async function GET() {
  return json(200, { ok: true, message: "Payment webhook is running." });
}

export async function POST(req: NextRequest) {
  const { signatureKey, notificationUrl, phpUrl } = envConfig();

  // ---- Receive RAW body (required for signature)
  const rawBody = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature");

  // ---- Env safety: do not crash if misconfigured
  if (!signatureKey || !notificationUrl) {
    return json(500, {
      ok: false,
      message: "Webhook service is not configured properly.",
    });
  }

  // ---- Verify signature
  const isValid = verifySquareSignature({
    signatureKey,
    notificationUrl: notificationUrl.trim(),
    rawBody,
    signatureHeader: signature,
  });

  if (!isValid) {
    return json(401, {
      ok: false,
      message: "Unauthorized webhook request.",
    });
  }

  // ---- Parse JSON
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json(400, {
      ok: false,
      message: "Invalid webhook payload.",
    });
  }

  const type = safeStr(event?.type ?? "", 80);
  const eventId = safeStr(event?.event_id ?? "", 120);

  // Best-effort in-memory dedupe
  if (eventId) {
    if (seenEventIds.has(eventId)) return json(200, { ok: true });
    seenEventIds.add(eventId);
  }

  // Only handle payment events in this route
  const shouldHandle = type === "payment.updated" || type === "payment.created";
  if (!shouldHandle) {
    return json(200, { ok: true });
  }

  // Extract payment details
  const p = extractPayment(event);

  // If Square changes structure, avoid forwarding invalid data
  if (!p.paymentId) {
    return json(200, { ok: true });
  }

  // If PHP URL missing, acknowledge to Square and stop (avoid retries)
  if (!phpUrl) {
    return json(200, { ok: true, message: "Webhook received." });
  }

  // Build PHP payload
  const body = new URLSearchParams();

  body.set("event_id", p.eventId);
  body.set("event_type", p.eventType);
  body.set("event_created_at", p.eventCreatedAt);

  body.set("payment_id", p.paymentId);

  if (p.orderId) body.set("order_id", p.orderId);
  if (p.status) body.set("payment_status", p.status);

  // amount is in smallest currency unit (e.g., cents)
  if (p.amountMinor !== "") body.set("amount", p.amountMinor);
  if (p.currency) body.set("currency", p.currency);

  if (p.squareCustomerId) body.set("square_customer_id", p.squareCustomerId);
  if (p.paymentCreatedAt) body.set("payment_created_at", p.paymentCreatedAt);
  if (p.paymentUpdatedAt) body.set("payment_updated_at", p.paymentUpdatedAt);

  // Forward email to PHP (optional)
  if (p.buyerEmailAddress) {
    body.set("email", p.buyerEmailAddress);
    body.set("buyer_email_address", p.buyerEmailAddress);
  }

  // Optional fields (safe to ignore in PHP)
  if (p.sourceType) body.set("source_type", p.sourceType);
  if (p.receiptNumber) body.set("receipt_number", p.receiptNumber);
  if (p.receiptUrl) body.set("receipt_url", p.receiptUrl);
  if (p.cardLast4) body.set("card_last_4", p.cardLast4);
  if (p.cardBrand) body.set("card_brand", p.cardBrand);

  // Forward to PHP (never return raw PHP errors)
  try {
    const result = await forwardToPhp({
      phpUrl,
      action: "payment-updated-webhook",
      body,
    });

    // Always return 200 to Square once verified, to prevent repeated retries.
    // If PHP fails, handle monitoring on your server side.
    if (!result.ok) {
      return json(200, { ok: true, message: "Webhook received." });
    }

    return json(200, { ok: true, message: "Webhook received." });
  } catch {
    // Return 200 so Square doesn't keep retrying; failures should be handled via server monitoring
    return json(200, { ok: true, message: "Webhook received." });
  }
}