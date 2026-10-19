"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import { sanitizeMobileInput } from "@/lib/sanitize-mobile-input";
import { postPhpBrowser } from "@/lib/php-browser";
import {
  registrationSessionKey,
  type PackageSession,
  type RegistrationCourseWithServices,
} from "@/lib/php-api";
import CourseVariantGradeSelect from "@/components/checkout/CourseVariantGradeSelect";
import {
  courseRequiresGradeSelection,
  resolvePaymentCourseIdentity,
} from "@/lib/course-variants";
import {
  parseHasVariants,
  groupCoursesByCategory,
  COURSE_CATEGORY_ORDER,
  getCourseCategorySelectPrompt,
  convertCourseIdToCode,
} from "@/lib/package-utils";
import { resolvePortalLoginUrl } from "@/lib/portal-login";

type StatusType = "success" | "error" | "info";
type Status = { type: StatusType; text: string } | null;

type Course = RegistrationCourseWithServices;
type ServicesMap = Record<string, number>;
type SessionPkg = PackageSession;
type SessionsByCourseService = Record<string, SessionPkg[]>;

async function postForm(body: Record<string, string>) {
  return postPhpBrowser(body);
}

function moneyUsd(price: string) {
  const n = Number(price);
  return Number.isFinite(n) ? n.toFixed(2) : price;
}

type EmailCheckResult = {
  exists: boolean | null;
  message: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function looksLikeEmail(email: string) {
  const e = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

function parseEmailExistsFromResponse(data: unknown): EmailCheckResult {
  if (data && typeof data === "object") {
    const payload = data as {
      code?: string;
      message?: string;
      isSuccess?: boolean;
    };
    const serverMsg = payload.message || "";

    if (payload.code === "EMAIL_EXISTS") {
      return {
        exists: true,
        message: serverMsg || "This email address is already registered.",
      };
    }

    if (payload.isSuccess === true) {
      return { exists: false, message: "" };
    }

    return {
      exists: null,
      message: serverMsg || "We could not verify this email right now.",
    };
  }

  return {
    exists: null,
    message: "We could not verify this email right now.",
  };
}

type Props = {
  initialCourses?: Course[];
  initialServices?: ServicesMap;
  initialSessionsByCourseService?: SessionsByCourseService;
};

export default function RegisterForm({
  initialCourses = [],
  initialServices = {},
  initialSessionsByCourseService = {},
}: Props) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    password: "",
    confirm_password: "",
  });

  const [courses] = useState<Course[]>(initialCourses);
  const [servicesMap] = useState<ServicesMap>(initialServices);
  const [sessionsByCourseService] = useState<SessionsByCourseService>(
    initialSessionsByCourseService,
  );

  const [courseId, setCourseId] = useState("");
  const [serviceType, setServiceType] = useState(""); // "0" | "1"
  const [sessionId, setSessionId] = useState("");
  const [selectedGradeMainId, setSelectedGradeMainId] = useState("");
  const [showGradeError, setShowGradeError] = useState(false);

  const [purchaseStatus, setPurchaseStatus] = useState<"not_purchased" | "already_purchased">("already_purchased");
  const hasPurchase = purchaseStatus === "already_purchased";

  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [fieldErrors, setFieldErrors] = useState({
    first_name: "",
    last_name: "",
    mobile: "",
    confirm_password: "",
  });

  const EMAIL_CHECK_ACTION = "check-email";
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

  const selectedCourse = useMemo(
    () => courses.find((c) => c.course_id === courseId) || null,
    [courses, courseId],
  );

  const groupedRegistrationCourses = useMemo(() => {
    const grouped = groupCoursesByCategory(
      courses.map((course) => ({
        ...course,
        course_code:
          course.course_code || convertCourseIdToCode(course.course_id),
      })),
    );

    return COURSE_CATEGORY_ORDER.map((category) => ({
      category,
      items:
        category === "military test prep"
          ? grouped.militaryTestPrep
          : category === "healthcare test prep"
            ? grouped.healthcareTestPrep
            : grouped.academicTestPrep,
    })).filter((group) => group.items.length > 0);
  }, [courses]);

  const requiresGrade = courseRequiresGradeSelection({
    has_variants: parseHasVariants(selectedCourse?.has_variants),
    variants: selectedCourse?.variants ?? [],
  });

  const paymentIdentity = useMemo(
    () =>
      resolvePaymentCourseIdentity({
        parentCourseId: courseId,
        selectedGradeMainId,
        requiresGrade,
      }),
    [courseId, selectedGradeMainId, requiresGrade],
  );

  const servicesOptions = useMemo(() => {
    const available = selectedCourse?.availableServiceTypes ?? [];
    return Object.entries(servicesMap)
      .map(([label, value]) => ({ label, value: String(value) }))
      .filter((s) => available.includes(s.value))
      .sort((a, b) => Number(a.value) - Number(b.value));
  }, [servicesMap, selectedCourse]);

  const sessions = useMemo(() => {
    if (!courseId || serviceType === "") return [];
    return (
      sessionsByCourseService[
        registrationSessionKey(courseId, serviceType)
      ] ?? []
    );
  }, [courseId, serviceType, sessionsByCourseService]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.session_id === sessionId) || null,
    [sessions, sessionId],
  );

  const checkEmailExists = useCallback(
    async (emailRaw: string): Promise<EmailCheckResult> => {
      const email = normalizeEmail(emailRaw);
      if (!looksLikeEmail(email)) return { exists: null, message: "" };

      const body: Record<string, string> = {
        action: EMAIL_CHECK_ACTION,
        email,
      };
      if (courseId) body.course_id = String(courseId);
      if (sessionId) body.session_id = String(sessionId);

      try {
        const data = await postForm(body);
        return parseEmailExistsFromResponse(data);
      } catch {
        return {
          exists: null,
          message: "Unable to check email right now. Please try again.",
        };
      }
    },
    [courseId, sessionId],
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
    const email = normalizeEmail(form.email);
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
      void runEmailCheck(form.email);
    }, 650);

    return clearEmailDebounce;
  }, [form.email, emailTouched, emailBlurred, runEmailCheck, clearEmailDebounce]);

  useEffect(() => {
    if (!lastCheckedEmailRef.current) return;
    setLastCheckedEmail("");
    lastCheckedEmailRef.current = "";
    setEmailExists(false);
    if (emailTouched && looksLikeEmail(form.email)) {
      clearEmailDebounce();
      emailDebounceRef.current = window.setTimeout(() => {
        emailDebounceRef.current = null;
        void runEmailCheck(form.email);
      }, 650);
    }
  }, [courseId, sessionId, emailTouched, form.email, runEmailCheck, clearEmailDebounce]);

  useEffect(() => () => clearMobileDebounce(), [clearMobileDebounce]);

  // Sync package selection from preloaded server sessions
  useEffect(() => {
    if (!courseId || serviceType === "") {
      setSessionId("");
      return;
    }

    if (!selectedCourse?.availableServiceTypes.includes(serviceType)) {
      setSessionId("");
      return;
    }

    const list =
      sessionsByCourseService[
        registrationSessionKey(courseId, serviceType)
      ] ?? [];

    const mostPopular = list.find((p) => String(p.is_most_popular) === "1");
    if (mostPopular) {
      setSessionId(mostPopular.session_id);
    } else if (list[0]) {
      setSessionId(list[0].session_id);
    } else {
      setSessionId("");
    }
  }, [courseId, serviceType, selectedCourse, sessionsByCourseService]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "mobile") {
      const cleaned = sanitizeMobileInput(value, form.mobile);
      if (cleaned === null) return;
      setForm((prev) => ({ ...prev, [name]: cleaned }));
      setFieldErrors((prev) => ({ ...prev, mobile: "" }));
      scheduleMobileValidation(cleaned);
    } else if (name === "first_name") {
      setForm((prev) => ({ ...prev, [name]: value }));
      setFieldErrors((prev) => ({ ...prev, first_name: "" }));
    } else if (name === "last_name") {
      setForm((prev) => ({ ...prev, [name]: value }));
      setFieldErrors((prev) => ({ ...prev, last_name: "" }));
    } else if (name === "email") {
      setForm((prev) => ({ ...prev, [name]: value }));
      setEmailExists(false);
      setEmailCheckMsg("");
      setEmailBlurred(false);
      setLastCheckedEmail("");
      lastCheckedEmailRef.current = "";
    } else if (name === "confirm_password") {
      setForm((prev) => ({ ...prev, [name]: value }));
      // Active validation for password match
      setFieldErrors((prev) => ({
        ...prev,
        confirm_password: validateConfirmPassword(value, form.password),
      }));
    } else if (name === "password") {
      setForm((prev) => ({ ...prev, [name]: value }));
      // If user is typing in password field, also re-validate confirm_password if it's not empty
      if (form.confirm_password) {
        setFieldErrors((prev) => ({
          ...prev,
          confirm_password: validateConfirmPassword(
            form.confirm_password,
            value,
          ),
        }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    if (status?.type === "error") setStatus(null);
  };

  const emailReady = useMemo(() => {
    const normalized = normalizeEmail(form.email);
    if (!normalized || !looksLikeEmail(form.email)) return false;
    if (emailChecking || emailExists) return false;
    if (emailCheckMsg && emailCheckMsg !== "Checking email...") return false;
    if (normalized !== lastCheckedEmail) return false;
    return true;
  }, [
    form.email,
    emailChecking,
    emailExists,
    emailCheckMsg,
    lastCheckedEmail,
  ]);

  const canSubmit = useMemo(() => {
    const userFieldsOk =
      !!form.first_name.trim() &&
      !!form.last_name.trim() &&
      emailReady &&
      !!form.mobile.trim() &&
      !!form.password.trim() &&
      !!form.confirm_password.trim() &&
      form.password === form.confirm_password &&
      !fieldErrors.first_name &&
      !fieldErrors.last_name &&
      !fieldErrors.mobile &&
      !fieldErrors.confirm_password &&
      agree &&
      !submitting;

    if (!userFieldsOk) return false;

    if (hasPurchase) {
      return !!courseId && serviceType !== "" && !!sessionId;
    }
    return true;
  }, [
    form,
    fieldErrors,
    courseId,
    serviceType,
    sessionId,
    agree,
    submitting,
    emailReady,
    hasPurchase,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setEmailBlurred(true);

    const firstNameErr = validateFirstName(form.first_name);
    const lastNameErr = validateLastName(form.last_name);
    const mobileErr = validateMobile(form.mobile);
    const confirmErr = validateConfirmPassword(
      form.confirm_password,
      form.password,
    );

    if (firstNameErr || lastNameErr || mobileErr || confirmErr) {
      setFieldErrors({
        first_name: firstNameErr,
        last_name: lastNameErr,
        mobile: mobileErr,
        confirm_password: confirmErr,
      });
      setStatus({
        type: "error",
        text: "Please fix all the errors in the form before submitting.",
      });
      return;
    }

    if (!form.email.trim() || !looksLikeEmail(form.email)) {
      if (!form.email.trim()) {
        setEmailCheckMsg("Email address is required.");
      } else {
        void runEmailCheck(form.email);
      }
      setStatus({
        type: "error",
        text: "Please fix all the errors in the form before submitting.",
      });
      return;
    }

    if (normalizeEmail(form.email) !== lastCheckedEmail) {
      await runEmailCheck(form.email);
    }

    if (emailChecking) {
      setStatus({
        type: "info",
        text: "We are checking your email. Please wait a moment and try again.",
      });
      return;
    }

    if (emailExists) {
      setStatus({
        type: "error",
        text: emailCheckMsg || "This email address is already registered.",
      });
      return;
    }

    if (!canSubmit) {
      setStatus({
        type: "error",
        text: "Please complete all required fields correctly before submitting.",
      });
      return;
    }

    if (hasPurchase) {
      if (!courseId)
        return setStatus({ type: "error", text: "Please select a course." });
      if (requiresGrade && !selectedGradeMainId) {
        setShowGradeError(true);
        return setStatus({ type: "error", text: "Please select a grade." });
      }
      if (serviceType === "")
        return setStatus({ type: "error", text: "Please select a service." });
      if (!sessionId)
        return setStatus({ type: "error", text: "Please select a package." });
    }
    if (!agree)
      return setStatus({
        type: "error",
        text: "Please agree to the terms & conditions.",
      });

    try {
      setSubmitting(true);

      // Build POST body — omit course/session when not purchased
      const body: Record<string, string> = {
        action: "user-registration",
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
        mobile: form.mobile.trim(),
        payment_source_type: "mobile",
        currency: "usd",
      };

      if (hasPurchase) {
        body.course_id = paymentIdentity.course_id;
        body.session_id = sessionId;
        body.is_variant = String(paymentIdentity.is_variant);
        if (selectedSession?.price) body.amount = String(selectedSession.price);
      }

      const json = (await postForm(body)) as {
        status?: number;
        isSuccess?: boolean;
        message?: string;
      };

      if (json?.status === 200 && json?.isSuccess) {
        if (hasPurchase) {
          // Auto-login then redirect to study portal
          const portalUrl = process.env.NEXT_PUBLIC_RESOURCES_URL || "";
          try {
            const loginRes = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: form.email.trim(),
                password: form.password,
              }),
            });
            const loginData = await loginRes.json();
            const url = String(loginData?.portalUrl || portalUrl).trim();
            window.location.href = resolvePortalLoginUrl(url);
          } catch {
            window.location.href = resolvePortalLoginUrl(portalUrl);
          }
          return;
        }

        // Free registration — show in-page success panel
        setRegistrationSuccess(true);
        setStatus(null);
        return;
      }

      setStatus({
        type: "error",
        text: json?.message || "Registration failed.",
      });
    } catch (e: any) {
      setStatus({ type: "error", text: e?.message || "Registration failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="py-5"
      style={{
        background:
          "linear-gradient(135deg, rgba(242,161,85,0.12) 0%, rgba(0,35,65,0.08) 100%)",
        minHeight: "calc(100vh - 80px)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-7 col-xl-6">
            <div
              className="card border-0 shadow-sm"
              style={{ borderRadius: 16, overflow: "hidden" }}
            >
              <div
                className="p-4"
                style={{ background: "#002341", color: "white" }}
              >
                <h3 className="fw-bold">Create Account</h3>
                <p className="mb-0" style={{ opacity: 0.85 }}>
                  Register to get access to your course and study materials.
                </p>
              </div>

              <div className="card-body">
                {registrationSuccess ? (
                  <div className="text-center py-4">
                    <div
                      className="mb-3"
                      style={{ fontSize: 48 }}
                    >
                      ✅
                    </div>
                    <h4 className="fw-bold mb-2" style={{ color: "#002341" }}>
                      Account created!
                    </h4>
                    <p className="mb-4" style={{ color: "#002341", opacity: 0.85 }}>
                      Your account has been created. Log in on the marketing site to browse courses and make a purchase.
                    </p>
                    <Link
                      href="/user-login"
                      className="btn fw-bold"
                      style={{
                        background: "#f2a155",
                        color: "#002341",
                        borderRadius: 12,
                        padding: "12px 24px",
                      }}
                    >
                      Go to Login
                    </Link>
                  </div>
                ) : (<>
                <p
                  className="mb-3 small"
                  style={{
                    borderRadius: 10,
                    background: "rgba(242, 161, 85, 0.10)",
                    border: "1px solid rgba(242, 161, 85, 0.35)",
                    color: "rgba(0, 35, 65, 0.85)",
                    fontStyle: "italic",
                    padding: "10px 12px",
                  }}
                >
                  <span
                    className="fw-semibold"
                    style={{ color: "#c17a2e", fontStyle: "normal" }}
                  >
                    Note:
                  </span>{" "}
                  {hasPurchase
                    ? "Register to get access to your purchased course and study materials."
                    : "You can purchase a package after registration to get access to your course and study materials."}
                </p>

                {status && (
                  <div
                    className={`alert ${
                      status.type === "success"
                        ? "alert-success"
                        : status.type === "error"
                          ? "alert-danger"
                          : "alert-info"
                    }`}
                    role="alert"
                  >
                    {status.text}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Purchase status radios */}
                  <div className="mb-3">
                    <label className="fw-semibold d-block mb-2" style={{ color: "#002341" }}>
                      Have you already made a purchase?
                    </label>
                    <div className="d-flex gap-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="purchaseStatus"
                          id="ps-yes"
                          checked={purchaseStatus === "already_purchased"}
                          onChange={() => setPurchaseStatus("already_purchased")}
                        />
                        <label className="form-check-label" htmlFor="ps-yes">
                          Already purchased
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="purchaseStatus"
                          id="ps-no"
                          checked={purchaseStatus === "not_purchased"}
                          onChange={() => setPurchaseStatus("not_purchased")}
                        />
                        <label className="form-check-label" htmlFor="ps-no">
                          Not yet
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Package selection — only when already purchased */}
                  {hasPurchase && (
                  <div className="row g-2 mb-3">
                    {/* Course */}
                    <div className="col-12">
                      <select
                        className="form-select"
                        value={courseId}
                        onChange={(e) => {
                          setCourseId(e.target.value);
                          setSelectedGradeMainId("");
                          setServiceType("");
                          setSessionId("");
                          setStatus(null);
                        }}
                        disabled={courses.length === 0}
                        style={{
                          borderRadius: 10,
                          borderColor: "rgba(0,35,65,0.20)",
                          padding: "12px 12px",
                        }}
                      >
                        <option value="">
                          {courses.length === 0
                            ? "Courses unavailable"
                            : "Select a course"}
                        </option>
                        {groupedRegistrationCourses.map((group) => (
                          <optgroup
                            key={group.category}
                            label={`\u00A0\u00A0\u00A0${getCourseCategorySelectPrompt(group.category)}`}
                          >
                            {group.items.map((c) => (
                              <option key={c.course_id} value={c.course_id}>
                                {c.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {requiresGrade && (
                      <div className="col-12">
                        <CourseVariantGradeSelect
                          id="register-grade-select"
                          variants={selectedCourse?.variants ?? []}
                          value={selectedGradeMainId}
                          onChange={(gradeId) => {
                            setSelectedGradeMainId(gradeId);
                            if (gradeId) setShowGradeError(false);
                            setStatus(null);
                          }}
                          className="form-select"
                          containerClassName="mb-0"
                          style={{
                            borderRadius: 10,
                            borderColor: "rgba(0,35,65,0.20)",
                            padding: "12px 12px",
                          }}
                          showError={showGradeError}
                        />
                      </div>
                    )}

                    {/* Service */}
                    <div className="col-12">
                      <select
                        className="form-select"
                        value={serviceType}
                        onChange={(e) => {
                          setServiceType(e.target.value);
                          setStatus(null);
                        }}
                        disabled={!courseId || servicesOptions.length === 0}
                        style={{
                          borderRadius: 10,
                          borderColor: "rgba(0,35,65,0.20)",
                          padding: "12px 12px",
                        }}
                      >
                        <option value="">Select service</option>
                        {servicesOptions.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Package */}
                    <div className="col-12">
                      <select
                        className="form-select"
                        value={sessionId}
                        onChange={(e) => {
                          setSessionId(e.target.value);
                          setStatus(null);
                        }}
                        disabled={!courseId || serviceType === ""}
                        style={{
                          borderRadius: 10,
                          borderColor: "rgba(0,35,65,0.20)",
                          padding: "12px 12px",
                        }}
                      >
                        <option value="">Select package</option>

                        {sessions.map((s) => {
                          const popular = String(s.is_most_popular) === "1";
                          return (
                            <option key={s.session_id} value={s.session_id}>
                              {s.name}
                              {popular ? " (Most Popular)" : ""}
                            </option>
                          );
                        })}
                      </select>

                      {selectedSession && (
                        <div className="mt-2 d-flex align-items-center gap-2">
                          {/* <span className="small text-muted">Selected price:</span>
                          <span className="small fw-semibold" style={{ color: "#002341" }}>
                            ${moneyUsd(selectedSession.price)} USD
                          </span> */}
                          {/* {String(selectedSession.is_most_popular) === "1" && (
                            <span
                              className="badge"
                              style={{
                                background: "#002341",
                                color: "white",
                                borderRadius: 999,
                                padding: "6px 10px",
                              }}
                            >
                              Most Popular
                            </span>
                          )} */}
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                  {/* Names */}
                  <div className="row g-2 mb-3">
                    <div className="col-12 col-sm-6">
                      <input
                        type="text"
                        className={`form-control ${fieldErrors.first_name ? "is-invalid" : ""}`}
                        name="first_name"
                        placeholder="First name"
                        value={form.first_name}
                        onChange={handleChange}
                        onBlur={() =>
                          setFieldErrors((prev) => ({
                            ...prev,
                            first_name: validateFirstName(form.first_name),
                          }))
                        }
                        required
                        style={{
                          borderRadius: 10,
                          borderColor: fieldErrors.first_name
                            ? "#dc3545"
                            : "rgba(0,35,65,0.20)",
                          padding: "12px 12px",
                        }}
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
                    <div className="col-12 col-sm-6">
                      <input
                        type="text"
                        className={`form-control ${fieldErrors.last_name ? "is-invalid" : ""}`}
                        name="last_name"
                        placeholder="Last name"
                        value={form.last_name}
                        onChange={handleChange}
                        onBlur={() =>
                          setFieldErrors((prev) => ({
                            ...prev,
                            last_name: validateLastName(form.last_name),
                          }))
                        }
                        required
                        style={{
                          borderRadius: 10,
                          borderColor: fieldErrors.last_name
                            ? "#dc3545"
                            : "rgba(0,35,65,0.20)",
                          padding: "12px 12px",
                        }}
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
                  </div>

                  {/* Email */}
                  <div className="mb-3">
                    <input
                      type="email"
                      className={`form-control ${
                        emailExists ||
                        (emailBlurred && !form.email.trim()) ||
                        (emailTouched &&
                          !!form.email.trim() &&
                          !looksLikeEmail(form.email))
                          ? "is-invalid"
                          : ""
                      }`}
                      name="email"
                      placeholder="Email address"
                      value={form.email}
                      onChange={handleChange}
                      onBlur={() => {
                        setEmailTouched(true);
                        setEmailBlurred(true);
                        const email = normalizeEmail(form.email);
                        if (!email) return;
                        if (
                          email === lastCheckedEmailRef.current ||
                          email === emailCheckInFlightRef.current
                        ) {
                          return;
                        }
                        if (emailDebounceRef.current) {
                          clearEmailDebounce();
                          void runEmailCheck(form.email);
                        }
                      }}
                      onFocus={() => {
                        setEmailTouched(true);
                        setEmailBlurred(false);
                      }}
                      required
                      style={{
                        borderRadius: 10,
                        borderColor:
                          emailExists ||
                          (emailBlurred && !form.email.trim()) ||
                          (emailTouched &&
                            !!form.email.trim() &&
                            !looksLikeEmail(form.email))
                            ? "#dc3545"
                            : "rgba(0,35,65,0.20)",
                        padding: "12px 12px",
                      }}
                    />
                    {emailCheckMsg &&
                      (emailCheckMsg === "Email address is required."
                        ? emailBlurred
                        : emailTouched || !!form.email.trim()) && (
                      <div
                        className={`small mt-1 ${
                          emailExists || !looksLikeEmail(form.email)
                            ? "text-danger"
                            : "text-muted"
                        }`}
                        role={
                          emailExists || !looksLikeEmail(form.email)
                            ? "alert"
                            : undefined
                        }
                        style={{
                          fontSize: 13,
                          fontWeight:
                            emailExists || !looksLikeEmail(form.email) ? 600 : 400,
                        }}
                      >
                        {emailCheckMsg}
                      </div>
                    )}
                  </div>

                  {/* Mobile */}
                  <div className="mb-3">
                    <input
                      type="text"
                      className={`form-control ${fieldErrors.mobile ? "is-invalid" : ""}`}
                      name="mobile"
                      placeholder="Mobile number"
                      value={form.mobile}
                      onChange={handleChange}
                      onBlur={() => scheduleMobileValidation(form.mobile, true)}
                      required
                      style={{
                        borderRadius: 10,
                        borderColor: fieldErrors.mobile
                          ? "#dc3545"
                          : "rgba(0,35,65,0.20)",
                        padding: "12px 12px",
                      }}
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

                  {/* Password */}
                  <div className="mb-2 position-relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control pe-5"
                      name="password"
                      placeholder="Create password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      style={{
                        borderRadius: 10,
                        borderColor: "rgba(0,35,65,0.20)",
                        padding: "12px 12px",
                      }}
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
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

                  {/* Confirm Password */}
                  <div className="mb-3 position-relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`form-control pe-5 ${fieldErrors.confirm_password ? "is-invalid" : ""}`}
                      name="confirm_password"
                      placeholder="Confirm password"
                      value={form.confirm_password}
                      onChange={handleChange}
                      required
                      style={{
                        borderRadius: 10,
                        borderColor: fieldErrors.confirm_password
                          ? "#dc3545"
                          : "rgba(0,35,65,0.20)",
                        padding: "12px 12px",
                      }}
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

                  {/* ✅ Terms checkbox stays in your desired position (before Register), but more visible */}
                  <div className="mt-3 mb-3">
                    <div
                      className="d-flex align-items-start gap-3 p-3"
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(0,35,65,0.55)",
                        background: agree
                          ? "rgba(242,161,85,0.10)"
                          : "rgba(255,255,255,0.95)",
                        boxShadow: agree
                          ? "0 10px 28px rgba(0,35,65,0.18)"
                          : "0 8px 22px rgba(0,0,0,0.10)",
                        transition: "all 180ms ease",
                      }}
                    >
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="agree"
                        checked={agree}
                        onChange={(e) => setAgree(e.target.checked)}
                        style={{
                          width: 18,
                          height: 18,
                          marginTop: 2,
                          cursor: "pointer",
                        }}
                      />

                      <label
                        htmlFor="agree"
                        className="form-check-label"
                        style={{
                          color: "#002341",
                          fontWeight: 800,
                          lineHeight: 1.35,
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        I confirm that I have read and agree to the{" "}
                        <a
                          href="/terms-of-service"
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "#0d6efd",
                            textDecoration: "underline",
                            fontWeight: 900,
                          }}
                        >
                          Terms &amp; Conditions
                        </a>
                        .
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            opacity: 0.85,
                            marginTop: 4,
                          }}
                        >
                          Required to enable Register
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="btn w-100 fw-bold"
                    disabled={!canSubmit}
                    style={{
                      background: "#f2a155",
                      color: "#002341",
                      borderRadius: 12,
                      padding: "12px 14px",
                      opacity: !canSubmit ? 0.6 : 1,
                      cursor: !canSubmit ? "not-allowed" : "pointer",
                    }}
                  >
                    {submitting ? "Creating account..." : "Register"}
                  </button>

                  {/* Login link */}
                  <div className="text-center mt-3">
                    <span className="text-muted">
                      Already have an account?{" "}
                    </span>
                    <Link
                      href="/user-login"
                      className="fw-semibold text-decoration-none"
                      style={{ color: "#f2a155" }}
                    >
                      Login
                    </Link>
                  </div>
                </form>
                </>)}
              </div>
            </div>

            <div className="text-center mt-3 small text-muted">
              By registering, you agree to our terms and privacy policy.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
