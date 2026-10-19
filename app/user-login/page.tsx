"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import { useAuth } from "@/components/auth/AuthProvider";
import AlreadySignedInCard from "@/components/auth/AlreadySignedInCard";
import { resolvePortalLoginUrl } from "@/lib/portal-login";

type LoginStatus = { type: "success" | "error"; text: string } | null;

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser, refresh, loggingOut, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<LoginStatus>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);
    let redirecting = false;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (response.ok && result?.success) {
        if (result.user) setUser(result.user);
        await refresh();

        const portalUrl = String(result.portalUrl || "").trim();
        if (result.paidUser) {
          redirecting = true;
          window.location.href = resolvePortalLoginUrl(portalUrl);
          return;
        }
        // Unpaid user — redirect home (session cookie already set)
        redirecting = true;
        router.push("/");
        return;
      } else {
        setStatus({
          type: "error",
          text:
            result?.message || "Invalid email or password. Please try again.",
        });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", text: "Failed to connect to the server." });
    } finally {
      if (!redirecting) setSubmitting(false);
    }
  };

  if (user && !submitting) {
    return (
      <AlreadySignedInCard
        variant="login"
        user={user}
        loggingOut={loggingOut}
        onLogout={() => {
          void logout("/user-login");
        }}
      />
    );
  }

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
          <div className="col-12 col-md-8 col-lg-5">
            <div
              className="card border-0 shadow-sm"
              style={{
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <div
                className="p-4"
                style={{
                  background: "#002341",
                  color: "white",
                }}
              >
                <h3 className="mb-1 fw-bold">Login</h3>
                <p className="mb-0" style={{ opacity: 0.85 }}>
                  Access your account and continue your preparation.
                </p>
              </div>

              <div className="card-body p-4">
                {status && (
                  <div
                    className={`alert ${
                      status.type === "success"
                        ? "alert-success"
                        : "alert-danger"
                    }`}
                    role="alert"
                  >
                    {status.text}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label
                        className="form-label fw-semibold"
                        style={{ color: "#002341" }}
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (status?.type === "error") setStatus(null);
                        }}
                        required
                        style={{
                          borderRadius: 10,
                          borderColor: "rgba(0,35,65,0.20)",
                          padding: "12px 12px",
                        }}
                      />
                    </div>

                    <div className="mb-2 position-relative">
                      <label
                        className="form-label fw-semibold"
                        style={{ color: "#002341" }}
                      >
                        Password
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control pe-5"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (status?.type === "error") setStatus(null);
                        }}
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
                          top: 42,
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

                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="rememberMe"
                        />
                        <label
                          className="form-check-label small"
                          htmlFor="rememberMe"
                        >
                          Remember me
                        </label>
                      </div>

                    <Link
                      href="https://test-prep.asvab-tutoring.com/forgot-pass"
                      target="_blank"
                      className="small text-decoration-none"
                    >
                      Forgot password?
                    </Link>
                  </div>

                    <button
                      type="submit"
                      className="btn w-100 fw-bold"
                      disabled={submitting}
                      style={{
                        background: "#f2a155",
                        color: "#002341",
                        borderRadius: 12,
                        padding: "12px 14px",
                      }}
                    >
                      {submitting ? "Logging in..." : "Login"}
                    </button>

                    <div className="text-center mt-3">
                      <span className="text-muted">Not registered yet? </span>
                      <Link
                        href="/user-registration"
                        className="fw-semibold text-decoration-none"
                        style={{ color: "#f2a155" }}
                      >
                        Register
                      </Link>
                    </div>
                </form>
              </div>
            </div>

            <div className="text-center mt-3 small text-muted">
              By logging in, you agree to our terms and privacy policy.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
