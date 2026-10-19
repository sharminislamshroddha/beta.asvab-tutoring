// components/square-payment-form/SquarePaymentForm.tsx
"use client";

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { parsePhpJsonText } from "@/lib/php-json";

declare global {
  interface Window {
    Square?: any;
  }
}

type User = {
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string;
  password?: string;
  user_id?: string;
  id?: string;
};

type PaymentMode = "one_time" | "subscription";
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

export type CardState = {
  initializing: boolean;
  paying: boolean;
  completed: boolean;
  message: string | null;
  paymentId: string;
  isCardValid: boolean;
};

export type SquarePaymentFormHandle = {
  submitPayment: () => Promise<void>;
};

type Props = {
  amount: number; // cents
  course_id: string;
  session_id: string;
  package_id: string;
  user: User;
  is_variant?: 0 | 1;

  mode?: PaymentMode;
  product?: Product;
  cadence?: Cadence;
  isExistingUser?: boolean;
  auth_token?: string;

  onPaymentSuccess?: (paymentId?: string) => void;
  onStateChange?: (state: CardState) => void;
};

function isProduct(x: unknown): x is Product {
  return (
    x === "ASVAB" ||
    x === "AFOQT" ||
    x === "ASTB" ||
    x === "SIFT" ||
    x === "OAR" ||
    x === "HESI A2" ||
    x === "ATI TEAS" ||
    x === "CNA" ||
    x === "SHSAT" ||
    x === "State Math Test Prep"
  );
}

function isCadence(x: unknown): x is Cadence {
  return x === "1M" || x === "3M" || x === "6M" || x === "12M";
}

function safeMsg(
  v: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  const s = typeof v === "string" ? v : "";
  const trimmed = s.trim();
  if (!trimmed || trimmed.length > 160) return fallback;
  return trimmed;
}

const squareScriptPromises = new Map<string, Promise<void>>();

function loadSquareScriptOnce(src: string): Promise<void> {
  const existingPromise = squareScriptPromises.get(src);
  if (existingPromise) return existingPromise;

  const p = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      "square-js",
    ) as HTMLScriptElement | null;

    const markLoaded = (el: HTMLScriptElement) => {
      el.dataset.loaded = "1";
      el.dataset.src = src;
    };

    if (
      existing?.dataset.loaded === "1" &&
      (existing.dataset.src || existing.src) === src
    ) {
      return resolve();
    }

    if (existing && (existing.dataset.src || existing.src) !== src) {
      try {
        existing.remove();
      } catch {
        // ignore
      }
    }

    const script = document.createElement("script");
    script.id = "square-js";
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.loaded = "0";
    script.dataset.src = src;

    const onLoad = () => {
      markLoaded(script);
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Failed to load Square payments library."));
    };

    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);

    document.body.appendChild(script);
  });

  squareScriptPromises.set(src, p);
  return p;
}

async function waitForWindowSquare(maxMs = 10_000): Promise<boolean> {
  const start = Date.now();
  while (!window.Square && Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 100));
  }
  return !!window.Square;
}

async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  const parsed = parsePhpJsonText<Record<string, unknown>>(text);
  if (parsed && typeof parsed === "object") return parsed;

  return {
    success: false,
    error: "We received an unexpected response from the server.",
  };
}

const SquarePaymentForm = forwardRef<SquarePaymentFormHandle, Props>(
  function SquarePaymentForm(
    {
      amount,
      course_id,
      session_id,
      package_id,
      user,
      is_variant = 0,
      mode = "one_time",
      product,
      cadence,
      isExistingUser = false,
      auth_token = "",
      onPaymentSuccess,
      onStateChange,
    }: Props,
    ref,
  ) {
    const cardContainerRef = useRef<HTMLDivElement | null>(null);
    const cardInstanceRef = useRef<any>(null);

    const initTokenRef = useRef(0);
    const mountedRef = useRef(false);

    const [initializing, setInitializing] = useState(true);
    const [paying, setPaying] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [paymentId, setPaymentId] = useState<string>("");
    const [cardFieldsValidity, setCardFieldsValidity] = useState({
      cardNumber: false,
      cvv: false,
      expirationDate: false,
      postalCode: false,
    });
    const isCardValid = Object.values(cardFieldsValidity).every(Boolean);

    const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || "";
    const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";

    const squareScriptSrc =
      process.env.NEXT_PUBLIC_SQUARE_SCRIPT_URL ||
      "https://sandbox.web.squarecdn.com/v1/square.js";

    const stateRef = useRef<CardState>({
      initializing: true,
      paying: false,
      completed: false,
      message: null,
      paymentId: "",
      isCardValid: false,
    });

    useEffect(() => {
      const newState = {
        initializing,
        paying,
        completed,
        message,
        paymentId,
        isCardValid,
      };
      const oldState = stateRef.current;

      let changed = false;
      if (newState.initializing !== oldState.initializing) changed = true;
      if (newState.paying !== oldState.paying) changed = true;
      if (newState.completed !== oldState.completed) changed = true;
      if (newState.message !== oldState.message) changed = true;
      if (newState.paymentId !== oldState.paymentId) changed = true;
      if (newState.isCardValid !== oldState.isCardValid) changed = true;

      if (changed) {
        stateRef.current = newState;
        onStateChange?.(newState);
      }
    }, [
      initializing,
      paying,
      completed,
      message,
      paymentId,
      isCardValid,
      onStateChange,
    ]);

    const validateUser = () => {
      const required: (keyof User)[] = ["first_name", "last_name", "email"];
      if (!isExistingUser) {
        required.push("mobile", "password");
      }
      for (const k of required) {
        if (!user?.[k] || String(user[k]).trim().length === 0) return false;
      }
      return true;
    };

    const validateSubscriptionSelection = () => {
      if (mode !== "subscription") return true;
      return isProduct(product) && isCadence(cadence);
    };

    const pickId = (data: any): string => {
      return (
        data?.paymentId ||
        data?.payment_id ||
        data?.id ||
        data?.subscriptionId ||
        data?.subscription_id ||
        ""
      );
    };

    useEffect(() => {
      mountedRef.current = true;

      let cancelled = false;
      const myToken = ++initTokenRef.current;

      const setSafe = (fn: () => void) => {
        if (
          !cancelled &&
          mountedRef.current &&
          initTokenRef.current === myToken
        )
          fn();
      };

      const cleanupCard = async () => {
        try {
          if (cardInstanceRef.current) {
            await cardInstanceRef.current.destroy();
            cardInstanceRef.current = null;
          }
        } catch {
          // silent cleanup
        }

        if (cardContainerRef.current) {
          cardContainerRef.current.innerHTML = "";
        }

        setSafe(() =>
          setCardFieldsValidity({
            cardNumber: false,
            cvv: false,
            expirationDate: false,
            postalCode: false,
          }),
        );
      };

      const init = async () => {
        setSafe(() => {
          setInitializing(true);
          setMessage(null);
        });

        if (!appId || !locationId) {
          setSafe(() =>
            setMessage(
              "Payment is currently unavailable. Please contact support.",
            ),
          );
          setSafe(() => setInitializing(false));
          return;
        }

        try {
          await loadSquareScriptOnce(squareScriptSrc);

          const ok = await waitForWindowSquare(10_000);
          if (!ok) {
            setSafe(() =>
              setMessage(
                "Unable to load the payment form. Please refresh the page and try again.",
              ),
            );
            setSafe(() => setInitializing(false));
            return;
          }

          if (!cardContainerRef.current) {
            setSafe(() =>
              setMessage(
                "Unable to display the payment form. Please refresh the page.",
              ),
            );
            setSafe(() => setInitializing(false));
            return;
          }

          if (cancelled || initTokenRef.current !== myToken) return;

          await cleanupCard();

          const payments = window.Square!.payments(appId, locationId);
          const card = await payments.card();

          if (cancelled || initTokenRef.current !== myToken) {
            await card.destroy();
            return;
          }

          await card.attach(cardContainerRef.current);
          cardInstanceRef.current = card;

          // Track card validity on every input change
          const cardEvents = [
            "cardBrandChanged",
            "errorClassAdded",
            "errorClassRemoved",
            "focusClassRemoved",
            "postalCodeChanged",
          ] as const;

          const handleCardStateChange = (event: any) => {
            const field = event?.detail?.field;
            const isFieldValid =
              event?.detail?.currentState?.isCompletelyValid ?? false;

            if (!field) return;

            setSafe(() =>
              setCardFieldsValidity((prev) => ({
                ...prev,
                [field]: isFieldValid,
              })),
            );
          };

          cardEvents.forEach((evt) => {
            card.addEventListener(evt, handleCardStateChange);
          });

          setSafe(() => setMessage(null));
        } catch (err) {
          setSafe(() =>
            setMessage(
              "We could not initialize the payment form. Please refresh the page and try again.",
            ),
          );
        } finally {
          setSafe(() => setInitializing(false));
        }
      };

      init();

      return () => {
        cancelled = true;
        mountedRef.current = false;

        (async () => {
          try {
            if (cardInstanceRef.current) {
              await cardInstanceRef.current.destroy();
              cardInstanceRef.current = null;
            }
            if (cardContainerRef.current)
              cardContainerRef.current.innerHTML = "";
          } catch {
            // silent cleanup
          }
        })();
      };
    }, [appId, locationId, squareScriptSrc]);

    const handlePayment = async () => {
      if (completed || paying) return;

      if (!cardInstanceRef.current) {
        setMessage(
          "The payment form is not ready yet. Please wait a moment and try again.",
        );
        return;
      }

      if (!validateUser()) {
        setMessage(
          "Please complete all required registration fields before continuing.",
        );
        return;
      }

      if (!course_id || !session_id || !package_id) {
        setMessage(
          "Some checkout inzation is missing. Please return to the course page and try again.",
        );
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        setMessage(
          "The payment amount is invalid. Please return to the course page and try again.",
        );
        return;
      }

      if (mode === "subscription" && !validateSubscriptionSelection()) {
        setMessage(
          "The subscription details are invalid. Please reopen the checkout page.",
        );
        return;
      }

      setPaying(true);
      setMessage(null);

      const controller = new AbortController();

      try {
        const tokenizeResult = await cardInstanceRef.current.tokenize();

        if (tokenizeResult?.status !== "OK") {
          const sqErr =
            tokenizeResult?.errors?.[0]?.message ||
            tokenizeResult?.errors?.[0]?.detail ||
            "Please check your card details and try again.";

          setMessage(
            safeMsg(
              sqErr,
              "We could not verify your card details. Please check them and try again.",
            ),
          );
          return;
        }

        const sourceId: string = tokenizeResult.token;

        if (mode === "subscription") {
          const res = await fetch("/api/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceId,
              product,
              cadence,
              userEmail: user.email,
              userName: `${user.first_name} ${user.last_name}`.trim(),
              password: user.password,
              mobile: user.mobile,
              amount,
              course_id,
              session_id,
              package_id,
              is_variant,
              isExistingUser,
              user_id: user.user_id || user.id || "",
              auth_token: auth_token || "",
            }),
            signal: controller.signal,
          });

          const data = await readJsonSafe(res);

          if (!res.ok || !data?.success) {
            setMessage(
              safeMsg(
                data?.error,
                "We could not create your subscription. Please try again.",
              ),
            );
            return;
          }

          const id = pickId(data);
          setCompleted(true);
          if (id) setPaymentId(id);
          onPaymentSuccess?.(id);

          setMessage("Subscription created successfully.");
          return;
        }

        // console.log(course_id);
        // console.log(session_id);
        // console.log(package_id);

        const res = await fetch("/api/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceId,
            amount,
            course_id,
            session_id,
            package_id,
            is_variant,
            isExistingUser,
            user_id: user.user_id || user.id || "",
            auth_token: auth_token || "",
            user,
          }),
          signal: controller.signal,
        });

        const data = await readJsonSafe(res);

        if (!res.ok || !data?.success) {
          setMessage(
            safeMsg(
              data?.error,
              "Your payment could not be completed. Please try again.",
            ),
          );
          return;
        }

        const id = pickId(data);

        setCompleted(true);
        if (id) setPaymentId(id);
        onPaymentSuccess?.(id);

        setMessage(
          data?.registrationSuccess
            ? "Payment and enrollment completed successfully."
            : "Payment completed successfully.",
        );
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setMessage(
          "There was a problem processing your payment. Please try again.",
        );
      } finally {
        controller.abort();
        setPaying(false);
      }
    };

    useImperativeHandle(ref, () => ({
      submitPayment: handlePayment,
    }));

    return (
      <div className="border p-3 rounded bg-white position-relative">
        {initializing && (
          <div
            className="d-flex justify-content-center align-items-center position-absolute w-100 h-100 start-0 top-0 bg-white"
            style={{ zIndex: 10, borderRadius: "inherit" }}
          >
            <div
              className="spinner-border spinner-border-sm"
              style={{ color: "#f2a155" }}
              role="status"
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <span className="ms-2 small text-muted">
              Loading secure form...
            </span>
          </div>
        )}
        <div
          ref={cardContainerRef}
          style={{ minHeight: 56, marginBottom: -24 }}
        ></div>
        <div className="small text-muted text-center mt-3">
          Secure payment • PCI compliant
        </div>
      </div>
    );
  },
);

export default SquarePaymentForm;
