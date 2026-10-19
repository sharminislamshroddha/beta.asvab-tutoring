"use client";

import Link from "next/link";
import type { AuthUser } from "@/lib/auth-session";
import { STUDY_PORTAL_HREF } from "@/lib/portal-login";

type Variant = "login" | "register";

function firstInitial(value: string): string {
  const match = value.trim().match(/[\p{L}\p{N}]/u);
  return match ? match[0].toUpperCase() : "";
}

function userInitials(user: AuthUser): string {
  const first = firstInitial(user.first_name);
  const last = firstInitial(user.last_name);
  if (first && last) return `${first}${last}`;
  if (first) {
    const parts = user.first_name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const second = firstInitial(parts[parts.length - 1]);
      if (second) return `${first}${second}`;
    }
    return user.first_name.trim().slice(0, 2).toUpperCase() || first;
  }
  if (last) return user.last_name.trim().slice(0, 2).toUpperCase() || last;
  const local = user.email.split("@")[0] || "";
  return local.slice(0, 2).toUpperCase() || "?";
}

function userFullName(user: AuthUser): string {
  return `${user.first_name} ${user.last_name}`.trim() || user.email || "Account";
}

const COPY: Record<
  Variant,
  { title: string; subtitle: string; body: string; switchLabel: string }
> = {
  login: {
    title: "You're already logged in",
    subtitle: "Log out to log in with a different account.",
    body: "Log out of this account to log in with a different account or continue exploring and studying with this account.",
    switchLabel: "Log out",
  },
  register: {
    title: "You're already registered",
    subtitle: "Log out to register a new account.",
    body: "Log out of this account to register a new account or continue exploring and studying with this account.",
    switchLabel: "Log out",
  },
};

export default function AlreadySignedInCard({
  variant,
  user,
  loggingOut,
  onLogout,
}: {
  variant: Variant;
  user: AuthUser;
  loggingOut: boolean;
  onLogout: () => void;
}) {
  const copy = COPY[variant];
  const fullName = userFullName(user);

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
              style={{ borderRadius: 16, overflow: "hidden" }}
            >
              <div className="p-4" style={{ background: "#002341", color: "white" }}>
                <h3 className="mb-1 fw-bold">{copy.title}</h3>
                <p className="mb-0" style={{ opacity: 0.85 }}>
                  {copy.subtitle}
                </p>
              </div>

              <div className="card-body p-4">
                <div className="auth-signed-in-identity">
                  <span
                    className="auth-signed-in-avatar"
                    role="img"
                    aria-label={fullName}
                    title={fullName}
                  >
                    {userInitials(user)}
                  </span>
                  <div className="auth-signed-in-meta">
                    <div className="auth-signed-in-name">{fullName}</div>
                    {user.email ? (
                      <div className="auth-signed-in-email">{user.email}</div>
                    ) : null}
                  </div>
                </div>

                <p className="mb-4" style={{ color: "#002341" }}>
                  {copy.body}
                </p>

                <button
                  type="button"
                  className="btn w-100 fw-semibold mb-3"
                  onClick={onLogout}
                  disabled={loggingOut}
                  style={{
                    background: "transparent",
                    color: "#002341",
                    border: "1px solid rgba(0,35,65,0.22)",
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}
                >
                  {loggingOut ? "Logging out…" : copy.switchLabel}
                </button>

                <Link
                  href="/"
                  className="btn w-100 fw-bold mb-3"
                  style={{
                    background: "#f2a155",
                    color: "#002341",
                    borderRadius: 12,
                    padding: "12px 14px",
                    textDecoration: "none",
                  }}
                >
                  Continue to website
                </Link>

                <a
                  href={STUDY_PORTAL_HREF}
                  className="btn w-100 fw-bold"
                  style={{
                    background: "#002341",
                    color: "white",
                    borderRadius: 12,
                    padding: "12px 14px",
                    textDecoration: "none",
                  }}
                >
                  Continue studying
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
