//app/checkout/CheckoutContent.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SquarePaymentForm, {
  SquarePaymentFormHandle,
  CardState,
} from "@/components/square-payment-form/SquarePaymentForm";
import Image from "next/image";
import NextStepCard from "@/components/next-step-card/NextStepCard";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import { sanitizeMobileInput } from "@/lib/sanitize-mobile-input";

import { convertCourseIdToProduct } from "@/lib/package-utils";
import type { CheckoutPackageSummaryData } from "@/lib/checkout-package-info";
import CheckoutPackageSummary from "@/components/checkout/CheckoutPackageSummary";
import CourseVariantGradeSelect from "@/components/checkout/CourseVariantGradeSelect";
import {
  courseRequiresGradeSelection,
  getPreselectedCheckoutGrade,
  isSelectedCheckoutGradeAllowed,
  resolvePaymentCourseIdentity,
  type CheckoutVariantInfo,
} from "@/lib/course-variants";
import { useAuth } from "@/components/auth/AuthProvider";
import { parsePhpJsonText } from "@/lib/php-json";

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

type PaymentMethod = "mobile" | "card";

type EmailCheckResult = {
  exists: boolean | null;
  message: string;
};

function isProduct(x: any): x is Product {
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

function isCadence(x: any): x is Cadence {
  return x === "1M" || x === "3M" || x === "6M" || x === "12M";
}

function isMode(x: any): x is PaymentMode {
  return x === "one_time" || x === "subscription";
}

function inferProductFromCourseId(courseId: string): Product | "" {
  const fromId = convertCourseIdToProduct(courseId);
  if (fromId && isProduct(fromId)) return fromId;

  const s = (courseId || "").toLowerCase();
  if (s.includes("asvab")) return "ASVAB";
  if (s.includes("afoqt")) return "AFOQT";
  if (s.includes("astb")) return "ASTB";
  if (s.includes("sift")) return "SIFT";
  if (s.includes("oar")) return "OAR";
  if (s.includes("hesi")) return "HESI A2";
  if (s.includes("teas")) return "ATI TEAS";
  if (s.includes("cna")) return "CNA";
  if (s.includes("shsat")) return "SHSAT";
  if (s.includes("state-math-test-prep") || s === "60") return "State Math Test Prep";
  return "";
}

function cadenceLabel(c: Cadence) {
  switch (c) {
    case "1M":
      return "Monthly";
    case "3M":
      return "Quarterly";
    case "6M":
      return "Every 6 months";
    case "12M":
      return "Yearly";
    default:
      return c;
  }
}

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function looksLikeEmail(email: string) {
  const e = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

export default function CheckoutContent({
  packageSummary = null,
  variantInfo = null,
}: {
  packageSummary?: CheckoutPackageSummaryData | null;
  variantInfo?: CheckoutVariantInfo | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const API_URL = process.env.NEXT_PUBLIC_PHP_API_URL!;
  const EMAIL_CHECK_ACTION = "check-email";

  const course_id = searchParams.get("course_id") || "";
  const session_id = searchParams.get("session_id") || "";
  const package_id = searchParams.get("package_id") || "";
  const requiresGrade = courseRequiresGradeSelection(variantInfo);
  const gradeLockedFromUrl = getPreselectedCheckoutGrade(
    variantInfo,
    searchParams.get("main_course_id"),
  );
  const [selectedGradeMainId, setSelectedGradeMainId] =
    useState(gradeLockedFromUrl);
  const [showGradeError, setShowGradeError] = useState(false);

  const paymentIdentity = useMemo(
    () =>
      resolvePaymentCourseIdentity({
        parentCourseId: course_id,
        selectedGradeMainId: isSelectedCheckoutGradeAllowed(
          variantInfo,
          selectedGradeMainId,
        )
          ? selectedGradeMainId
          : "",
        requiresGrade,
      }),
    [course_id, selectedGradeMainId, requiresGrade, variantInfo],
  );

  // Trust server-derived variant metadata, not URL query params.
  const is_variant = paymentIdentity.is_variant;
  const paymentCourseId = requiresGrade
    ? paymentIdentity.course_id
    : course_id;

  const amountCents = useMemo(() => {
    const raw = searchParams.get("amount") ?? "0";
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : NaN;
  }, [searchParams]);

  const amountDollarsForUI = useMemo(() => {
    if (!Number.isFinite(amountCents)) return 0;
    return amountCents / 100;
  }, [amountCents]);

  const mode: PaymentMode = useMemo(() => {
    const q = searchParams.get("mode");
    if (isMode(q)) return q;
    return "one_time";
  }, [searchParams]);

  const product: Product = useMemo(() => {
    const q = searchParams.get("product");
    if (isProduct(q)) return q;
    const inferred = inferProductFromCourseId(course_id);
    return inferred || "ASVAB";
  }, [searchParams, course_id]);

  const cadence: Cadence = useMemo(() => {
    const q = searchParams.get("cadence");
    if (isCadence(q)) return q;
    return "1M";
  }, [searchParams]);

  const { user: sessionUser, authToken: sessionToken, loaded: authReady } =
    useAuth();

  const [user, setUser] = useState({
    first_name: sessionUser?.first_name || "",
    last_name: sessionUser?.last_name || "",
    email: sessionUser?.email || "",
    mobile: "",
    password: "",
    confirm_password: "",
    user_id: sessionUser ? String(sessionUser.user_id) : "",
  });

  const [authToken, setAuthToken] = useState(sessionToken ?? "");
  const [authLoaded, setAuthLoaded] = useState(authReady);
  const isAuthenticated = !!authToken && !!user.user_id;

  useEffect(() => {
    if (!authReady) return;
    if (sessionUser && sessionToken) {
      setAuthToken(sessionToken);
      setUser((prev) => ({
        ...prev,
        first_name: String(sessionUser.first_name || ""),
        last_name: String(sessionUser.last_name || ""),
        email: String(sessionUser.email || ""),
        user_id: String(sessionUser.user_id || ""),
      }));
    }
    setAuthLoaded(true);
  }, [authReady, sessionUser, sessionToken]);

  const [fieldErrors, setFieldErrors] = useState({
    first_name: "",
    last_name: "",
    mobile: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const validateFirstName = (firstName: string) => {
    if (!firstName.trim()) return "First name is required.";
    return "";
  };

  const validateLastName = (lastName: string) => {
    if (!lastName.trim()) return "Last name is required.";
    return "";
  };

  const validateMobile = (mobile: string) => {
    const digits = mobile.replace(/\D/g, "");
    if (digits.length === 0) return "Mobile number is required.";
    if (digits.length !== 10) return "Enter a valid 10-digit US number.";
    if (/^(\d)\1{9}$/.test(digits)) return "Enter a valid US number."; // All same digits
    if (digits[0] === "0" || digits[0] === "1")
      return "Area code cannot start with 0 or 1.";
    if (digits[3] === "0" || digits[3] === "1")
      return "Exchange code cannot start with 0 or 1.";
    return "";
  };

  const validateConfirmPassword = (confirm: string, pass: string) => {
    if (!confirm) return "Please confirm your password.";
    if (confirm !== pass) return "Passwords do not match.";
    return "";
  };

  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [emailCheckMsg, setEmailCheckMsg] = useState<string>("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [lastCheckedEmail, setLastCheckedEmail] = useState<string>("");
  const emailCheckNonceRef = useRef<number>(0);
  const lastCheckedEmailRef = useRef<string>("");
  const emailDebounceRef = useRef<number | null>(null);
  const emailCheckInFlightRef = useRef<string | null>(null);

  const clearEmailDebounce = useCallback(() => {
    if (emailDebounceRef.current) {
      window.clearTimeout(emailDebounceRef.current);
      emailDebounceRef.current = null;
    }
  }, []);

  const mobileDebounceRef = useRef<number | null>(null);

  const clearMobileDebounce = useCallback(() => {
    if (mobileDebounceRef.current) {
      window.clearTimeout(mobileDebounceRef.current);
      mobileDebounceRef.current = null;
    }
  }, []);

  const scheduleMobileValidation = useCallback(
    (mobile: string, immediate = false) => {
      clearMobileDebounce();
      const run = () => {
        setFieldErrors((prev) => ({
          ...prev,
          mobile: validateMobile(mobile),
        }));
      };
      if (immediate) {
        run();
        return;
      }
      mobileDebounceRef.current = window.setTimeout(() => {
        mobileDebounceRef.current = null;
        run();
      }, 400);
    },
    [clearMobileDebounce],
  );

  const oneOnOneArray: string[] = ["12", "14", "16", "18", "23", "28", "30"];
  const groupArray: string[] = ["15", "19", "29", "31"];
  const service = oneOnOneArray.includes(package_id)
    ? "1-on-1 Tutoring"
    : groupArray.includes(package_id)
      ? "Group Tutoring"
      : "";

  const parseEmailExistsFromResponse = (raw: string): EmailCheckResult => {
    try {
      const data = JSON.parse(raw);
      const serverMsg = data?.message || "";

      if (data?.code === "EMAIL_EXISTS") {
        return {
          exists: true,
          message: serverMsg || "This email address is already registered.",
        };
      }

      if (data?.isSuccess === true) {
        return { exists: false, message: "" };
      }

      return {
        exists: null,
        message: serverMsg || "We could not verify this email right now.",
      };
    } catch {
      const t = raw.trim().toLowerCase();
      if (t.includes("exists")) {
        return {
          exists: true,
          message: "This email address is already registered.",
        };
      }
      if (t.includes("success") || t === "0") {
        return { exists: false, message: "" };
      }
      return {
        exists: null,
        message: "We could not verify this email right now.",
      };
    }
  };

  const checkEmailExists = useCallback(
    async (emailRaw: string): Promise<EmailCheckResult> => {
      const email = normalizeEmail(emailRaw);
      if (!looksLikeEmail(email)) return { exists: null, message: "" };

      const body = new URLSearchParams();
      body.append("action", EMAIL_CHECK_ACTION);
      body.append("email", email);
      if (course_id) body.append("course_id", String(course_id));
      if (session_id) body.append("session_id", String(session_id));

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        const raw = await res.text();
        return parseEmailExistsFromResponse(raw);
      } catch {
        return {
          exists: null,
          message: "Unable to check email right now. Please try again.",
        };
      }
    },
    [API_URL, course_id, session_id],
  );

  const runEmailCheck = useCallback(
    async (emailRaw: string) => {
      const email = normalizeEmail(emailRaw);

      if (!looksLikeEmail(email)) {
        setEmailChecking(false);
        setEmailExists(false);
        setEmailCheckMsg("Please enter a valid email address.");
        setLastCheckedEmail("");
        lastCheckedEmailRef.current = "";
        return;
      }

      if (
        email === lastCheckedEmailRef.current ||
        email === emailCheckInFlightRef.current
      ) {
        return;
      }

      const nonce = Date.now();
      emailCheckNonceRef.current = nonce;
      emailCheckInFlightRef.current = email;

      setEmailChecking(true);
      setEmailCheckMsg("Checking email...");

      try {
        const result = await checkEmailExists(email);

        if (emailCheckNonceRef.current !== nonce) return;

        setLastCheckedEmail(email);
        lastCheckedEmailRef.current = email;

        if (result.exists === true) {
          setEmailExists(true);
          setEmailCheckMsg(
            result.message || "This email address is already registered.",
          );
          return;
        }

        if (result.exists === false) {
          setEmailExists(false);
          setEmailCheckMsg("");
          return;
        }

        setEmailExists(false);
        setEmailCheckMsg(
          result.message ||
            "Unable to verify email right now. Please try again.",
        );
      } catch {
        setEmailExists(false);
        setEmailCheckMsg("Unable to verify email right now. Please try again.");
      } finally {
        if (emailCheckInFlightRef.current === email) {
          emailCheckInFlightRef.current = null;
        }
        setEmailChecking(false);
      }
    },
    [checkEmailExists],
  );

  useEffect(() => {
    const email = normalizeEmail(user.email);
    if (!emailTouched) return;

    if (!email) {
      clearEmailDebounce();
      setEmailCheckMsg(
        emailBlurred ? "Email address is required." : "",
      );
      setEmailExists(false);
      return;
    }

    if (email === lastCheckedEmailRef.current) return;

    clearEmailDebounce();
    emailDebounceRef.current = window.setTimeout(() => {
      emailDebounceRef.current = null;
      void runEmailCheck(user.email);
    }, 650);

    return clearEmailDebounce;
  }, [user.email, emailTouched, emailBlurred, runEmailCheck, clearEmailDebounce]);

  useEffect(() => () => clearMobileDebounce(), [clearMobileDebounce]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "mobile") {
      const cleaned = sanitizeMobileInput(value, user.mobile);
      if (cleaned === null) return;
      setUser((prev) => ({ ...prev, [name]: cleaned }));
      setFieldErrors((prev) => ({ ...prev, mobile: "" }));
      scheduleMobileValidation(cleaned);
    } else if (name === "first_name") {
      setUser((prev) => ({ ...prev, [name]: value }));
      setFieldErrors((prev) => ({ ...prev, first_name: "" }));
    } else if (name === "last_name") {
      setUser((prev) => ({ ...prev, [name]: value }));
      setFieldErrors((prev) => ({ ...prev, last_name: "" }));
    } else if (name === "email") {
      setUser((prev) => ({ ...prev, [name]: value }));
      setEmailExists(false);
      setEmailCheckMsg("");
      setEmailBlurred(false);
      setLastCheckedEmail("");
      lastCheckedEmailRef.current = "";
    } else if (name === "confirm_password") {
      setUser((prev) => ({ ...prev, [name]: value }));
      // Active validation for password match
      setFieldErrors((prev) => ({
        ...prev,
        confirm_password: validateConfirmPassword(value, user.password),
      }));
    } else if (name === "password") {
      setUser((prev) => ({ ...prev, [name]: value }));
      // If user is typing in password field, also re-validate confirm_password if it's not empty
      if (user.confirm_password) {
        setFieldErrors((prev) => ({
          ...prev,
          confirm_password: validateConfirmPassword(
            user.confirm_password,
            value,
          ),
        }));
      }
    } else {
      setUser((prev) => ({ ...prev, [name]: value }));
    }
  };

  const invalidBase =
    !course_id ||
    !session_id ||
    !package_id ||
    !Number.isFinite(amountCents) ||
    amountCents <= 0;

  const subscriptionInvalid =
    mode === "subscription" && (!isProduct(product) || !isCadence(cadence));

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() =>
    mode === "subscription" ? "card" : "mobile",
  );

  const squareFormRef = useRef<SquarePaymentFormHandle>(null);
  const [cardState, setCardState] = useState<CardState>({
    initializing: true,
    paying: false,
    completed: false,
    message: null,
    paymentId: "",
    isCardValid: false,
  });

  const handleCardStateChange = (state: CardState) => {
    setCardState(state);
  };

  useEffect(() => {
    if (mode === "subscription") {
      setPaymentMethod("card");
    }
  }, [mode]);

  // const [mobilePay, setMobilePay] = useState({
  //   mobile: "",
  //   ref_code: "",
  // });

  const [mobileSubmitting, setMobileSubmitting] = useState(false);
  const mobileSubmitLockRef = useRef(false);
  const [mobileResult, setMobileResult] = useState<{
    type: "success" | "danger" | "info";
    text: string;
  } | null>(null);

  // const handleMobilePayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { name, value } = e.target;
  //   setMobilePay((prev) => ({ ...prev, [name]: value }));
  // };

  const [agreeTerms, setAgreeTerms] = useState(false);

  const emailReady = useMemo(() => {
    if (isAuthenticated) return true;
    const normalized = normalizeEmail(user.email);
    if (!normalized || !looksLikeEmail(user.email)) return false;
    if (emailChecking || emailExists) return false;
    if (emailCheckMsg && emailCheckMsg !== "Checking email...") return false;
    if (normalized !== lastCheckedEmail) return false;
    return true;
  }, [
    isAuthenticated,
    user.email,
    emailChecking,
    emailExists,
    emailCheckMsg,
    lastCheckedEmail,
  ]);

  const canSubmit = useMemo(() => {
    if (isAuthenticated) {
      return (
        agreeTerms &&
        !!user.first_name.trim() &&
        !!user.last_name.trim() &&
        !!user.email.trim() &&
        !!user.user_id &&
        !!authToken &&
        !invalidBase &&
        (!requiresGrade ||
          isSelectedCheckoutGradeAllowed(variantInfo, selectedGradeMainId))
      );
    }
    return (
      agreeTerms &&
      !!user.first_name.trim() &&
      !!user.last_name.trim() &&
      emailReady &&
      !!user.mobile.trim() &&
      !!user.password.trim() &&
      !!user.confirm_password.trim() &&
      user.password === user.confirm_password &&
      !fieldErrors.first_name &&
      !fieldErrors.last_name &&
      !fieldErrors.mobile &&
      !fieldErrors.confirm_password &&
      !invalidBase &&
      (!requiresGrade ||
        isSelectedCheckoutGradeAllowed(variantInfo, selectedGradeMainId))
    );
  }, [
    isAuthenticated,
    authToken,
    agreeTerms,
    user,
    fieldErrors,
    emailReady,
    invalidBase,
    requiresGrade,
    selectedGradeMainId,
    variantInfo,
  ]);

  const submitMobilePayment = async () => {
    if (mobileSubmitLockRef.current) return;
    mobileSubmitLockRef.current = true;
    setMobileResult(null);

    const unlock = () => {
      mobileSubmitLockRef.current = false;
    };

    if (requiresGrade && !isSelectedCheckoutGradeAllowed(variantInfo, selectedGradeMainId)) {
      setShowGradeError(true);
      setMobileResult({
        type: "danger",
        text: "Please select a grade before continuing.",
      });
      unlock();
      return;
    }

    if (!agreeTerms) {
      setMobileResult({
        type: "danger",
        text: "Please agree to the Terms & Conditions to continue.",
      });
      unlock();
      return;
    }

    setEmailTouched(true);
    setEmailBlurred(true);

    if (!isAuthenticated) {
      const firstNameErr = validateFirstName(user.first_name);
      const lastNameErr = validateLastName(user.last_name);
      const mobileErr = validateMobile(user.mobile);
      const confirmErr = validateConfirmPassword(
        user.confirm_password,
        user.password,
      );

      if (!user.email.trim()) {
        setEmailCheckMsg("Email address is required.");
      }

      if (
        firstNameErr ||
        lastNameErr ||
        mobileErr ||
        confirmErr ||
        !user.email.trim()
      ) {
        setFieldErrors({
          first_name: firstNameErr,
          last_name: lastNameErr,
          mobile: mobileErr,
          confirm_password: confirmErr,
        });
        setMobileResult({
          type: "danger",
          text: "Please fix all the errors in the form before submitting.",
        });
        unlock();
        return;
      }
    }

    if (!canSubmit) {
      setMobileResult({
        type: "danger",
        text: "Please complete all required registration and mobile payment fields correctly.",
      });
      unlock();
      return;
    }

    if (!isAuthenticated) {
      if (normalizeEmail(user.email) !== lastCheckedEmail) {
        await runEmailCheck(user.email);
      }

      if (emailChecking) {
        setMobileResult({
          type: "info",
          text: "We are checking your email. Please wait a moment and try again.",
        });
        unlock();
        return;
      }

      if (emailExists) {
        setMobileResult({
          type: "danger",
          text: emailCheckMsg || "This email address is already registered.",
        });
        unlock();
        return;
      }
    }

    setMobileSubmitting(true);
    let submittedOk = false;

    try {
      const body = new URLSearchParams();
      body.append("action", "user-registration-mobile-payment");
      body.append("course_id", String(paymentCourseId));
      body.append("session_id", String(session_id));
      body.append("package_id", String(package_id));
      body.append("is_variant", String(is_variant));
      body.append("first_name", user.first_name);
      body.append("last_name", user.last_name);
      body.append("email", user.email);
      body.append("password", user.password);
      body.append("mobile", user.mobile);
      body.append("amount", String(amountCents));
      body.append("currency", "USD");
      body.append("created_at", todayYYYYMMDD());
      body.append("payment_source_type", "mobile");
      if (authToken) {
        body.append("auth_token", authToken);
        body.append("user_id", user.user_id);
      }

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      const data = parsePhpJsonText<{
        isSuccess?: boolean;
        message?: string;
        code?: string;
      }>(await res.text());

      if (!data) {
        setMobileResult({
          type: "danger",
          text: "We received an unexpected response. Please try again.",
        });
        return;
      }

      if (data?.isSuccess) {
        submittedOk = true;
        setMobileResult({
          type: "success",
          text: data?.message || "Submitted successfully.",
        });
        const q = package_id
          ? `?method=mobile&package_id=${package_id}`
          : `?method=mobile`;
        router.push(`/thank-you${q}`);
        return;
      }

      if (data?.code === "EMAIL_EXISTS") {
        setEmailExists(true);
        setEmailCheckMsg(
          data?.message || "This email address is already registered.",
        );
      }

      setMobileResult({
        type: "danger",
        text: data?.message || "Submission failed. Please try again.",
      });
    } catch {
      setMobileResult({
        type: "danger",
        text: "Network error. Please try again.",
      });
    } finally {
      if (!submittedOk) {
        mobileSubmitLockRef.current = false;
        setMobileSubmitting(false);
        if (!isAuthenticated) {
          lastCheckedEmailRef.current = "";
          void runEmailCheck(user.email);
        }
      } else {
        setMobileSubmitting(false);
      }
    }
  };

  if (invalidBase) {
    return <p className="text-danger">Invalid checkout link.</p>;
  }

  const pageTitle =
    mode === "subscription" ? "Subscription Checkout" : "Checkout";
  const pageSub =
    mode === "subscription"
      ? "Your subscription will renew automatically after 30 days."
      : "One-time payment for your selected package.";

  const TermsCheckbox = () => (
    <div className="mt-3">
      <label className="d-flex align-items-center gap-2 small mb-0">
        <input
          type="checkbox"
          name="agree_terms"
          checked={agreeTerms}
          onChange={() => setAgreeTerms((prev) => !prev)}
          className="form-check-input mb-1"
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
    </div>
  );

  const showPaymentMethodChooser = mode !== "subscription";
  const showMobileUI = showPaymentMethodChooser && paymentMethod === "mobile";
  const showCardUI = mode === "subscription" || paymentMethod === "card";
  const cardBlockedByEmail = !isAuthenticated && !emailReady;

  return (
    <div className="container pb-5" style={{ maxWidth: 1100, paddingTop: 33 }}>
      <div className="row flex-column align-items-center mb-4">
        <div className="col-12 col-lg-6">
          <h1 className="fw-bold mb-2 text-center">{pageTitle}</h1>
          <div className="fw-bold mb-2" style={{ fontSize: 24 }}>
            <span className="text-muted fw-normal" style={{ fontSize: 24 }}>
              Total:
            </span>{" "}
            ${amountDollarsForUI.toFixed(2)}
          </div>
          {mode === "subscription" && (
            <p className="text-muted small mb-1">
              Plan: <span className="fw-semibold">{product}</span> •{" "}
              <span className="fw-semibold">{cadenceLabel(cadence)}</span>
            </p>
          )}
          <p className="text-muted mb-0 small">{pageSub}</p>
        </div>
      </div>

      <div className={"row g-4 flex-column align-items-center"}>
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm border-0 w-100">
            <div className="card-body p-0 d-flex flex-column">
              <div className="px-4 border-bottom">
                <div className="checkout-tabs-container">
                  <h5 className="fw-semibold text-muted mb-0">
                    Payment Method
                  </h5>

                  {showPaymentMethodChooser ? (
                    <ul className="nav nav-tabs checkout-payment-methods">
                      <li className="nav-item">
                        <button
                          className={`nav-link tab-btn ${paymentMethod === "mobile" ? "active" : ""}`}
                          onClick={() => {
                            setAgreeTerms(false);
                            setPaymentMethod("mobile");
                          }}
                        >
                          Mobile Payment
                        </button>
                      </li>
                      <li className="nav-item">
                        <button
                          className={`nav-link tab-btn ${paymentMethod === "card" ? "active" : ""}`}
                          onClick={() => {
                            setAgreeTerms(false);
                            setPaymentMethod("card");
                          }}
                        >
                          Card Payment
                        </button>
                      </li>
                    </ul>
                  ) : (
                    <div className="small text-muted py-2">Card Payment</div>
                  )}
                </div>
              </div>

              <div className="p-4">
                {showMobileUI && (
                  <div>
                    <div className="text-center">
                      <div className="d-flex justify-content-center">
                        <Image
                          src="/images/mobile_payment_app_20260204.png"
                          alt="Mobile apps"
                          width={350}
                          height={220}
                          className="img-fluid"
                          style={{ maxWidth: 560, height: "auto" }}
                        />
                      </div>

                      <div className="mt-3">
                        <div className="fw-bold" style={{ fontSize: 18 }}>
                          Send payment to:
                        </div>
                        <div
                          className="fw-bold text-success"
                          style={{ fontSize: 20 }}
                        >
                          (718) 200-6396
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      {/* <div className="col-12">
                        <input
                          className="form-control"
                          name="mobile"
                          placeholder="Payment account number"
                          value={mobilePay.mobile}
                          onChange={handleMobilePayChange}
                        />
                      </div>

                      <div className="col-12">
                        <input
                          className="form-control"
                          name="ref_code"
                          placeholder="Reference Code"
                          value={mobilePay.ref_code}
                          onChange={handleMobilePayChange}
                        />
                      </div> */}

                      {/* <TermsCheckbox />

                      <button
                        type="button"
                        className="btn btn-primary-custom mt-4 px-5 py-2 d-block mx-auto"
                        onClick={submitMobilePayment}
                        disabled={mobileSubmitting || !canSubmit}
                      >
                        {mobileSubmitting ? "Submitting..." : "Submit"}
                      </button>

                      {mobileResult && (
                        <div
                          className={`alert alert-${mobileResult.type} mt-3 mb-0`}
                        >
                          {mobileResult.text}
                        </div>
                      )} */}
                    </div>
                  </div>
                )}

                {showCardUI && (
                  <>
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <div className="fw-semibold text-muted">
                        Card Payment Details
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <span className="badge text-bg-light border">VISA</span>
                        <span className="badge text-bg-light border">AMEX</span>
                        <span className="badge text-bg-light border">MC</span>
                        <span className="badge text-bg-light border">DISC</span>
                      </div>
                    </div>

                    <SquarePaymentForm
                      ref={squareFormRef}
                      amount={amountCents}
                      course_id={paymentCourseId}
                      session_id={session_id}
                      package_id={package_id}
                      is_variant={is_variant}
                      user={user}
                      mode={mode}
                      product={mode === "subscription" ? product : undefined}
                      cadence={mode === "subscription" ? cadence : undefined}
                      isExistingUser={isAuthenticated}
                      auth_token={authToken}
                      onPaymentSuccess={(id?: string) => {
                        let q = id
                          ? `?method=card&id=${encodeURIComponent(id)}`
                          : `?method=card`;
                        if (package_id) {
                          q += `&package_id=${package_id}`;
                        }
                        router.push(`/thank-you${q}`);
                      }}
                      onStateChange={handleCardStateChange}
                    />

                    {/* {!!user.email.trim() &&
                      (emailChecking ||
                        emailExists ||
                        !looksLikeEmail(user.email)) && (
                        <div
                          className={`alert ${emailExists || !looksLikeEmail(user.email)
                            ? "alert-danger"
                            : "alert-info"
                            } mt-3 mb-0 py-2`}
                        >
                          {emailExists
                            ? emailCheckMsg
                            : !looksLikeEmail(user.email)
                              ? "Please enter a valid email address."
                              : "Checking email... Please wait."}
                        </div>
                      )} */}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card shadow-sm border-0 w-100">
            <div className="card-body p-4 d-flex flex-column">
              <h5 className="fw-bold mb-3 text-muted">
                {isAuthenticated
                  ? "Your Account"
                  : "Your Registration Information"}
              </h5>

              {requiresGrade && (
                <CourseVariantGradeSelect
                  variants={variantInfo?.variants ?? []}
                  value={selectedGradeMainId}
                  onChange={(gradeId) => {
                    setSelectedGradeMainId(gradeId);
                    if (gradeId) setShowGradeError(false);
                  }}
                  showError={showGradeError}
                />
              )}

              {isAuthenticated ? (
                <div
                  className="mb-3 p-3 rounded"
                  style={{
                    background: "rgba(0,35,65,0.05)",
                    border: "1px solid rgba(0,35,65,0.12)",
                  }}
                >
                  <div className="fw-semibold" style={{ color: "#002341" }}>
                    Logged in as{" "}
                    {user.first_name || user.last_name
                      ? `${user.first_name} ${user.last_name}`.trim()
                      : user.email}
                  </div>
                  <div className="small text-muted mt-1">{user.email}</div>
                  {!authLoaded ? null : (
                    <div className="small text-muted mt-2">
                      Registration is not required for this purchase.
                    </div>
                  )}
                </div>
              ) : (
                <>
              <div className="mb-2">
                <input
                  className={`form-control ${fieldErrors.first_name ? "is-invalid" : ""}`}
                  name="first_name"
                  placeholder="First Name"
                  value={user.first_name}
                  onChange={handleChange}
                  onBlur={() =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      first_name: validateFirstName(user.first_name),
                    }))
                  }
                  required
                />
                {fieldErrors.first_name && (
                  <div
                    className="invalid-feedback"
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    {fieldErrors.first_name}
                  </div>
                )}
              </div>

              <div className="mb-2">
                <input
                  className={`form-control ${fieldErrors.last_name ? "is-invalid" : ""}`}
                  name="last_name"
                  placeholder="Last Name"
                  value={user.last_name}
                  onChange={handleChange}
                  onBlur={() =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      last_name: validateLastName(user.last_name),
                    }))
                  }
                  required
                />
                {fieldErrors.last_name && (
                  <div
                    className="invalid-feedback"
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    {fieldErrors.last_name}
                  </div>
                )}
              </div>

              <div className="mb-2">
                <input
                  className={`form-control ${
                    emailExists ||
                    (emailBlurred && !user.email.trim()) ||
                    (emailTouched &&
                      !!user.email.trim() &&
                      !looksLikeEmail(user.email))
                      ? "is-invalid"
                      : ""
                  }`}
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={user.email}
                  onChange={handleChange}
                  onBlur={() => {
                    setEmailTouched(true);
                    setEmailBlurred(true);
                    const email = normalizeEmail(user.email);
                    if (!email) return;
                    if (
                      email === lastCheckedEmailRef.current ||
                      email === emailCheckInFlightRef.current
                    ) {
                      return;
                    }
                    if (emailDebounceRef.current) {
                      clearEmailDebounce();
                      void runEmailCheck(user.email);
                    }
                  }}
                  onFocus={() => {
                    setEmailTouched(true);
                    setEmailBlurred(false);
                  }}
                  required
                />
              </div>

              {emailCheckMsg &&
                (emailCheckMsg === "Email address is required."
                  ? emailBlurred
                  : emailTouched || !!user.email.trim()) && (
                <div
                  className={`small mb-2 ${
                    emailExists || !looksLikeEmail(user.email)
                      ? "text-danger"
                      : "text-muted"
                  }`}
                  role={
                    emailExists || !looksLikeEmail(user.email)
                      ? "alert"
                      : undefined
                  }
                  style={{
                    fontWeight:
                      emailExists || !looksLikeEmail(user.email) ? 600 : 400,
                  }}
                >
                  {emailCheckMsg}
                </div>
              )}

              <div className="mb-2">
                <input
                  className={`form-control ${fieldErrors.mobile ? "is-invalid" : ""}`}
                  name="mobile"
                  placeholder="Mobile"
                  value={user.mobile}
                  onChange={handleChange}
                  onBlur={() => scheduleMobileValidation(user.mobile, true)}
                  required
                />
                {fieldErrors.mobile && (
                  <div
                    className="invalid-feedback"
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    {fieldErrors.mobile}
                  </div>
                )}
              </div>

              <div className="mb-2 position-relative">
                <input
                  className="form-control pe-5"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={user.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((s) => !s)}
                  className="btn btn-link p-0"
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#002341",
                    textDecoration: "none",
                  }}
                >
                  {showPassword ? (
                    <BsEyeSlash size={18} />
                  ) : (
                    <BsEye size={18} />
                  )}
                </button>
              </div>

              <div className="mb-0 position-relative">
                <input
                  className={`form-control pe-5 ${fieldErrors.confirm_password ? "is-invalid" : ""}`}
                  type={showPassword ? "text" : "password"}
                  name="confirm_password"
                  placeholder="Confirm password"
                  value={user.confirm_password}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.confirm_password && (
                  <div
                    className="invalid-feedback"
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    {fieldErrors.confirm_password}
                  </div>
                )}
              </div>

              <div className="mt-3 small text-muted">
                We’ll use your email for purchase confirmation and account
                access.
              </div>
                </>
              )}

              {mode === "subscription" && subscriptionInvalid && (
                <div className="alert alert-danger mt-3 mb-0 py-2">
                  Invalid subscription parameters.
                </div>
              )}

              <TermsCheckbox />

              {paymentMethod === "mobile" ? (
                <div>
                  <button
                    type="button"
                    className="btn btn-primary-custom mt-4 px-5 py-2 d-block mx-auto"
                    onClick={submitMobilePayment}
                    disabled={mobileSubmitting || !canSubmit}
                  >
                    {mobileSubmitting ? "Submitting..." : "Submit"}
                  </button>

                  {mobileResult && (
                    <div
                      className={`alert alert-${mobileResult.type} mt-3 mb-0`}
                    >
                      {mobileResult.text}
                    </div>
                  )}
                  <NextStepCard service={service} />
                </div>
              ) : (
                <div className="mt-3">
                  <button
                    type="button"
                    className="btn btn-primary-custom mt-2 px-5 py-2 d-block mx-auto"
                    onClick={() => {
                      if (requiresGrade && !isSelectedCheckoutGradeAllowed(variantInfo, selectedGradeMainId)) {
                        setShowGradeError(true);
                        return;
                      }
                      squareFormRef.current?.submitPayment();
                    }}
                    disabled={
                      cardState.initializing ||
                      cardState.paying ||
                      cardState.completed ||
                      subscriptionInvalid ||
                      cardBlockedByEmail ||
                      !agreeTerms ||
                      !cardState.isCardValid ||
                      !canSubmit
                    }
                  >
                    {cardState.completed
                      ? "Paid"
                      : cardState.paying
                        ? "Processing…"
                        : mode === "subscription"
                          ? "Subscribe"
                          : `Pay $${amountDollarsForUI.toFixed(2)}`}
                  </button>

                  {cardState.completed && cardState.paymentId && (
                    <div className="mt-3 text-center">
                      <div className="small text-muted">
                        <span className="fw-semibold">Payment ID:</span>{" "}
                        {cardState.paymentId}
                      </div>
                    </div>
                  )}

                  {cardState.message && (
                    <p className="mt-3 fw-bold text-center text-danger">
                      {cardState.message}
                    </p>
                  )}
                  <NextStepCard service={service} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {packageSummary ? (
        <CheckoutPackageSummary
          descriptionHtml={packageSummary.descriptionHtml}
          serviceType={packageSummary.serviceType}
        />
      ) : null}
    </div>
  );
}
