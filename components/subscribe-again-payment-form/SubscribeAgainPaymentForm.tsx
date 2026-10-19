// components\subscribe-again-payment-form\SubscribeAgainPaymentForm.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    Square?: any;
  }
}

type Props = {
  amount: number; // cents
  course_id: string;

  user_id: string;
  auth_token: string;

  plan_variation_id: string;
  return_url: string;

  disabled?: boolean;

  agreeTerms?: boolean;
  onAgreeTermsChange?: (next: boolean) => void;

  onSuccess?: (subscriptionId?: string) => void;
  onError?: (message: string) => void;
};

let squareScriptPromise: Promise<void> | null = null;

function mask(v: string, a = 6, b = 4) {
  v = String(v || "");
  if (!v) return "";
  if (v.length <= a + b) return "*".repeat(v.length);
  return `${v.slice(0, a)}***${v.slice(-b)}`;
}

function loadSquareScriptOnce(src: string): Promise<void> {
  if (squareScriptPromise) return squareScriptPromise;

  squareScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      "square-js",
    ) as HTMLScriptElement | null;

    if (existing?.dataset.loaded === "1") return resolve();

    if (existing) {
      const onLoad = () => {
        existing.dataset.loaded = "1";
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Failed to load Square JS"));
      };
      const cleanup = () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
      };

      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onError);
      return;
    }

    const script = document.createElement("script");
    script.id = "square-js";
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";

    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Square JS"));

    document.body.appendChild(script);
  });

  return squareScriptPromise;
}

async function waitForWindowSquare(maxMs = 10_000): Promise<boolean> {
  const start = Date.now();
  while (!window.Square && Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 120));
  }
  return !!window.Square;
}

function pickSubscriptionId(data: any): string {
  return (
    String(data?.subscription_id || "").trim() ||
    String(data?.subscriptionId || "").trim() ||
    String(data?.id || "").trim()
  );
}

export default function SubscribeAgainPaymentForm({
  amount,
  course_id,
  user_id,
  auth_token,
  plan_variation_id,
  return_url,
  disabled = false,
  agreeTerms,
  onAgreeTermsChange,
  onSuccess,
  onError,
}: Props) {
  const cardContainerRef = useRef<HTMLDivElement | null>(null);
  const cardInstanceRef = useRef<any>(null);
  const initSeqRef = useRef(0);

  const [initializing, setInitializing] = useState(true);
  const [paying, setPaying] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string>("");

  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

  const squareScriptSrc = useMemo(() => {
    const isSandbox = (appId || "").startsWith("sandbox-");
    return isSandbox
      ? "https://sandbox.web.squarecdn.com/v1/square.js"
      : "https://web.squarecdn.com/v1/square.js";
  }, [appId]);

  const displayAmount = useMemo(
    () => (Number(amount || 0) / 100).toFixed(2),
    [amount],
  );

  const termsRequired = typeof agreeTerms === "boolean";
  const termsAgreed = termsRequired ? !!agreeTerms : true;

  const missingInfo = useMemo(() => {
    if (!auth_token) return "Missing auth token.";
    if (!user_id) return "Missing user id.";
    if (!course_id) return "Missing course id.";
    if (!plan_variation_id) return "Missing plan_variation_id (Square plan).";
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0)
      return "Invalid amount.";
    return "";
  }, [auth_token, user_id, course_id, plan_variation_id, amount]);

  const canSubmit = useMemo(() => {
    if (disabled) return false;
    if (completed) return false;
    if (initializing) return false;
    if (paying) return false;
    if (!termsAgreed) return false;
    if (missingInfo) return false;
    return true;
  }, [disabled, completed, initializing, paying, termsAgreed, missingInfo]);

  // Init Square card form
  useEffect(() => {
    let cancelled = false;
    const seq = ++initSeqRef.current;

    const init = async () => {
      try {
        setInitializing(true);
        setMessage(null);

        if (!appId || !locationId) {
          setMessage("Payment is not configured correctly.");
          return;
        }

        await loadSquareScriptOnce(squareScriptSrc);

        const ok = await waitForWindowSquare(10_000);
        if (!ok) {
          setMessage("Unable to load payment form. Please refresh the page.");
          return;
        }

        if (!cardContainerRef.current) {
          setMessage("Card container not found.");
          return;
        }

        // Cancelled or stale init
        if (cancelled || initSeqRef.current !== seq) return;

        // Destroy previous instance if any
        try {
          if (cardInstanceRef.current) {
            await cardInstanceRef.current.destroy();
            cardInstanceRef.current = null;
          }
        } catch {
          // ignore
        }

        cardContainerRef.current.innerHTML = "";

        const payments = window.Square!.payments(appId, locationId);
        const card = await payments.card();

        if (cancelled || initSeqRef.current !== seq) {
          await card.destroy();
          return;
        }

        await card.attach(cardContainerRef.current);
        cardInstanceRef.current = card;

        // If plan_variation_id missing, show a helpful hint (page might already block)
        if (String(plan_variation_id || "").trim() === "") {
          setMessage("This package is not linked to a Square plan yet.");
        }
      } catch (err: any) {
        console.error("Square init error:", err);
        setMessage(err?.message || "Failed to initialize payment.");
      } finally {
        if (!cancelled && initSeqRef.current === seq) setInitializing(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      (async () => {
        try {
          if (cardInstanceRef.current) {
            await cardInstanceRef.current.destroy();
            cardInstanceRef.current = null;
          }
          if (cardContainerRef.current) {
            cardContainerRef.current.innerHTML = "";
          }
        } catch {
          // ignore
        }
      })();
    };
  }, [appId, locationId, squareScriptSrc, plan_variation_id]);

  const handleSubscribe = async () => {
    if (!canSubmit) {
      const msg =
        missingInfo ||
        (termsRequired && !termsAgreed
          ? "Please agree to the terms to continue."
          : "");
      if (msg) setMessage(msg);
      return;
    }

    if (!cardInstanceRef.current) {
      const msg = "Payment form not ready. Please refresh the page.";
      setMessage(msg);
      onError?.(msg);
      return;
    }

    setPaying(true);
    setMessage(null);

    try {
      // Tokenize card (kept for logs / future payment; subscriptions creation currently uses customer+plan)
      const tokenizeResult = await cardInstanceRef.current.tokenize();

      if (tokenizeResult?.status !== "OK") {
        const msg =
          tokenizeResult?.errors?.[0]?.message ||
          "Card details could not be verified. Please try again.";
        setMessage(msg);
        onError?.(msg);
        return;
      }

      const sourceId = String(tokenizeResult.token || "").trim();

      // console.log("➡️ subscribe-again POST", {
      //   user_id,
      //   course_id,
      //   plan_variation_id: mask(plan_variation_id),
      //   amount,
      //   sourceId: mask(sourceId),
      //   auth_token: mask(auth_token),
      // });

      const res = await fetch("/api/subscribe-again", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          sourceId,
          auth_token,
          user_id,
          course_id,
          plan_variation_id,
          amount,
          return_url,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // console.log("⬅️ subscribe-again POST response", {
      //   http_ok: res.ok,
      //   status: res.status,
      //   data,
      // });

      if (!res.ok || !data?.ok) {
        const msg = String(
          data?.message || "Subscription failed. Please try again.",
        );
        setMessage(msg);
        onError?.(msg);
        return;
      }

      const id = pickSubscriptionId(data);

      setCompleted(true);
      if (id) {
        setSubscriptionId(id);
        onSuccess?.(id);
      }

      setMessage(
        "✅ Subscription created. Your access will activate once payment is confirmed.",
      );

      // Redirect
      const back =
        String(data?.back_to_portal || "").trim() ||
        String(return_url || "").trim();
      if (back) window.location.href = back;
    } catch (err: any) {
      console.error("Subscribe error:", err);
      const msg = err?.message || "Error while processing payment.";
      setMessage(msg);
      onError?.(msg);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div>
      {/* Card UI */}
      <div
        ref={cardContainerRef}
        className="border p-3 rounded bg-white"
        style={{ minHeight: 56 }}
      />

      {/* Terms */}
      {termsRequired && (
        <div className="mt-3">
          <label className="d-flex align-items-center gap-2 small mb-0">
            <input
              type="radio"
              name="agree_terms"
              checked={!!agreeTerms}
              onChange={() => onAgreeTermsChange?.(true)}
              disabled={paying || disabled || completed}
            />
            <span>
              Agree{" "}
              <a
                href="/terms-of-service"
                className="text-decoration-underline"
                style={{ color: "#0573e6" }}
                target="_blank"
                rel="noreferrer"
              >
                Terms &amp; Conditions
              </a>
            </span>
          </label>

          {!termsAgreed && (
            <div className="small text-muted mt-2">
              Please agree to enable the button.
            </div>
          )}
        </div>
      )}

      {/* Button */}
      <div className="mt-4 d-flex align-items-center justify-content-center gap-3">
        <button
          className="btn btn-primary-custom px-5 py-2"
          onClick={handleSubscribe}
          disabled={!canSubmit}
          type="button"
        >
          {completed
            ? "Subscribed"
            : initializing
              ? "Loading…"
              : paying
                ? "Processing…"
                : "Subscribe"}
        </button>

        {/* Sub ID */}
        {completed && subscriptionId && (
          <div className="small text-muted">
            <span className="fw-semibold">Subscription ID:</span>{" "}
            {subscriptionId}
          </div>
        )}
      </div>

      {/* Messages */}
      {missingInfo && !message && (
        <p
          className="mt-3 fw-bold text-center"
          style={{ color: "#8a5a00", fontSize: "13px" }}
        >
          {missingInfo}
        </p>
      )}

      {message && (
        <p
          className="mt-4 fw-bold text-center"
          style={{ color: "#686868ff", fontSize: "13px" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
