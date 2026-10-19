"use client";

import { useState } from "react";
import Link from "next/link";

type ForgotStatus = { type: "success" | "error"; text: string } | null;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<ForgotStatus>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);

    const formData = new URLSearchParams();
    formData.append("action", "forgot-password");
    formData.append("email", email.trim().toLowerCase());

    try {
      const response = await fetch(process.env.NEXT_PUBLIC_PHP_API_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      const result = await response.json();
      const message = String(result?.message ?? "");

      if (
        message.toLowerCase().includes("check your email") ||
        result?.password_link
      ) {
        setStatus({
          type: "success",
          text:
            message ||
            "Please check your email for a link to reset your password.",
        });
      } else {
        setStatus({
          type: "error",
          text: message || "We could not process your request. Please try again.",
        });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", text: "Failed to connect to the server." });
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
                <h3 className="mb-1 fw-bold">Forgot Password</h3>
                <p className="mb-0" style={{ opacity: 0.85 }}>
                  Enter your email and we&apos;ll send you a link to reset your
                  password.
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
                      disabled={status?.type === "success"}
                      style={{
                        borderRadius: 10,
                        borderColor: "rgba(0,35,65,0.20)",
                        padding: "12px 12px",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn w-100 fw-bold"
                    disabled={submitting || status?.type === "success"}
                    style={{
                      background: "#f2a155",
                      color: "#002341",
                      borderRadius: 12,
                      padding: "12px 14px",
                    }}
                  >
                    {submitting ? "Sending..." : "Send Reset Link"}
                  </button>

                  <div className="text-center mt-3">
                    <Link
                      href="/user-login"
                      className="fw-semibold text-decoration-none"
                      style={{ color: "#f2a155" }}
                    >
                      Back to Login
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
