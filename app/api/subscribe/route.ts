// app/api/subscribe/route.ts

import { NextRequest, NextResponse } from "next/server";
import { SquareClient, SquareEnvironment, SquareError } from "square";
import { randomUUID } from "crypto";
import { Currency } from "square";
import { parseIsVariant } from "@/lib/package-utils";
import {
  checkoutEmailAlreadyRegistered,
  validateCheckoutCourseId,
} from "@/lib/php-checkout";
import { phpAuthTokenLookup } from "@/lib/auth-php";
import { getSession } from "@/lib/auth-session";

export const runtime = "nodejs";

type Product =
  | "ASVAB"
  | "AFOQT"
  | "ASTB"
  | "SIFT"
  | "OAR"
  | "HESI A2"
  | "ATI TEAS"
  | "CNA"
  | "SHSAT"
  | "State Math Test Prep";
type Cadence = "1M" | "3M" | "6M" | "12M";

type Payload = {
  sourceId: string;
  product: Product;
  cadence: Cadence;
  userEmail: string;
  userName: string;
  password?: string;
  mobile?: string;
  amount: number | string;
  course_id?: string;
  session_id?: string;
  package_id?: string;
  is_variant?: number | string | boolean;
  isExistingUser?: boolean | string;
  user_id?: string;
  auth_token?: string;
};

type PhpPlanRow = {
  session_id: string;
  course_id: string;
  course_name: string;
  package_id: string;
  package_duration: string;
  payment_mode: string;
  title: string;
  price: string;
  currency: string;
  is_most_popular: string;
  production_plan_variation_id: string;
  sandbox_plan_variation_id: string;
  is_active: string;
  updated_at: string | null;
  ord: string;
  asvab: string | null;
  ocs: string | null;
  test_prep: string | null;
  feature: string | null;
};

type PhpPlanResponse = {
  status: number;
  isSuccess: boolean;
  data?: PhpPlanRow[];
  message?: string;
};

function getSquareEnvironment(): SquareEnvironment {
  const env = (process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase();
  return env === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
}

function isProductionEnvironment(): boolean {
  return (
    (process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase() === "production"
  );
}

function assertRequiredEnv(): void {
  const missing: string[] = [];

  if (!process.env.SQUARE_ACCESS_TOKEN) missing.push("SQUARE_ACCESS_TOKEN");
  if (!process.env.SQUARE_LOCATION_ID) missing.push("SQUARE_LOCATION_ID");
  if (!process.env.NEXT_PUBLIC_PHP_API_URL)
    missing.push("NEXT_PUBLIC_PHP_API_URL");

  if (missing.length) {
    throw new Error(
      "The server is missing required configuration. Please contact support.",
    );
  }
}

function isProduct(x: unknown): x is Product {
  return [
    "ASVAB",
    "AFOQT",
    "ASTB",
    "SIFT",
    "OAR",
    "HESI A2",
    "ATI TEAS",
    "CNA",
    "SHSAT",
    "State Math Test Prep",
  ].includes(String(x));
}

function isCadence(x: unknown): x is Cadence {
  return ["1M", "3M", "6M", "12M"].includes(String(x));
}

function parseAmountToCents(amount: number | string): number {
  if (typeof amount === "number") return Math.round(amount);

  if (typeof amount === "string") {
    const cleaned = amount.trim();
    if (!cleaned) throw new Error("Please enter a valid amount.");

    if (cleaned.includes(".")) {
      const dollars = parseFloat(cleaned.replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(dollars)) {
        throw new Error("Please enter a valid amount.");
      }
      return Math.round(dollars * 100);
    }

    const cents = parseInt(cleaned.replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(cents)) {
      throw new Error("Please enter a valid amount.");
    }
    return cents;
  }

  throw new Error("Please enter a valid amount.");
}

async function getPlanSessionData(sessionId: string): Promise<{
  row: PhpPlanRow;
  planVariationId: string;
}> {
  const phpUrl = process.env.NEXT_PUBLIC_PHP_API_URL!;
  const phpSecret = (process.env.INTERNAL_API_SECRET || "").trim();

  const form = new URLSearchParams();
  form.append("action", "get-plan-variation-id");
  form.append("session_id", sessionId);

  const res = await fetch(phpUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(phpSecret ? { "X-ASVAB-SECRET": phpSecret } : {}),
    },
    body: form.toString(),
    cache: "no-store",
  });

  const raw = await res.text();

  let parsed: PhpPlanResponse | null = null;
  try {
    parsed = JSON.parse(raw) as PhpPlanResponse;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    throw new Error(
      "We couldn't load the subscription details right now. Please try again in a moment.",
    );
  }

  if (
    !parsed ||
    parsed.isSuccess !== true ||
    !Array.isArray(parsed.data) ||
    parsed.data.length === 0
  ) {
    throw new Error(
      parsed?.message ||
        "This subscription option is not available right now. Please try a different plan or contact support.",
    );
  }

  const row = parsed.data[0];

  if (!row || String(row.is_active) !== "1") {
    throw new Error(
      "This subscription option is not available right now. Please try a different plan or contact support.",
    );
  }

  const planVariationId = isProductionEnvironment()
    ? String(row.production_plan_variation_id || "").trim()
    : String(row.sandbox_plan_variation_id || "").trim();

  if (!planVariationId) {
    throw new Error(
      "This subscription option is not available right now. Please try a different plan or contact support.",
    );
  }

  return { row, planVariationId };
}

/**
 * Sends data to PHP backend (x-www-form-urlencoded).
 */
async function saveSubscriptionToPhp(args: {
  product: Product;
  cadence: Cadence;
  amountInCents: number;
  userEmail: string;
  userName: string;
  password?: string;
  mobile?: string;
  course_id?: string;
  session_id?: string;
  package_id?: string;
  is_variant?: 0 | 1;
  squareSubscriptionId: string;
  squareCustomerId: string;
  squareCardId: string;
  planVariationId: string;
  orderTemplateId: string;
  auth_token?: string;
  user_id?: string;
  isExistingUser?: boolean;
}) {
  const phpUrl = process.env.NEXT_PUBLIC_PHP_API_URL!;
  const phpSecret = (process.env.INTERNAL_API_SECRET || "").trim();

  const form = new URLSearchParams();

  form.append("action", "user-registration-subscription");

  form.append("email", args.userEmail);
  form.append("password", args.password || "");
  form.append("mobile", args.mobile || "");

  const nameParts = String(args.userName || "")
    .trim()
    .split(/\s+/);
  form.append("first_name", nameParts[0] || "");
  form.append("last_name", nameParts.slice(1).join(" ") || "");

  form.append("amount", String(args.amountInCents));
  form.append("currency", "USD");
  form.append("payment_status", "PENDING");
  form.append("square_customer_id", args.squareCustomerId);
  form.append("payment_source_type", "CARD");

  form.append("subscription_id", args.squareSubscriptionId);
  form.append("plan_variation_id", args.planVariationId);

  // Always post IDs — PHP requires course_id (with session/package fallback).
  form.append("course_id", String(args.course_id || "").trim());
  form.append("session_id", String(args.session_id || "").trim());
  form.append("package_id", String(args.package_id || "").trim());
  form.append("is_variant", String(args.is_variant ?? 0));

  if (args.auth_token) {
    form.append("auth_token", args.auth_token);
  }
  if (args.user_id) {
    form.append("user_id", args.user_id);
  }

  const res = await fetch(phpUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(phpSecret ? { "X-ASVAB-SECRET": phpSecret } : {}),
    },
    body: form.toString(),
  });

  const raw = await res.text();

  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    throw new Error(
      "We couldn't finish setting up your account on our system. Please try again in a moment.",
    );
  }

  if (!parsed || parsed.isSuccess !== true) {
    const ok = Boolean(parsed?.isSuccess ?? parsed?.ok);
    if (!ok) {
      throw new Error(
        "Your subscription was created, but we couldn't finish saving it on our system. Please contact support so we can help right away.",
      );
    }
  }

  return parsed;
}

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!,
  environment: getSquareEnvironment(),
});

function friendlySquareError(err: unknown): string {
  if (err instanceof SquareError) {
    const first = err.errors?.[0];
    const detail =
      first?.detail || first?.code || "A payment service error occurred.";
    return `We couldn't complete the request with our payment provider. ${detail}`;
  }

  if (err instanceof Error) {
    return err.message || "Something went wrong. Please try again.";
  }

  return "Something went wrong. Please try again.";
}

export async function POST(req: NextRequest) {
  try {
    assertRequiredEnv();

    let body: Partial<Payload> = {};
    try {
      body = (await req.json()) as Partial<Payload>;
    } catch {
      return NextResponse.json(
        { success: false, message: "Please send a valid request." },
        { status: 400 },
      );
    }

    if (!body.sourceId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "We couldn't verify your payment method. Please refresh the page and try again.",
        },
        { status: 400 },
      );
    }

    if (!isProduct(body.product) || !isCadence(body.cadence)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please choose a valid product and subscription length, then try again.",
        },
        { status: 400 },
      );
    }

    if (!body.userEmail || !String(body.userEmail).includes("@")) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (!body.userName || !String(body.userName).trim()) {
      return NextResponse.json(
        { success: false, message: "Please enter your full name." },
        { status: 400 },
      );
    }

    if (!body.session_id || !String(body.session_id).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Session ID is required.",
        },
        { status: 400 },
      );
    }

    const amountInCents = parseAmountToCents(body.amount as number | string);
    if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid amount." },
        { status: 400 },
      );
    }

    // 1) Get session/package/plan data from PHP API
    const { row: planRow, planVariationId } = await getPlanSessionData(
      String(body.session_id),
    );

    // Resolve IDs early before charging Square.
    // Never use planRow.course_id — that comes from asvab_tutor_package_sessions
    // and is an ambiguous MAIN/ASVAB mix. package_id from the plan row is safe.
    const resolvedCourseId = String(body.course_id || "").trim();
    const resolvedIsVariant = parseIsVariant(body.is_variant);
    const resolvedPackageId = String(
      body.package_id || planRow.package_id || "",
    ).trim();
    const resolvedSessionId = String(
      body.session_id || planRow.session_id || "",
    ).trim();

    if (!resolvedCourseId || resolvedCourseId === "0") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Course ID is required. Please return to the course page and try again.",
        },
        { status: 400 },
      );
    }

    if (!resolvedPackageId || resolvedPackageId === "0") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Package ID is required. Please return to the course page and try again.",
        },
        { status: 400 },
      );
    }

    const courseCheck = await validateCheckoutCourseId({
      course_id: resolvedCourseId,
      session_id: resolvedSessionId,
      package_id: resolvedPackageId,
      is_variant: resolvedIsVariant,
    });
    if (!courseCheck.ok) {
      return NextResponse.json(
        { success: false, message: courseCheck.message, error: "course_id" },
        { status: 400 },
      );
    }

    const session = await getSession();
    const auth_token = String(
      session?.auth_token || body.auth_token || "",
    ).trim();
    let resolvedUserId = String(body.user_id || "").trim();
    let isExistingUser =
      body.isExistingUser === true ||
      body.isExistingUser === "true" ||
      !!resolvedUserId;

    if (auth_token) {
      const lookedUp = await phpAuthTokenLookup(auth_token);
      if (!lookedUp) {
        return NextResponse.json(
          {
            success: false,
            message: "Your session has expired. Please log in again.",
          },
          { status: 401 },
        );
      }
      if (session && lookedUp.user_id !== session.user_id) {
        return NextResponse.json(
          {
            success: false,
            message: "Your session has expired. Please log in again.",
          },
          { status: 401 },
        );
      }
      resolvedUserId = String(lookedUp.user_id);
      isExistingUser = true;
      body.userEmail = lookedUp.email || body.userEmail;
      if (!body.userName?.trim()) {
        body.userName =
          `${lookedUp.first_name} ${lookedUp.last_name}`.trim() ||
          lookedUp.email;
      }
    }

    if (!isExistingUser) {
      const emailTaken = await checkoutEmailAlreadyRegistered(
        String(body.userEmail),
      );
      if (emailTaken === true) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This email address is already registered. Please log in or use a different email.",
          },
          { status: 400 },
        );
      }
    }

    // Optional consistency check: cadence sent from frontend should match DB
    if (
      String(planRow.package_duration).trim() !== String(body.cadence).trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected subscription length does not match the package configuration.",
        },
        { status: 400 },
      );
    }

    // 2) Square: Create Customer
    const { customer } = await squareClient.customers.create({
      idempotencyKey: randomUUID(),
      givenName: String(body.userName),
      emailAddress: String(body.userEmail),
    });

    if (!customer?.id) {
      throw new Error(
        "We couldn't create your customer profile with the payment provider. Please try again.",
      );
    }

    // 3) Square: Create Card on File
    const { card } = await squareClient.cards.create({
      idempotencyKey: randomUUID(),
      sourceId: String(body.sourceId),
      card: {
        customerId: customer.id,
      },
    });

    if (!card?.id) {
      throw new Error(
        "We couldn't securely save your payment method. Please try again.",
      );
    }

    // 4) Square: Create Order Template
    const { order } = await squareClient.orders.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        state: "DRAFT",
        lineItems: [
          {
            name: `${planRow.course_name || body.product} Subscription`,
            quantity: "1",
            basePriceMoney: {
              amount: BigInt(amountInCents),
              currency: (planRow.currency || "USD") as Currency,
            },
          },
        ],
      },
    });

    if (!order?.id) {
      throw new Error(
        "We couldn't prepare your subscription details. Please try again.",
      );
    }

    // 5) Square: Create Subscription
    const { subscription } = await squareClient.subscriptions.create({
      idempotencyKey: randomUUID(),
      locationId: process.env.SQUARE_LOCATION_ID!,
      customerId: customer.id,
      planVariationId,
      cardId: card.id,
      phases: [
        {
          ordinal: BigInt(0),
          orderTemplateId: order.id,
        },
      ],
    });

    if (!subscription?.id) {
      throw new Error(
        "We couldn't create your subscription. Please try again.",
      );
    }

    // 6) Save to PHP. If this fails, cancel Square so the customer is not billed.
    try {
      const phpSave = await saveSubscriptionToPhp({
        product: body.product,
        cadence: body.cadence,
        amountInCents,
        userEmail: String(body.userEmail),
        userName: String(body.userName),
        password: body.password,
        mobile: body.mobile,
        course_id: resolvedCourseId,
        session_id: resolvedSessionId,
        package_id: resolvedPackageId,
        is_variant: resolvedIsVariant,
        squareSubscriptionId: subscription.id,
        squareCustomerId: customer.id,
        squareCardId: card.id,
        planVariationId,
        orderTemplateId: order.id,
        auth_token: auth_token || undefined,
        user_id: resolvedUserId || undefined,
        isExistingUser,
      });

      return NextResponse.json({
        success: true,
        message:
          "Your subscription has been created. Access will activate once your first payment is confirmed.",
        subscriptionId: subscription.id,
        course_id: phpSave?.course_id ?? courseCheck.course_id,
        php: phpSave,
        plan_data: {
          session_id: resolvedSessionId,
          course_id: resolvedCourseId,
          package_id: resolvedPackageId,
          plan_variation_id: planVariationId,
        },
      });
    } catch (phpError) {
      try {
        await squareClient.subscriptions.cancel({
          subscriptionId: subscription.id,
        });
      } catch (cancelError) {
        console.error(
          "[/api/subscribe] Failed to cancel Square subscription after PHP save error",
          cancelError,
        );
      }

      const phpMessage =
        phpError instanceof Error
          ? phpError.message
          : "We couldn't finish saving your enrollment.";

      return NextResponse.json(
        {
          success: false,
          message:
            "We couldn't finish saving your enrollment. The subscription was canceled so you will not be billed. Please try again or contact support.",
          error: phpMessage,
        },
        { status: 500 },
      );
    }
  } catch (error: unknown) {
    const message = friendlySquareError(error);

    const isClientStyle =
      typeof message === "string" &&
      (message.startsWith("Please ") ||
        message.startsWith("We couldn't verify") ||
        message.startsWith("This subscription option") ||
        message.startsWith("The selected subscription") ||
        message.startsWith("Session ID is required") ||
        message.startsWith("We couldn't"));

    return NextResponse.json(
      { success: false, message },
      { status: isClientStyle ? 400 : 500 },
    );
  }
}
