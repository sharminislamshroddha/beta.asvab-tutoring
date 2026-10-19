// app/api/subscribe-again/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { parseIsVariant } from "@/lib/package-utils";

export const runtime = "nodejs";

/** -------------------------------------------------------
 * Helpers
 * ------------------------------------------------------ */
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

function squareBaseUrl() {
  const env = safeStr(
    process.env.SQUARE_ENVIRONMENT || "sandbox",
    20,
  ).toLowerCase();
  return env === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

function currentSquareEnvironment() {
  const env = safeStr(
    process.env.SQUARE_ENVIRONMENT || "sandbox",
    20,
  ).toLowerCase();
  return env === "production" ? "production" : "sandbox";
}

/**
 * Parse PHP response safely.
 * - Never echo raw HTML/errors back to client.
 * - If response is not JSON, return null and handle with a friendly message.
 */
function parsePhpJson(raw: string) {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { ok: true as const, data: {} };

  if (
    trimmed.startsWith("<!doctype") ||
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    trimmed.startsWith("<HTML") ||
    trimmed.startsWith("<")
  ) {
    return { ok: false as const, reason: "non_json_html" };
  }

  if (/^(fatal error|parse error|warning|notice)\b/i.test(trimmed)) {
    return { ok: false as const, reason: "non_json_php_error" };
  }

  const direct = safeJsonParse(trimmed);
  if (direct) return { ok: true as const, data: direct };

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = trimmed.slice(first, last + 1);
    const salvaged = safeJsonParse(candidate);
    if (salvaged) return { ok: true as const, data: salvaged };
  }

  return { ok: false as const, reason: "non_json_unknown" };
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

const PHP_API_URL = safeStr(
  process.env.NEXT_PUBLIC_PHP_API_URL || process.env.PHP_API_URL || "",
  800,
);

type PhpResult = {
  http_ok: boolean;
  status: number;
  data: any;
  parse_ok: boolean;
};

async function callPhp(payload: Record<string, any>): Promise<PhpResult> {
  if (!PHP_API_URL) {
    return { http_ok: false, status: 500, data: null, parse_ok: false };
  }

  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    form.append(k, String(v));
  }

  try {
    const resp = await fetchWithTimeout(
      PHP_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/plain, */*",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        body: form.toString(),
        cache: "no-store",
      },
      20_000,
    );

    const raw = await resp.text().catch(() => "");
    const parsed = parsePhpJson(raw);

    if (!parsed.ok) {
      return {
        http_ok: resp.ok,
        status: resp.status,
        data: null,
        parse_ok: false,
      };
    }

    return {
      http_ok: resp.ok,
      status: resp.status,
      data: parsed.data,
      parse_ok: true,
    };
  } catch {
    return {
      http_ok: false,
      status: 0,
      data: null,
      parse_ok: false,
    };
  }
}

type SquareResp = {
  ok: boolean;
  status: number;
  data: any;
  configError?: boolean;
};

function squareConfig() {
  const accessToken = safeStr(process.env.SQUARE_ACCESS_TOKEN || "", 1200);
  const squareVersion = safeStr(process.env.SQUARE_VERSION || "2026-01-22", 50);
  const locationId = safeStr(process.env.SQUARE_LOCATION_ID || "", 120);

  if (!accessToken || !squareVersion || !locationId) {
    return {
      ok: false as const,
      accessToken,
      squareVersion,
      locationId,
      configError: true as const,
    };
  }

  return {
    ok: true as const,
    accessToken,
    squareVersion,
    locationId,
    configError: false as const,
  };
}

async function squarePost(path: string, body: any): Promise<SquareResp> {
  const cfg = squareConfig();
  if (!cfg.ok) return { ok: false, status: 500, data: null, configError: true };

  const url = `${squareBaseUrl()}${path}`;

  try {
    const resp = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.accessToken}`,
          "Square-Version": cfg.squareVersion,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
      20_000,
    );

    const text = await resp.text().catch(() => "");
    const data = safeJsonParse(text) ?? {};

    return { ok: resp.ok, status: resp.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/** -------------------------------------------------------
 * PHP plan variation lookup
 * ------------------------------------------------------ */
type ResolvedPlanVariation = {
  ok: boolean;
  session_id: string;
  course_id: string;
  package_id: string;
  price: string;
  currency: string;
  title: string;
  plan_variation_id: string;
  raw: any;
};

async function getPlanVariationBySessionId(
  sessionId: string | number,
): Promise<ResolvedPlanVariation> {
  const session_id = safeStr(sessionId, 60);

  if (!session_id) {
    return {
      ok: false,
      session_id: "",
      course_id: "",
      package_id: "",
      price: "",
      currency: "",
      title: "",
      plan_variation_id: "",
      raw: null,
    };
  }

  const php = await callPhp({
    action: "get-plan-variation-id",
    session_id,
  });

  if (!php.parse_ok || !php.http_ok || !php.data?.isSuccess) {
    return {
      ok: false,
      session_id,
      course_id: "",
      package_id: "",
      price: "",
      currency: "",
      title: "",
      plan_variation_id: "",
      raw: php.data,
    };
  }

  const rows = Array.isArray(php.data?.data) ? php.data.data : [];
  const row = rows[0];

  if (!row) {
    return {
      ok: false,
      session_id,
      course_id: "",
      package_id: "",
      price: "",
      currency: "",
      title: "",
      plan_variation_id: "",
      raw: php.data,
    };
  }

  const env = currentSquareEnvironment();
  const plan_variation_id =
    env === "production"
      ? safeStr(row?.production_plan_variation_id || "", 120)
      : safeStr(row?.sandbox_plan_variation_id || "", 120);

  return {
    ok: !!plan_variation_id,
    session_id: safeStr(row?.session_id || session_id, 60),
    course_id: safeStr(row?.course_id || "", 60),
    package_id: safeStr(row?.package_id || "", 60),
    price: safeStr(row?.price || "", 40),
    currency: safeStr(row?.currency || "USD", 10) || "USD",
    title: safeStr(row?.title || "Subscription", 120) || "Subscription",
    plan_variation_id,
    raw: row,
  };
}

async function enrichPackagesWithPlanVariationIds(packages: any[]) {
  if (!Array.isArray(packages) || packages.length === 0) return [];

  const enriched = await Promise.all(
    packages.map(async (pkg) => {
      const session_id = safeStr(pkg?.session_id || "", 60);

      if (!session_id) {
        return {
          ...pkg,
          plan_variation_id: "",
        };
      }

      const resolved = await getPlanVariationBySessionId(session_id);

      return {
        ...pkg,
        plan_variation_id: resolved.plan_variation_id || "",
        production_plan_variation_id:
          resolved.raw?.production_plan_variation_id ??
          pkg?.production_plan_variation_id ??
          "",
        sandbox_plan_variation_id:
          resolved.raw?.sandbox_plan_variation_id ??
          pkg?.sandbox_plan_variation_id ??
          "",
      };
    }),
  );

  return enriched;
}

/** -------------------------------------------------------
 * Square helpers for subscribe-again
 * ------------------------------------------------------ */
async function squareCreateCardOnFile(args: {
  customer_id: string;
  sourceId: string;
}) {
  const body = {
    idempotency_key: crypto.randomUUID(),
    source_id: args.sourceId,
    card: { customer_id: args.customer_id },
  };

  return await squarePost("/v2/cards", body);
}

async function squareCreateOrderTemplate(args: {
  location_id: string;
  amount_cents: number;
  title: string;
  currency?: string;
}) {
  const currency = safeStr(args.currency || "USD", 10) || "USD";

  const body = {
    idempotency_key: crypto.randomUUID(),
    order: {
      location_id: args.location_id,
      state: "DRAFT",
      line_items: [
        {
          name: args.title,
          quantity: "1",
          base_price_money: { amount: args.amount_cents, currency },
        },
      ],
    },
  };

  return await squarePost("/v2/orders", body);
}

async function squareCreateSubscription(args: {
  customer_id: string;
  location_id: string;
  plan_variation_id: string;
  idempotency_key: string;
  card_id: string;
  order_template_id: string;
}) {
  const body: any = {
    idempotency_key: args.idempotency_key,
    location_id: args.location_id,
    customer_id: args.customer_id,
    plan_variation_id: args.plan_variation_id,
    card_id: args.card_id,
    phases: [{ ordinal: 0, order_template_id: args.order_template_id }],
  };

  return await squarePost("/v2/subscriptions", body);
}

function pickSubscriptionFields(sub: any) {
  const subscription_id = safeStr(sub?.id || "", 120);
  const status = safeStr(sub?.status || "", 60);
  const start_date = safeStr(sub?.start_date || "", 20);
  const next_billing_date = safeStr(
    sub?.charged_through_date || sub?.next_billing_date || "",
    20,
  );

  return { subscription_id, status, start_date, next_billing_date };
}

/** -------------------------------------------------------
 * GET /api/subscribe-again
 * - Calls PHP action=subscribe-again and returns it.
 * - Enriches each package with plan_variation_id from PHP API.
 * ------------------------------------------------------ */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const auth_token = safeStr(searchParams.get("auth_token") || "", 400);
    const user_id = safeStr(searchParams.get("user_id") || "", 60);
    const return_url = safeStr(searchParams.get("return_url") || "", 800);

    if (!auth_token || !user_id) {
      return json(400, {
        ok: false,
        message: "Please log in again and try once more.",
      });
    }

    const php = await callPhp({
      action: "subscribe-again",
      auth_token,
      user_id,
      return_url,
    });

    if (!php.parse_ok || !php.http_ok) {
      return json(502, {
        ok: false,
        message:
          "We couldn't load your subscription options right now. Please try again shortly.",
      });
    }

    if (!php.data?.ok) {
      return json(400, {
        ok: false,
        message:
          php.data?.message ||
          "We couldn't load your subscription options. Please try again.",
      });
    }

    const packages = Array.isArray(php.data?.packages) ? php.data.packages : [];
    const enrichedPackages = await enrichPackagesWithPlanVariationIds(packages);

    return json(200, {
      ...php.data,
      packages: enrichedPackages,
    });
  } catch {
    return json(500, {
      ok: false,
      message: "Something went wrong. Please try again.",
    });
  }
}

/** -------------------------------------------------------
 * POST /api/subscribe-again
 * - Validates selected package via PHP action=subscribe-again
 * - Gets plan_variation_id from PHP action=get-plan-variation-id using session_id
 * - Looks up square_customer_id via PHP auth-token-lookup
 * - Creates card-on-file from sourceId
 * - Creates DRAFT order template for amount
 * - Creates subscription with phases and card_id
 * - DOES NOT call subscription-updated (webhooks handle DB syncing)
 * ------------------------------------------------------ */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}) as any);

    const auth_token = safeStr(body?.auth_token || "", 400);
    const user_id_from_client = safeStr(body?.user_id || "", 60);
    const sourceId = safeStr(body?.sourceId || "", 600);
    const return_url = safeStr(body?.return_url || "", 800);

    // Prefer session_id from client.
    // Keep plan_variation_id only for backward compatibility in validation response.
    const session_id = safeStr(body?.session_id || "", 60);
    const incoming_plan_variation_id = safeStr(
      body?.plan_variation_id || "",
      120,
    );

    if (!auth_token || !user_id_from_client) {
      return json(400, {
        ok: false,
        message: "Missing required information. Please refresh and try again.",
      });
    }

    if (!sourceId) {
      return json(400, {
        ok: false,
        message: "Payment method is missing. Please refresh and try again.",
      });
    }

    if (!session_id && !incoming_plan_variation_id) {
      return json(400, {
        ok: false,
        message: "Please select a subscription option and try again.",
      });
    }

    if (!PHP_API_URL) {
      return json(500, {
        ok: false,
        message:
          "Subscription service is not configured properly. Please contact support.",
      });
    }

    // 1) Server-side validation: load available packages from PHP
    const ctx = await callPhp({
      action: "subscribe-again",
      auth_token,
      user_id: user_id_from_client,
      return_url,
    });

    if (!ctx.parse_ok || !ctx.http_ok || !ctx.data?.ok) {
      return json(502, {
        ok: false,
        message:
          "We couldn't verify your subscription options right now. Please try again shortly.",
      });
    }

    const course_id = safeStr(ctx.data?.course?.course_id || "", 60);
    const is_variant = parseIsVariant(ctx.data?.course?.is_variant);
    const main_course_id = safeStr(ctx.data?.course?.main_course_id || "", 60);
    if (!course_id) {
      return json(500, {
        ok: false,
        message: "We couldn't prepare your subscription. Please try again.",
      });
    }

    const pkgs: any[] = Array.isArray(ctx.data?.packages)
      ? ctx.data.packages
      : [];

    let picked: any = null;

    if (session_id) {
      picked =
        pkgs.find((p) => safeStr(p?.session_id || "", 60) === session_id) ||
        null;
    } else if (incoming_plan_variation_id) {
      const enrichedPkgs = await enrichPackagesWithPlanVariationIds(pkgs);
      picked =
        enrichedPkgs.find(
          (p) =>
            safeStr(p?.plan_variation_id || "", 120) ===
            incoming_plan_variation_id,
        ) || null;
    }

    if (!picked) {
      return json(400, {
        ok: false,
        message:
          "That subscription option is not available. Please select another plan.",
      });
    }

    const picked_session_id = safeStr(picked?.session_id || session_id, 60);
    if (!picked_session_id) {
      return json(400, {
        ok: false,
        message: "We couldn't verify the selected package. Please try again.",
      });
    }

    // 2) Resolve actual plan_variation_id from PHP API using session_id
    const planLookup = await getPlanVariationBySessionId(picked_session_id);

    if (!planLookup.ok || !planLookup.plan_variation_id) {
      return json(400, {
        ok: false,
        message:
          "We couldn't find the plan variation for the selected package. Please try again.",
      });
    }

    const plan_variation_id = planLookup.plan_variation_id;

    const amountRaw =
      picked?.amount_cents ?? picked?.price ?? planLookup.price ?? 0;
    let amount_cents = 0;

    if (typeof amountRaw === "number" && Number.isFinite(amountRaw)) {
      amount_cents =
        amountRaw > 999 ? Math.round(amountRaw) : Math.round(amountRaw * 100);
    } else {
      const parsed = Number(String(amountRaw).replace(/[^0-9.]/g, ""));
      amount_cents = Number.isFinite(parsed)
        ? parsed > 999
          ? Math.round(parsed)
          : Math.round(parsed * 100)
        : 0;
    }

    if (!Number.isFinite(amount_cents) || amount_cents <= 0) {
      return json(400, {
        ok: false,
        message: "We couldn't verify the plan price. Please try again.",
      });
    }

    const currency =
      safeStr(picked?.currency || planLookup.currency || "USD", 10) || "USD";
    const title =
      safeStr(picked?.title || planLookup.title || "Subscription", 120) ||
      "Subscription";

    // 3) Validate auth token and get Square customer id
    const who = await callPhp({ action: "auth-token-lookup", auth_token });

    if (
      !who.parse_ok ||
      !who.http_ok ||
      !who.data?.ok ||
      !who.data?.user?.user_id
    ) {
      return json(401, {
        ok: false,
        message: "Your session has expired. Please log in again.",
      });
    }

    const user_id = safeStr(who.data.user.user_id || "", 60);
    if (user_id !== user_id_from_client) {
      return json(401, {
        ok: false,
        message: "Your session has expired. Please log in again.",
      });
    }

    let square_customer_id = safeStr(
      who.data.user.square_customer_id || "",
      140,
    );

    // 1) Check if user doesn't have a Square Customer Profile
    if (square_customer_id === "" || !square_customer_id) {
      // 2) We need an email and name to create a Square Customer Profile
      const email = safeStr(who.data.user.email || "", 255);
      const firstName = safeStr(who.data.user.first_name || "Student", 100);
      const lastName = safeStr(who.data.user.last_name || "", 100);

      if (!email) {
        return json(400, {
          ok: false,
          message:
            "An email address is required to create a new payment profile.",
        });
      }

      // 3) Create the new Square Customer Profile
      const customerRes = await squarePost("/v2/customers", {
        idempotency_key: crypto.randomUUID(),
        given_name: firstName,
        family_name: lastName,
        email_address: email,
      });

      if (!customerRes.ok || !customerRes.data?.customer?.id) {
        return json(400, {
          ok: false,
          message:
            "We couldn't set up your payment profile. Please try again or contact support.",
        });
      }

      square_customer_id = customerRes.data.customer.id;
    }

    // 4) Create card-on-file
    const cardRes = await squareCreateCardOnFile({
      customer_id: square_customer_id,
      sourceId,
    });

    if (cardRes.configError) {
      return json(500, {
        ok: false,
        message:
          "Payment service is not configured properly. Please contact support.",
      });
    }

    if (!cardRes.ok) {
      return json(400, {
        ok: false,
        message:
          "We couldn't save your payment method. Please try again or use a different card.",
      });
    }

    const card_id = safeStr(cardRes.data?.card?.id || "", 120);
    if (!card_id) {
      return json(500, {
        ok: false,
        message: "We couldn't set up your payment method. Please try again.",
      });
    }

    // 5) Create DRAFT order template
    const cfg = squareConfig();
    if (!cfg.ok || !cfg.locationId) {
      return json(500, {
        ok: false,
        message:
          "Payment service is not configured properly. Please contact support.",
      });
    }

    const location_id = cfg.locationId;

    const orderRes = await squareCreateOrderTemplate({
      location_id,
      amount_cents,
      title,
      currency,
    });

    if (orderRes.configError) {
      return json(500, {
        ok: false,
        message:
          "Payment service is not configured properly. Please contact support.",
      });
    }

    if (!orderRes.ok) {
      return json(400, {
        ok: false,
        message:
          "We couldn't prepare your subscription charge. Please try again shortly.",
      });
    }

    const order_template_id = safeStr(orderRes.data?.order?.id || "", 120);
    if (!order_template_id) {
      return json(500, {
        ok: false,
        message: "We couldn't prepare your subscription. Please try again.",
      });
    }

    // 6) Create subscription
    const subRes = await squareCreateSubscription({
      customer_id: square_customer_id,
      location_id,
      plan_variation_id,
      idempotency_key: crypto.randomUUID(),
      card_id,
      order_template_id,
    });

    if (subRes.configError) {
      return json(500, {
        ok: false,
        message:
          "Payment service is not configured properly. Please contact support.",
      });
    }

    if (!subRes.ok) {
      return json(400, {
        ok: false,
        message:
          "We couldn't create the subscription. Please try again, or use a different card.",
      });
    }

    const sub = subRes.data?.subscription || {};
    const { subscription_id, status, start_date, next_billing_date } =
      pickSubscriptionFields(sub);

    if (!subscription_id) {
      return json(500, {
        ok: false,
        message:
          "We couldn't finalize your subscription. Please contact support.",
      });
    }

    // If the user didn't previously have a square_customer_id in the DB (old web user)
    if (
      !who.data.user.square_customer_id ||
      who.data.user.square_customer_id === ""
    ) {
      const package_id = safeStr(
        picked?.package_id || planLookup.package_id || "",
        60,
      );

      // Keep subscribe-again's already-mapped asvab course_id for normal
      // courses. Variant users must re-register with the grade MAIN id.
      // Do not use planLookup.course_id (session row; ambiguous id space).
      const resolvedCourseId =
        is_variant === 1
          ? main_course_id
          : safeStr(course_id || "", 60);

      if (!resolvedCourseId || resolvedCourseId === "0") {
        return json(400, {
          ok: false,
          message:
            "Course ID is required to finish registration. Please try again or contact support.",
        });
      }

      await callPhp({
        action: "web-user-registration-subscription",
        course_id: resolvedCourseId,
        is_variant,
        user_id: user_id_from_client,
        subscription_date: start_date,
        package_id: package_id,
        session_id: picked_session_id,
        amount: amount_cents,
        raw_amount: amount_cents,
        currency: currency,
        status: status,
        square_subscription_id: subscription_id,
        square_customer_id: square_customer_id,
        plan_variation_id: plan_variation_id,
        auth_token: auth_token,
      });
    }

    return json(200, {
      ok: true,
      message: "Your subscription has been created successfully.",
      subscription_id,
      status,
      start_date,
      next_billing_date,
      back_to_portal: return_url || null,
      selected: {
        session_id: picked_session_id,
        course_id,
        package_id:
          safeStr(picked?.package_id || planLookup.package_id || "", 60) ||
          null,
        title,
        price:
          safeStr(picked?.price || planLookup.price || "", 40) ||
          (amount_cents / 100).toFixed(2),
        amount_cents,
        plan_variation_id,
        currency,
      },
      square: {
        customer_id: square_customer_id,
        card_id,
        order_template_id,
      },
    });
  } catch {
    return json(500, {
      ok: false,
      message:
        "We couldn't create your subscription right now. Please try again.",
    });
  }
}
