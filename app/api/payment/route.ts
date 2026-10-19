// app/api/payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseIsVariant } from "@/lib/package-utils";
import {
  checkoutEmailAlreadyRegistered,
  validateCheckoutCourseId,
} from "@/lib/php-checkout";
import { phpAuthTokenLookup } from "@/lib/auth-php";
import { getSession } from "@/lib/auth-session";
import { parsePhpJsonText } from "@/lib/php-json";

export const runtime = "nodejs";

function safeStr(v: unknown, max = 200) {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function getEnv() {
  return {
    accessToken: safeStr(process.env.SQUARE_ACCESS_TOKEN || "", 500),
    locationId: safeStr(
      process.env.SQUARE_LOCATION_ID ||
        process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ||
        "",
      100,
    ),
    environment: safeStr(
      process.env.SQUARE_ENVIRONMENT || "sandbox",
      30,
    ).toLowerCase(),
    squareVersion: safeStr(process.env.SQUARE_VERSION || "2026-01-22", 50),
    phpApiUrl: safeStr(process.env.NEXT_PUBLIC_PHP_API_URL || "", 500),
    internalApiSecret: safeStr(process.env.INTERNAL_API_SECRET || "", 200),
  };
}

function getSquareBaseUrl(environment: string) {
  return environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

function getSourceId(raw: any): string {
  if (typeof raw === "string") return raw.trim();

  if (raw && typeof raw === "object") {
    if (typeof raw.token === "string") return raw.token.trim();
    if (typeof raw.id === "string") return raw.id.trim();
    if (typeof raw.sourceId === "string") return raw.sourceId.trim();
  }

  return "";
}

function getUserSafeSquareMessage(squareData: any): string {
  const detail =
    squareData?.errors?.[0]?.detail || squareData?.errors?.[0]?.message || "";

  const d = String(detail).toLowerCase();

  if (
    d.includes("card") ||
    d.includes("nonce") ||
    d.includes("token") ||
    d.includes("source_id") ||
    d.includes("postal") ||
    d.includes("cvv") ||
    d.includes("expired") ||
    d.includes("declined")
  ) {
    return "Payment failed. Please try again or use a different card.";
  }

  if (d.includes("location")) {
    return "Payment setup is incomplete. Please contact support.";
  }

  if (d.includes("authorization") || d.includes("access token")) {
    return "Payment service authentication failed. Please contact support.";
  }

  return "Payment failed. Please try again or use a different card. If the issue continues, contact support.";
}

async function refundSquarePayment(args: {
  accessToken: string;
  environment: string;
  squareVersion: string;
  paymentId: string;
  amountCents: number;
}): Promise<boolean> {
  try {
    const refundRes = await fetch(
      `${getSquareBaseUrl(args.environment)}/v2/refunds`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${args.accessToken}`,
          "Square-Version": args.squareVersion,
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          payment_id: args.paymentId,
          amount_money: {
            amount: args.amountCents,
            currency: "USD",
          },
          reason: "Enrollment could not be completed",
        }),
        cache: "no-store",
      },
    );
    return refundRes.ok;
  } catch (err) {
    console.error("[/api/payment] Refund request failed", err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      accessToken,
      locationId,
      environment,
      squareVersion,
      phpApiUrl,
      internalApiSecret,
    } = getEnv();

    if (!accessToken || !locationId) {
      console.error("[/api/payment] Missing Square configuration");

      return json(500, {
        success: false,
        error:
          "Payment service is not configured properly. Please contact support.",
        message:
          "Payment service is not configured properly. Please contact support.",
      });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      console.error("[/api/payment] Invalid request body");

      return json(400, {
        success: false,
        error: "We couldn't read your payment details. Please try again.",
        message: "We couldn't read your payment details. Please try again.",
      });
    }

    const sourceId = getSourceId(body?.sourceId);
    const amount = body?.amount;
    const course_id = safeStr(body?.course_id ?? "", 50);
    const session_id = safeStr(body?.session_id ?? "", 50);
    const package_id = safeStr(body?.package_id ?? "", 50);
    const is_variant = parseIsVariant(body?.is_variant);
    const user = body?.user || {};
    const postedUserId = safeStr(
      body?.user_id ?? user?.user_id ?? user?.id ?? "",
      50,
    );
    const bodyAuthToken = safeStr(body?.auth_token ?? "", 200);
    const session = await getSession();
    const auth_token = session?.auth_token || bodyAuthToken;

    let resolvedUserId = postedUserId;
    let isExistingUser =
      body?.isExistingUser === true ||
      body?.isExistingUser === "true" ||
      postedUserId !== "";

    if (auth_token) {
      const lookedUp = await phpAuthTokenLookup(auth_token);
      if (!lookedUp) {
        return json(401, {
          success: false,
          error: "Your session has expired. Please log in again.",
          message: "Your session has expired. Please log in again.",
        });
      }
      if (session && lookedUp.user_id !== session.user_id) {
        return json(401, {
          success: false,
          error: "Your session has expired. Please log in again.",
          message: "Your session has expired. Please log in again.",
        });
      }
      resolvedUserId = String(lookedUp.user_id);
      isExistingUser = true;
      user.first_name = user.first_name || lookedUp.first_name;
      user.last_name = user.last_name || lookedUp.last_name;
      user.email = user.email || lookedUp.email;
      user.user_id = resolvedUserId;
    }

    // Get Referral Data from Cookies
    const cookieStore = await cookies();
    const ref_code = cookieStore.get("ref_code")?.value || "";
    const ref_type = cookieStore.get("ref_type")?.value || "";

    if (!sourceId) {
      return json(400, {
        success: false,
        error: "Payment method is missing. Please refresh and try again.",
        message: "Payment method is missing. Please refresh and try again.",
      });
    }

    const amountCents = Number(amount);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return json(400, {
        success: false,
        error:
          "The payment amount looks incorrect. Please reload the page and try again.",
        message:
          "The payment amount looks incorrect. Please reload the page and try again.",
      });
    }

    const amountCentsInt = Math.round(amountCents);

    if (!course_id || course_id === "0") {
      return json(400, {
        success: false,
        error:
          "Course ID is required. Please return to the course page and try again.",
        message:
          "Course ID is required. Please return to the course page and try again.",
      });
    }

    if (!session_id || session_id === "0") {
      return json(400, {
        success: false,
        error: "Session ID is required.",
        message: "Session ID is required.",
      });
    }

    if (!package_id || package_id === "0") {
      return json(400, {
        success: false,
        error:
          "Package ID is required. Please return to the course page and try again.",
        message:
          "Package ID is required. Please return to the course page and try again.",
      });
    }

    if (!phpApiUrl) {
      console.error("[/api/payment] Missing PHP_API_URL");
      return json(500, {
        success: false,
        error:
          "Enrollment service is not configured properly. Please contact support.",
        message:
          "Enrollment service is not configured properly. Please contact support.",
      });
    }

    const courseCheck = await validateCheckoutCourseId({
      course_id,
      session_id,
      package_id,
      is_variant,
    });
    if (!courseCheck.ok) {
      return json(400, {
        success: false,
        error: courseCheck.message,
        message: courseCheck.message,
      });
    }

    if (!isExistingUser) {
      const emailTaken = await checkoutEmailAlreadyRegistered(
        safeStr(user?.email ?? "", 120),
      );
      if (emailTaken === true) {
        return json(400, {
          success: false,
          error:
            "This email address is already registered. Please log in or use a different email.",
          message:
            "This email address is already registered. Please log in or use a different email.",
        });
      }
    }

    // 1) Create Customer permanently in Square
    let customerId: string | undefined = undefined;
    try {
      const customerUrl = `${getSquareBaseUrl(environment)}/v2/customers`;
      const customerPayload = {
        idempotency_key: crypto.randomUUID(),
        given_name: safeStr(user?.first_name, 100),
        family_name: safeStr(user?.last_name, 100),
        email_address: safeStr(user?.email, 120),
        reference_id: safeStr(user?.id || "", 100),
      };

      const customerRes = await fetch(customerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Square-Version": squareVersion,
        },
        body: JSON.stringify(customerPayload),
      });

      if (customerRes.ok) {
        const customerData = await customerRes.json();
        customerId = customerData?.customer?.id;
      }
    } catch (err) {
      console.error("[/api/payment] Failed to create Square customer", err);
      // We continue with the payment even if customer creation fails
    }

    // 2) Process Payment and link to Customer
    const squareUrl = `${getSquareBaseUrl(environment)}/v2/payments`;

    const squarePayload: any = {
      source_id: sourceId,
      idempotency_key: crypto.randomUUID(),
      amount_money: {
        amount: amountCentsInt,
        currency: "USD",
      },
      location_id: locationId,
    };

    if (customerId) {
      squarePayload.customer_id = customerId;
    }

    if (user?.email) {
      squarePayload.buyer_email_address = safeStr(user.email, 120);
    }

    if (user?.first_name || user?.last_name) {
      squarePayload.note = safeStr(
        `Payment from ${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
        500,
      );

      squarePayload.billing_address = {
        first_name: safeStr(user?.first_name, 100),
        last_name: safeStr(user?.last_name, 100),
      };
    }

    const squareRes = await fetch(squareUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": squareVersion,
      },
      body: JSON.stringify(squarePayload),
      cache: "no-store",
    });

    const squareText = await squareRes.text();

    let squareData: any = null;
    try {
      squareData = squareText ? JSON.parse(squareText) : null;
    } catch {
      console.error("[/api/payment] Unable to parse Square response");
      squareData = {
        raw: squareText?.slice?.(0, 2000) || "",
      };
    }

    if (!squareRes.ok) {
      console.error("[/api/payment] Square payment failed", {
        status: squareRes.status,
      });

      return json(400, {
        success: false,
        error: getUserSafeSquareMessage(squareData),
        message: getUserSafeSquareMessage(squareData),
        square_errors: squareData?.errors || null,
      });
    }

    const payment = squareData?.payment;
    const squareStatus = safeStr(payment?.status || "", 50);

    if (!payment || !["APPROVED", "COMPLETED"].includes(squareStatus)) {
      console.error("[/api/payment] Payment not approved", {
        status: squareStatus,
      });

      return json(400, {
        success: false,
        error:
          "Your payment was not approved. Please try again or use a different card.",
        message:
          "Your payment was not approved. Please try again or use a different card.",
      });
    }

    let registrationSuccess = false;
    let registrationResponse: any = null;

    const amountDollars = (amountCentsInt / 100).toString();

    const phpParams = new URLSearchParams({
      action: "user-registration-one-time-square-payment",
      internal_api_secret: internalApiSecret,
      payment_status: "COMPLETED",
      order_id: safeStr(payment?.order_id || payment?.id || "", 120),
      payment_id: safeStr(payment?.id || "", 120),
      amount: amountDollars,
      currency: "USD",
      created_at: new Date().toISOString(),
      course_id,
      session_id,
      package_id,
      is_variant: String(is_variant),
      payment_source_type: "CARD",

      first_name: safeStr(user?.first_name ?? "", 80),
      last_name: safeStr(user?.last_name ?? "", 80),
      email: safeStr(user?.email ?? "", 120),
      mobile: safeStr(user?.mobile ?? "", 40),
      password: safeStr(user?.password ?? "", 200),
      user_id: resolvedUserId,
      auth_token: auth_token,

      // Referral Data
      ref_code: safeStr(ref_code, 50),
      ref_type: safeStr(ref_type, 50),
    });

    try {
      const phpRes = await fetch(phpApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json,text/plain,*/*",
          ...(internalApiSecret ? { "X-ASVAB-SECRET": internalApiSecret } : {}),
        },
        body: phpParams.toString(),
        cache: "no-store",
      });

      const phpText = await phpRes.text();
      registrationResponse = parsePhpJsonText(phpText);
      if (!registrationResponse) {
        console.error("[/api/payment] Unable to parse PHP response");
        registrationResponse = {
          raw: phpText?.slice?.(0, 2000) || "",
        };
      }

      registrationSuccess =
        phpRes.ok &&
        (registrationResponse?.isSuccess === true ||
          registrationResponse?.ok === true ||
          registrationResponse?.success === true ||
          registrationResponse?.status === 200);
    } catch {
      console.error("[/api/payment] PHP registration request failed");
      registrationSuccess = false;
    }

    if (!registrationSuccess) {
      const refunded = await refundSquarePayment({
        accessToken,
        environment,
        squareVersion,
        paymentId: safeStr(payment?.id || "", 120),
        amountCents: amountCentsInt,
      });

      return json(500, {
        success: false,
        error: refunded
          ? "We couldn't finish your enrollment. Your payment has been refunded. Please try again or contact support."
          : "We couldn't finish your enrollment after payment. Please contact support with your payment ID.",
        message: refunded
          ? "We couldn't finish your enrollment. Your payment has been refunded. Please try again or contact support."
          : "We couldn't finish your enrollment after payment. Please contact support with your payment ID.",
        squareStatus,
        payment_id: payment?.id || "",
        paymentId: payment?.id || "",
        registrationSuccess: false,
        refunded,
      });
    }

    return json(200, {
      success: true,
      error: "",
      message: "Payment successful! Your enrollment is complete.",
      squareStatus,
      payment_id: payment?.id || "",
      paymentId: payment?.id || "",
      registrationSuccess: true,
      course_id: registrationResponse?.course_id ?? courseCheck.course_id,
      php: registrationResponse,
    });
  } catch {
    console.error("[/api/payment] Fatal error");

    return json(500, {
      success: false,
      error:
        "We couldn't process your payment right now. Please try again in a moment.",
      message:
        "We couldn't process your payment right now. Please try again in a moment.",
    });
  }
}
