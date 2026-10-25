"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { studyRequest } from "@/lib/study-client";
import styles from "../study.module.css";

const REASONS = [
  "I finished studying / passed my test",
  "It's too expensive",
  "I'm not using it enough",
  "The course isn't what I needed",
  "Technical problems",
];

/**
 * Cancel (with a reason, as the portal requires) or resume a Square
 * subscription. "accessUntil" is shown in the cancel confirmation.
 */
export default function SubscriptionActions({
  mode,
  accessUntil,
}: {
  mode: "cancel" | "resume";
  accessUntil: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const reason = choice === "other" ? other.trim() : choice;

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  const confirm = async () => {
    setBusy(true);
    setError("");
    const result =
      mode === "cancel"
        ? await studyRequest("student-subscription-cancel", {
            cancel_reason: reason,
          })
        : await studyRequest("student-subscription-resume");
    setBusy(false);
    if (!result.ok || result.data.isSuccess === false) {
      setError(
        result.ok
          ? String(result.data.message || "Something went wrong.")
          : result.message,
      );
      return;
    }
    setOpen(false);
    setDone(String(result.data.message || "Done."));
    router.refresh();
  };

  return (
    <>
      {done && (
        <p className={`${styles.formSuccess} mb-2`} role="status">
          <i className="bi bi-check-circle-fill" aria-hidden="true" /> {done}
        </p>
      )}
      <button
        type="button"
        className={mode === "cancel" ? styles.btnDanger : styles.btnPrimary}
        onClick={() => {
          setOpen(true);
          setError("");
        }}
      >
        <i
          className={`bi ${mode === "cancel" ? "bi-x-circle" : "bi-arrow-repeat"}`}
          aria-hidden="true"
        />{" "}
        {mode === "cancel" ? "Cancel subscription" : "Resume subscription"}
      </button>

      {open && (
        <div
          className={styles.modalBackdrop}
          onClick={() => !busy && setOpen(false)}
        >
          <div
            ref={dialogRef}
            className={`${styles.modal} ${styles.subModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            {mode === "cancel" ? (
              <>
                <h2 id={titleId} className={styles.cardTitle}>
                  Cancel your subscription?
                </h2>
                <p className={styles.muted}>
                  Auto-renewal will stop. You keep full access
                  {accessUntil
                    ? ` until ${accessUntil}`
                    : " until the end of your billing period"}
                  , and you can resume any time before then.
                </p>
                <fieldset className={styles.reasonList}>
                  <legend className={styles.formLabel}>
                    Why are you cancelling?
                  </legend>
                  {[...REASONS, "other"].map((r) => (
                    <label
                      key={r}
                      className={`${styles.reasonOption} ${choice === r ? styles.reasonOptionOn : ""}`}
                    >
                      <input
                        type="radio"
                        name="cancel-reason"
                        value={r}
                        checked={choice === r}
                        onChange={() => setChoice(r)}
                      />
                      {r === "other" ? "Something else" : r}
                    </label>
                  ))}
                  {choice === "other" && (
                    <textarea
                      className={`form-control ${styles.formInput}`}
                      rows={3}
                      maxLength={1000}
                      placeholder="Tell us a little more"
                      value={other}
                      onChange={(e) => setOther(e.target.value)}
                      aria-label="Your reason"
                    />
                  )}
                </fieldset>
              </>
            ) : (
              <>
                <h2 id={titleId} className={styles.cardTitle}>
                  Resume your subscription?
                </h2>
                <p className={styles.muted}>
                  Your plan will keep renewing automatically and the scheduled
                  cancellation will be removed.
                </p>
              </>
            )}

            {error && (
              <div
                className={`${styles.inlineAlert} ${styles.inlineAlertError}`}
                role="alert"
              >
                {error}
              </div>
            )}

            <div className={styles.subModalActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                {mode === "cancel" ? "Keep my plan" : "Not now"}
              </button>
              <button
                type="button"
                className={
                  mode === "cancel" ? styles.btnDanger : styles.btnPrimary
                }
                onClick={() => void confirm()}
                disabled={busy || (mode === "cancel" && !reason)}
              >
                {busy
                  ? mode === "cancel"
                    ? "Cancelling…"
                    : "Resuming…"
                  : mode === "cancel"
                    ? "Cancel subscription"
                    : "Resume subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
