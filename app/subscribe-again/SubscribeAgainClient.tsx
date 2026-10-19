"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import SubscribeAgainPaymentForm from "@/components/subscribe-again-payment-form/SubscribeAgainPaymentForm";

type PackageItem = {
  session_id?: number;
  package_id?: number;

  // PHP returns these
  title?: string;
  price?: string;
  amount_cents?: number;
  feature?: string;
  is_most_popular?: boolean;
  ord?: number;

  plan_variation_id?: string;

  // optional
  is_active?: boolean;
};

type ContextResponse = {
  ok: boolean;
  message?: string;

  user?: {
    user_id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
  };

  course?: {
    course_id: string;
    course_name?: string;
    is_variant?: 0 | 1;
    main_course_id?: string;
  };

  package?: {
    package_id?: number;
  };

  packages?: PackageItem[];
  return_url?: string;
};

function fullName(u?: ContextResponse["user"]) {
  const fn = (u?.first_name || "").trim();
  const ln = (u?.last_name || "").trim();
  return `${fn} ${ln}`.trim();
}

function dollarsFromCents(cents?: number) {
  const n = Number(cents || 0);
  if (!Number.isFinite(n)) return "0.00";
  return (n / 100).toFixed(2);
}

export default function SubscribeAgainClient() {
  const sp = useSearchParams();

  const auth_token = sp.get("auth_token") || "";
  const user_id = sp.get("user_id") || "";
  const return_url = sp.get("return_url") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ctx, setCtx] = useState<ContextResponse | null>(null);
  const [selected, setSelected] = useState<PackageItem | null>(null);

  const backUrl = useMemo(() => {
    return (
      ctx?.return_url ||
      return_url ||
      `${process.env.NEXT_PUBLIC_RESOURCES_URL}/subscription-profile`
    );
  }, [ctx?.return_url, return_url]);

  const course_id = useMemo(
    () => (ctx?.course?.course_id || "").trim(),
    [ctx?.course?.course_id],
  );

  const packages = useMemo(() => {
    const list = Array.isArray(ctx?.packages) ? ctx!.packages! : [];

    // Keep only meaningful items; do NOT require plan_variation_id
    const cleaned = list.filter((p) => {
      const centsOk =
        Number.isFinite(Number(p?.amount_cents)) && Number(p?.amount_cents) > 0;
      const titleOk = !!String(p?.title || "").trim();
      const activeOk = p?.is_active === undefined ? true : !!p.is_active;
      return activeOk && (centsOk || titleOk);
    });

    // Sort by ord if present, else keep original
    cleaned.sort(
      (a, b) => (Number(a.ord || 0) || 0) - (Number(b.ord || 0) || 0),
    );

    return cleaned;
  }, [ctx]);

  // Load context
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      setCtx(null);
      setSelected(null);

      if (!auth_token || !user_id) {
        setErr("Missing auth_token or user_id in URL.");
        setLoading(false);
        return;
      }

      try {
        const qs = new URLSearchParams({ auth_token, user_id });
        if (return_url) qs.set("return_url", return_url);

        const r = await fetch(`/api/subscribe-again?${qs.toString()}`, {
          cache: "no-store",
        });
        const data: ContextResponse = await r.json().catch(() => ({}) as any);

        if (!alive) return;

        if (!r.ok || !data?.ok) {
          setErr(data?.message || "Failed to load packages.");
          setLoading(false);
          return;
        }

        setCtx(data);

        // Auto-select: most popular first, else first in list
        const list = Array.isArray(data.packages) ? data.packages : [];
        const mostPopular = list.find((p) => p?.is_most_popular);
        const first = mostPopular || list[0] || null;

        setSelected(first);
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Request failed.");
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [auth_token, user_id, return_url]);

  const userLabel = useMemo(
    () => fullName(ctx?.user) || ctx?.user?.email || "User",
    [ctx?.user],
  );

  const selectedTitle = useMemo(() => {
    const t = String(selected?.title || "").trim();
    return t || "Selected package";
  }, [selected?.title]);

  const selectedAmountCents = useMemo(
    () => Number(selected?.amount_cents || 0),
    [selected?.amount_cents],
  );

  const selectedPlanId = useMemo(
    () => String(selected?.plan_variation_id || "").trim(),
    [selected?.plan_variation_id],
  );

  const canPay = useMemo(() => {
    if (!selected) return false;
    if (!course_id) return false;
    if (!selectedPlanId) return false; // required for Square subscription create
    if (!Number.isFinite(selectedAmountCents) || selectedAmountCents <= 0)
      return false;
    return true;
  }, [selected, course_id, selectedPlanId, selectedAmountCents]);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "50px 0 0 0" }}>
            Subscribe Again
          </h1>
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            Course: <b>{ctx?.course?.course_name || course_id || "Course"}</b> ·
            User: <b>{userLabel}</b>
          </div>
        </div>

        <a
          href={backUrl}
          style={{ textDecoration: "underline", whiteSpace: "nowrap" }}
        >
          Back to Study
        </a>
      </div>

      {loading ? (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            border: "1px solid #ddd",
            borderRadius: 12,
          }}
        >
          Loading…
        </div>
      ) : err ? (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            border: "1px solid #f2c1c1",
            borderRadius: 12,
          }}
        >
          <b>Error:</b> {err}
        </div>
      ) : (
        <>
          {/* Packages */}
          <section style={{ marginTop: 18 }}>
            <h2
              style={{ fontSize: 18, fontWeight: 800, margin: "40px 0 10px 0" }}
            >
              Choose a package
            </h2>

            {packages.length === 0 ? (
              <div
                style={{
                  padding: 14,
                  border: "1px solid #ddd",
                  borderRadius: 12,
                }}
              >
                No packages available for this course.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 12,
                }}
              >
                {packages.map((p, idx) => {
                  const id = String(p.session_id || p.ord || idx);
                  const isSel =
                    (selected?.session_id &&
                      p.session_id &&
                      selected.session_id === p.session_id) ||
                    (!selected?.session_id &&
                      selected?.title &&
                      p.title &&
                      selected.title === p.title);

                  const title = String(p.title || "").trim() || "Package";
                  const cents = Number(p.amount_cents || 0);
                  const feature = String(p.feature || "").trim();
                  const popular = !!p.is_most_popular;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelected(p)}
                      style={{
                        textAlign: "left",
                        padding: 14,
                        borderRadius: 14,
                        border: isSel ? "2px solid #111" : "1px solid #ddd",
                        background: "#fff",
                        color: "#111",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: 16 }}>
                          {title}
                        </div>
                        {popular && (
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              border: "1px solid #111",
                              padding: "2px 8px",
                              borderRadius: 999,
                            }}
                          >
                            Popular
                          </span>
                        )}
                      </div>

                      <div style={{ marginTop: 10, fontWeight: 800 }}>
                        ${dollarsFromCents(cents)}
                      </div>

                      {feature && feature !== "none" ? (
                        <div style={{ marginTop: 6, opacity: 0.85 }}>
                          {feature}
                        </div>
                      ) : (
                        ""
                      )}

                      {!String(p.plan_variation_id || "").trim() ? (
                        <div
                          style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}
                        >
                          Not linked to Square plan yet
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Payment */}
          <section style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 10px 0" }}>
              Payment
            </h2>

            {!selected ? (
              <div
                style={{
                  padding: 14,
                  border: "1px solid #ddd",
                  borderRadius: 12,
                }}
              >
                Select a package to continue.
              </div>
            ) : !course_id ? (
              <div
                style={{
                  padding: 14,
                  border: "1px solid #ddd",
                  borderRadius: 12,
                }}
              >
                Missing course context. Please reopen Subscribe Again from the
                portal.
              </div>
            ) : !selectedPlanId ? (
              <div
                style={{
                  padding: 14,
                  border: "1px solid #f0d9a8",
                  borderRadius: 12,
                }}
              >
                <b>Cannot continue:</b>{" "}
                <span style={{ fontWeight: 700 }}>{selectedTitle}</span> is
                missing <code>plan_variation_id</code>. Add it to your PHP
                response per package session so Square can create the
                subscription.
              </div>
            ) : !Number.isFinite(selectedAmountCents) ||
              selectedAmountCents <= 0 ? (
              <div
                style={{
                  padding: 14,
                  border: "1px solid #ddd",
                  borderRadius: 12,
                }}
              >
                Invalid package amount. Please select a different package.
              </div>
            ) : (
              <div
                style={{
                  padding: 14,
                  border: "1px solid #ddd",
                  borderRadius: 12,
                }}
              >
                <SubscribeAgainPaymentForm
                  amount={selectedAmountCents}
                  course_id={course_id}
                  user_id={user_id}
                  auth_token={auth_token}
                  plan_variation_id={selectedPlanId}
                  return_url={backUrl}
                  disabled={!canPay}
                  onError={(m) => setErr(m)}
                />
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
