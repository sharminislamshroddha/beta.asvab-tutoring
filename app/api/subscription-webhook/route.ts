// app/api/subscription-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * Production goals:
 * - Never dump raw Square/PHP responses to clients
 * - Never leak PHP errors/HTML back to client
 * - No “where / debug” style responses
 * - Handle missing env vars without crashing
 * - Prefer acknowledging Square webhooks (200) to avoid noisy retries
 */

function json200(body: Record<string, any> = { ok: true }) {
  return NextResponse.json(body, { status: 200 });
}
function json401() {
  return NextResponse.json(
    { ok: false, message: "Unauthorized." },
    { status: 401 },
  );
}
function json400() {
  return NextResponse.json(
    { ok: false, message: "Bad request." },
    { status: 400 },
  );
}

function safeTrim(v: unknown) {
  return String(v ?? "").trim();
}

function squareBaseUrl() {
  const env =
    safeTrim(process.env.SQUARE_ENVIRONMENT).toLowerCase() || "sandbox";
  return env === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

function getSquareHeadersOrNull() {
  const token = safeTrim(process.env.SQUARE_ACCESS_TOKEN);
  if (!token) return null;

  return {
    Authorization: `Bearer ${token}`,
    // Keep your chosen Square-Version; change only when you intentionally upgrade.
    "Square-Version": "2025-10-16",
    "Content-Type": "application/json",
  } as const;
}

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
  const signatureHeader = safeTrim(params.signatureHeader);
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

// YYYY-MM-DD + N days -> YYYY-MM-DD (UTC-safe)
function addDaysYYYYMMDD(dateStr: string, days: number) {
  const s = safeTrim(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Square does not provide next_billing_date directly.
 * Compute from charged_through_date + 1 day.
 * Fallback: start_date (useful early lifecycle).
 */
function computeNextBillingDate(sub: any) {
  const chargedThrough = safeTrim(sub?.charged_through_date);
  if (chargedThrough) return addDaysYYYYMMDD(chargedThrough, 1);

  const startDate = safeTrim(sub?.start_date);
  return startDate || "";
}

async function safeFetchJson(
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; json: any | null }> {
  try {
    const res = await fetch(url, init);
    const status = res.status;

    // Do NOT forward text/html or raw body anywhere.
    const ct = safeTrim(res.headers.get("content-type")).toLowerCase();
    if (!ct.includes("application/json")) {
      return { ok: false, status, json: null };
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, status, json: data };
    return { ok: true, status, json: data };
  } catch {
    return { ok: false, status: 0, json: null };
  }
}

async function fetchInvoice(invoiceId: string) {
  const headers = getSquareHeadersOrNull();
  if (!headers) return null;

  const url = `${squareBaseUrl()}/v2/invoices/${encodeURIComponent(invoiceId)}`;
  const r = await safeFetchJson(url, { headers });
  return r.ok ? (r.json as { invoice?: any }) : null;
}

async function fetchPayment(paymentId: string) {
  const headers = getSquareHeadersOrNull();
  if (!headers) return null;

  const url = `${squareBaseUrl()}/v2/payments/${encodeURIComponent(paymentId)}`;
  const r = await safeFetchJson(url, { headers });
  return r.ok ? (r.json as { payment?: any }) : null;
}

async function fetchSubscription(subscriptionId: string) {
  const headers = getSquareHeadersOrNull();
  if (!headers) return null;

  const url = `${squareBaseUrl()}/v2/subscriptions/${encodeURIComponent(
    subscriptionId,
  )}`;
  const r = await safeFetchJson(url, { headers });
  return r.ok ? (r.json as { subscription?: any }) : null;
}

async function searchInvoiceByOrderId(params: {
  locationId: string;
  orderId: string;
}) {
  const headers = getSquareHeadersOrNull();
  if (!headers) return null;

  const body = {
    query: {
      filter: {
        location_ids: [params.locationId],
        order_ids: [params.orderId],
      },
    },
    limit: 1,
  };

  const url = `${squareBaseUrl()}/v2/invoices/search`;
  const r = await safeFetchJson(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return r.ok ? (r.json as { invoices?: any[] }) : null;
}

/**
 * POST to your PHP backend.
 * - Never returns raw PHP output to callers.
 * - Never parses or forwards HTML.
 * - If PHP is unavailable/misconfigured, silently skip.
 */
async function postToPhp(action: string, fields: Record<string, string>) {
  const url = safeTrim(process.env.NEXT_PUBLIC_PHP_API_URL);
  if (!url) return { ok: false as const, skipped: true as const };

  const form = new URLSearchParams();
  form.set("action", action);
  for (const [k, v] of Object.entries(fields)) form.set(k, safeTrim(v));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    // Intentionally do NOT read body (prevents accidental HTML/error leakage).
    if (!res.ok) return { ok: false as const, status: res.status };
    return { ok: true as const, status: res.status };
  } catch {
    return { ok: false as const, status: 0 };
  }
}

/**
 * NOTE: For real idempotency, store event_id in DB (recommended).
 * This in-memory set resets on server restart / scale-out.
 */
const seenEventIds = new Set<string>();

function getEventType(event: any) {
  return safeTrim(event?.type);
}
function getEventId(event: any) {
  return safeTrim(event?.event_id);
}
function getEventCreatedAt(event: any) {
  return safeTrim(event?.created_at);
}

function getSubscriptionFromEvent(event: any) {
  return event?.data?.object?.subscription ?? event?.data?.object ?? null;
}
function getSubscriptionId(event: any) {
  return (
    safeTrim(event?.data?.id) ||
    safeTrim(event?.data?.object?.subscription?.id) ||
    safeTrim(event?.data?.object?.id) ||
    ""
  );
}

function getInvoiceFromEvent(event: any) {
  return event?.data?.object?.invoice ?? event?.data?.object ?? null;
}
function getInvoiceId(event: any) {
  return (
    safeTrim(event?.data?.id) ||
    safeTrim(event?.data?.object?.invoice?.id) ||
    safeTrim(event?.data?.object?.invoice_id) ||
    safeTrim(event?.data?.object?.id) ||
    ""
  );
}

export async function GET() {
  return json200({ ok: true });
}

export async function POST(req: NextRequest) {
  // Must read RAW body for signature verification
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    return json200({ ok: true }); // ack to avoid retries
  }

  const signature = req.headers.get("x-square-hmacsha256-signature");
  const signatureKey = safeTrim(
    process.env.SQUARE_SUBSCRIPTION_WEBHOOK_SIGNATURE_KEY,
  );
  const notificationUrl = safeTrim(process.env.SQUARE_SUBSCRIPTION_WEBHOOK_URL);

  // If webhook config is missing, do not crash; acknowledge (and log server-side).
  if (!signatureKey || !notificationUrl) {
    console.error(
      "[subscription-webhook] Missing webhook signature key or notification URL.",
    );
    return json200({ ok: true });
  }

  const isValid = verifySquareSignature({
    signatureKey,
    notificationUrl,
    rawBody,
    signatureHeader: signature,
  });

  if (!isValid) {
    // Security: do not process invalid signatures
    return json401();
  }

  let event: any = null;
  try {
    event = JSON.parse(rawBody);
  } catch {
    // Bad payload, but ack to avoid retries storm
    return json400();
  }

  // Best-effort idempotency
  const eventId = getEventId(event);
  if (eventId) {
    if (seenEventIds.has(eventId)) return json200({ ok: true });
    seenEventIds.add(eventId);
  }

  const type = getEventType(event);
  const eventCreatedAt = getEventCreatedAt(event);

  try {
    switch (type) {
      // ----------------------------
      // Subscriptions API events
      // ----------------------------
      case "subscription.created":
      case "subscription.updated": {
        const subscriptionId = getSubscriptionId(event);
        if (!subscriptionId) return json200({ ok: true });

        let sub = getSubscriptionFromEvent(event);

        // Prefer fetching for accuracy, but do not fail if fetch is unavailable
        const fetched = await fetchSubscription(subscriptionId);
        if (fetched?.subscription) sub = fetched.subscription;

        const status = safeTrim(sub?.status);
        const customerId = safeTrim(sub?.customer_id);
        const planId = safeTrim(sub?.plan_variation_id);

        const startDate = safeTrim(sub?.start_date);
        const chargedThroughDate = safeTrim(sub?.charged_through_date);
        const nextBillingDate = computeNextBillingDate(sub);

        await postToPhp("subscription-updated", {
          event_type: type,
          event_created_at: eventCreatedAt,
          subscription_id: subscriptionId,
          square_customer_id: customerId,
          plan_variation_id: planId,
          status,
          start_date: startDate,
          charged_through_date: chargedThroughDate,
          next_billing_date: nextBillingDate,
        });

        return json200({ ok: true });
      }

      // ----------------------------
      // Invoices API events
      // ----------------------------
      case "invoice.payment_made": {
        const invoiceFromEvent = getInvoiceFromEvent(event);
        const invoiceId = getInvoiceId(event);
        if (!invoiceId) return json200({ ok: true });

        let subscriptionId =
          safeTrim(invoiceFromEvent?.subscription_id) ||
          safeTrim(event?.data?.object?.subscription_id) ||
          "";

        // Fetch invoice for reliable fields when possible
        let fetchedInvoice: any = null;
        const inv = await fetchInvoice(invoiceId);
        fetchedInvoice = inv?.invoice ?? null;
        if (!subscriptionId && fetchedInvoice) {
          subscriptionId = safeTrim(fetchedInvoice?.subscription_id);
        }

        const squareCustomerId =
          safeTrim(fetchedInvoice?.primary_recipient?.customer_id) ||
          safeTrim(invoiceFromEvent?.primary_recipient?.customer_id) ||
          "";

        const email =
          safeTrim(fetchedInvoice?.primary_recipient?.email_address) ||
          safeTrim(invoiceFromEvent?.primary_recipient?.email_address) ||
          "";

        const amountCents =
          fetchedInvoice?.payment_requests?.[0]?.computed_amount_money
            ?.amount ??
          fetchedInvoice?.payment_requests?.[0]?.request_method?.amount_money
            ?.amount ??
          fetchedInvoice?.payment_requests?.[0]?.total_completed_amount_money
            ?.amount ??
          null;

        const currency =
          safeTrim(
            fetchedInvoice?.payment_requests?.[0]?.computed_amount_money
              ?.currency ??
              fetchedInvoice?.payment_requests?.[0]?.request_method
                ?.amount_money?.currency ??
              fetchedInvoice?.payment_requests?.[0]
                ?.total_completed_amount_money?.currency ??
              "USD",
          ) || "USD";

        const paidAt =
          safeTrim(fetchedInvoice?.updated_at) ||
          safeTrim(invoiceFromEvent?.updated_at) ||
          eventCreatedAt ||
          "";

        // Fetch subscription to compute next billing when possible
        let nextBillingDate = "";
        let chargedThroughDate = "";
        let subscriptionStatus = "";
        let planVariationId = "";

        if (subscriptionId) {
          const s = await fetchSubscription(subscriptionId);
          const sub = s?.subscription ?? null;
          if (sub) {
            chargedThroughDate = safeTrim(sub?.charged_through_date);
            nextBillingDate = computeNextBillingDate(sub);
            subscriptionStatus = safeTrim(sub?.status);
            planVariationId = safeTrim(sub?.plan_variation_id);
          }
        }

        const amountToSend =
          amountCents == null ? "0" : (Number(amountCents) / 100).toFixed(2);

        await postToPhp("invoice-payment-made", {
          event_type: type,
          event_created_at: eventCreatedAt,
          invoice_id: invoiceId,
          subscription_id: subscriptionId,
          square_customer_id: squareCustomerId,
          email,
          amount: amountToSend,
          currency,
          paid_at: paidAt,
          payment_id: "",
          charged_through_date: chargedThroughDate,
          next_billing_date: nextBillingDate,
          subscription_status: subscriptionStatus,
          plan_variation_id: planVariationId,
        });

        return json200({ ok: true });
      }

      // Optional future handling
      case "invoice.scheduled_charge_failed": {
        return json200({ ok: true });
      }

      // ----------------------------
      // Disputes
      // ----------------------------
      case "dispute.created":
      case "dispute.state.updated": {
        const dispute = event?.data?.object?.dispute ?? null;

        const disputeId = safeTrim(event?.data?.id ?? dispute?.id);
        const disputeState = safeTrim(dispute?.state) || "UNKNOWN";
        const paymentId = safeTrim(dispute?.disputed_payment?.payment_id);

        const locationId = safeTrim(event?.location_id ?? dispute?.location_id);

        if (!disputeId || !paymentId) return json200({ ok: true });

        let subscriptionId = "";

        // Try to infer subscriptionId from payment -> order_id -> invoice search
        const pay = await fetchPayment(paymentId);
        const payment = pay?.payment ?? null;

        const orderId = safeTrim(payment?.order_id);
        const paymentLocationId = safeTrim(payment?.location_id);
        const effectiveLocationId = paymentLocationId || locationId;

        if (orderId && effectiveLocationId) {
          const found = await searchInvoiceByOrderId({
            locationId: effectiveLocationId,
            orderId,
          });
          const inv = found?.invoices?.[0] ?? null;
          subscriptionId = safeTrim(inv?.subscription_id);
        }

        const disputeScope: "PAYMENT" | "SUBSCRIPTION" = subscriptionId
          ? "SUBSCRIPTION"
          : "PAYMENT";

        await postToPhp("upsert-dispute", {
          payment_id: paymentId,
          subscription_id: subscriptionId,
          dispute_id: disputeId,
          dispute_scope: disputeScope,
          dispute_state: disputeState,
          event_type: type,
          event_created_at: eventCreatedAt,
        });

        return json200({ ok: true });
      }

      default: {
        // Unknown events are safely ignored
        return json200({ ok: true });
      }
    }
  } catch (err) {
    // Never leak internals; acknowledge to prevent repeated retries.
    console.error("[subscription-webhook] Handler error:", err);
    return json200({ ok: true });
  }
}
