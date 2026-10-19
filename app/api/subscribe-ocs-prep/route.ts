// app\api\subscribe-ocs-prep\route.ts
import { NextRequest, NextResponse } from "next/server";
import { SquareClient, SquareEnvironment, SquareError } from "square";
import { randomUUID } from "crypto";
import { Country } from "square";
import { parseIsVariant } from "@/lib/package-utils";
import {
  checkoutEmailAlreadyRegistered,
  validateCheckoutCourseId,
} from "@/lib/php-checkout";

export const runtime = "nodejs";

type Payload = {
  sourceId: string;
  product: string;
  cadence: string;
  userEmail: string;
  userName: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  mobile?: string;
  amount: number | string;
  course_id?: string;
  session_id?: string;
  package_id?: string;
  is_variant?: number | string | boolean;
  planVariationId: string;
  postal_code?: string;
  country_code?: string;
};

function getSquareEnvironment(): SquareEnvironment {
  const env = String(process.env.SQUARE_ENVIRONMENT || "sandbox")
    .trim()
    .toLowerCase();
  return env === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
}

function assertRequiredEnv(): void {
  const missing: string[] = [];
  if (!process.env.SQUARE_ACCESS_TOKEN) missing.push("SQUARE_ACCESS_TOKEN");
  if (!process.env.PHP_API_URL) missing.push("PHP_API_URL");
  if (missing.length) throw new Error("Server configuration missing.");
}

function validateProductAvailability(product: string): void {
  if (!product || !product.trim()) {
    throw new Error("The Selected course or package does not exist.");
  }
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseAmountToCents(amount: number | string): number {
  const cleaned = String(amount).replace(/[^0-9.]/g, "");
  if (cleaned.includes(".")) {
    return Math.round(parseFloat(cleaned) * 100);
  }
  return parseInt(cleaned, 10) || 0;
}

async function saveSubscriptionToPhp(args: any) {
  const phpUrl = process.env.PHP_API_URL!;
  const phpSecret = cleanString(process.env.INTERNAL_API_SECRET || "");
  const form = new URLSearchParams();

  // Mapping to your PHP case
  form.append("action", "user-registration-subscription");
  form.append("subscription_id", args.squareSubscriptionId);
  form.append("square_customer_id", args.squareCustomerId);
  form.append("plan_variation_id", args.planVariationId);

  form.append("email", args.userEmail);
  form.append("password", args.password || "");
  form.append("first_name", args.first_name);
  form.append("last_name", args.last_name);
  form.append("mobile", args.mobile || "");

  form.append("course_id", cleanString(args.course_id));
  form.append("session_id", cleanString(args.session_id));
  form.append("package_id", cleanString(args.package_id));
  form.append("is_variant", String(parseIsVariant(args.is_variant)));

  form.append("amount", String(args.amountInCents));
  form.append("currency", "USD");

  // ✅ DEBUG LOGS (IMPORTANT)
  // console.log("===== SENDING DATA TO PHP =====");
  // console.log("ARGS:", args);
  // console.log("course_id:", args.course_id);
  // console.log("session_id:", args.session_id);
  // console.log("package_id:", args.package_id);
  // console.log("FORM BODY:", form.toString());
  // console.log("================================");

  const res = await fetch(phpUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(phpSecret ? { "X-ASVAB-SECRET": phpSecret } : {}),
    },
    body: form.toString(),
  });

  const raw = await res.text();

  // ✅ DEBUG RESPONSE FROM PHP
  // console.log("===== PHP RESPONSE =====");
  // console.log(raw);
  // console.log("========================");

  try {
    const parsed = JSON.parse(raw);
    if (!res.ok || !parsed.isSuccess)
      throw new Error(parsed.message || "PHP Sync Failed");
    return parsed;
  } catch (e) {
    throw new Error("Failed to finalize account on our system.");
  }
}

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!,
  environment: getSquareEnvironment(),
});

export async function POST(req: NextRequest) {
  try {
    assertRequiredEnv();

    const rawText = await req.clone().text();
    // console.log("RAW BODY:", rawText);
    // console.log("HEADERS:", Object.fromEntries(req.headers.entries()));

    const body: Payload = await req.json();

    // console.log("PARSED BODY:", body);
    // console.log("BODY.course_id:", body.course_id);

    validateProductAvailability(body.product);

    if (!body.planVariationId) throw new Error("Missing planVariationId.");
    if (!body.sourceId) throw new Error("Payment method not verified.");

    const courseId = cleanString(body.course_id);
    const sessionId = cleanString(body.session_id);
    const packageId = cleanString(body.package_id);

    if (!courseId || courseId === "0") {
      throw new Error("Course ID is required.");
    }
    if (!sessionId || sessionId === "0") {
      throw new Error("Session ID is required.");
    }
    if (!packageId || packageId === "0") {
      throw new Error("Package ID is required.");
    }

    const courseCheck = await validateCheckoutCourseId({
      course_id: courseId,
      session_id: sessionId,
      package_id: packageId,
      is_variant: body.is_variant,
    });
    if (!courseCheck.ok) {
      throw new Error(courseCheck.message);
    }

    const emailTaken = await checkoutEmailAlreadyRegistered(body.userEmail);
    if (emailTaken === true) {
      throw new Error(
        "This email address is already registered. Please log in or use a different email.",
      );
    }

    const amountInCents = parseAmountToCents(body.amount);
    const firstName = body.first_name || body.userName?.split(" ")[0] || "";
    const lastName =
      body.last_name || body.userName?.split(" ").slice(1).join(" ") || "";

    const { customer } = await squareClient.customers.create({
      idempotencyKey: randomUUID(),
      givenName: firstName,
      familyName: lastName,
      emailAddress: body.userEmail,
    });

    if (!customer?.id) throw new Error("Payment profile creation failed.");

    const { card } = await squareClient.cards.create({
      idempotencyKey: randomUUID(),
      sourceId: body.sourceId,
      card: {
        customerId: customer.id,
        cardholderName: `${firstName} ${lastName}`.trim(),
        billingAddress: {
          postalCode: body.postal_code,
          country: body.country_code
            ? (body.country_code as Country)
            : Country.Us,
        },
      },
    });

    if (!card?.id) throw new Error("Card authorization failed.");

    const { order } = await squareClient.orders.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        state: "DRAFT",
        lineItems: [
          {
            name: `${body.product} Subscription`,
            quantity: "1",
            basePriceMoney: { amount: BigInt(amountInCents), currency: "USD" },
          },
        ],
      },
    });

    const { subscription } = await squareClient.subscriptions.create({
      idempotencyKey: randomUUID(),
      locationId: process.env.SQUARE_LOCATION_ID!,
      customerId: customer.id,
      planVariationId: body.planVariationId,
      cardId: card.id,
      phases: [{ ordinal: BigInt(0), orderTemplateId: order?.id }],
    });

    if (!subscription?.id) throw new Error("Subscription activation failed.");

    try {
      const phpResponse = await saveSubscriptionToPhp({
        ...body,
        course_id: courseId,
        session_id: sessionId,
        package_id: packageId,
        is_variant: parseIsVariant(body.is_variant),
        first_name: firstName,
        last_name: lastName,
        amountInCents,
        squareSubscriptionId: subscription.id,
        squareCustomerId: customer.id,
        planVariationId: body.planVariationId,
      });

      return NextResponse.json({
        success: true,
        message: "Subscription created successfully!",
        subscriptionId: subscription.id,
        course_id: phpResponse?.course_id ?? courseCheck.course_id,
        php: phpResponse,
      });
    } catch (phpError) {
      try {
        await squareClient.subscriptions.cancel({
          subscriptionId: subscription.id,
        });
      } catch (cancelError) {
        console.error(
          "[/api/subscribe-ocs-prep] Failed to cancel Square subscription after PHP save error",
          cancelError,
        );
      }
      throw phpError;
    }
  } catch (error: any) {
    console.error("ROUTE ERROR:", error);
    const message =
      error instanceof SquareError ? error.errors?.[0].detail : error.message;
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
