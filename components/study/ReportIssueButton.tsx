"use client";

import { useEffect, useId, useRef, useState } from "react";
import { studyRequest } from "@/lib/study-client";
import styles from "./study.module.css";

/** "Report an issue" with a question / lesson (saved in report_error and emailed to support). */
export default function ReportIssueButton({
  catId,
  lessonId,
  context,
}: {
  catId?: number;
  lessonId?: number;
  context: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async () => {
    if (!message.trim()) return;
    setState("sending");
    const result = await studyRequest("student-report-error", {
      cat_id: catId ?? 0,
      lesson_id: lessonId ?? 0,
      from_page: `Website - ${context}`,
      message: message.trim(),
    });
    if (result.ok) {
      setState("sent");
      setMessage("");
    } else {
      setState("error");
      setError(result.message);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.btnGhost}
        onClick={() => {
          setOpen(true);
          setState("idle");
        }}
        style={{ padding: "0.45rem 0.8rem", fontSize: "0.85rem" }}
      >
        <i className="bi bi-flag" aria-hidden="true" /> Report an issue
      </button>

      {open && (
        <div className={styles.modalBackdrop} onClick={() => setOpen(false)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className={styles.cardTitle}>
              Report an issue
            </h2>
            {state === "sent" ? (
              <>
                <p>Thanks! Our team will look into it.</p>
                <button type="button" className={styles.btnPrimary} onClick={() => setOpen(false)}>
                  Close
                </button>
              </>
            ) : (
              <>
                <p className={`${styles.muted} small`}>{context}</p>
                <label htmlFor={`${titleId}-msg`} className="form-label fw-semibold">
                  What is wrong?
                </label>
                <textarea
                  id={`${titleId}-msg`}
                  ref={textareaRef}
                  className="form-control mb-3"
                  rows={4}
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. The answer marked correct looks wrong, or an image is missing."
                />
                {state === "error" && (
                  <div className={`${styles.inlineAlert} ${styles.inlineAlertError}`} role="alert">
                    {error}
                  </div>
                )}
                <div className="d-flex gap-2 justify-content-end">
                  <button type="button" className={styles.btnGhost} onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={send}
                    disabled={!message.trim() || state === "sending"}
                  >
                    {state === "sending" ? "Sending…" : "Send report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
