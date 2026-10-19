"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { TestQuestion } from "@/lib/study-types";
import QuestionView from "./QuestionView";
import styles from "./study.module.css";
import { useCountdown } from "./useCountdown";
import { useMathTypeset } from "./useMathTypeset";

type Props = {
  questions: TestQuestion[];
  minutes: number;
  /** Save one answer; resolves false when it could not be saved */
  onAnswer: (question: TestQuestion, optionNumber: number) => Promise<boolean>;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
  /** Extra controls above the question (e.g. prediction sections) */
  header?: ReactNode;
  footerExtra?: (question: TestQuestion) => ReactNode;
  /** Unanswered questions across the whole test (multi-section tests) */
  unansweredOverall?: (answeredHere: number) => number;
};

/** Shared runner for practice and prediction tests. */
export default function TestRunner({
  questions,
  minutes,
  onAnswer,
  onSubmit,
  submitting,
  submitLabel,
  header,
  footerExtra,
  unansweredOverall,
}: Props) {
  const [index, setIndex] = useState(() => {
    const firstOpen = questions.findIndex((q) => !q.myAnswer);
    return firstOpen >= 0 ? firstOpen : 0;
  });
  const [answers, setAnswers] = useState<Record<number, number>>(() =>
    Object.fromEntries(questions.filter((q) => q.myAnswer).map((q) => [q.eid, q.myAnswer])),
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const questionRef = useRef<HTMLDivElement>(null);
  const timed = minutes > 0;
  const { label: timeLabel, secondsLeft, expired } = useCountdown(minutes, timed && !submitting);

  const current = questions[index];
  const answered = questions.filter((q) => answers[q.eid]).length;
  const unanswered = unansweredOverall ? unansweredOverall(answered) : questions.length - answered;

  useMathTypeset(questionRef, [current?.eid]);

  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(next, questions.length - 1)));
      setSaveError("");
    },
    [questions.length],
  );

  const choose = useCallback(
    async (optionNumber: number) => {
      if (!current || submitting) return;
      const previous = answers[current.eid];
      if (previous === optionNumber) return;
      setAnswers((prev) => ({ ...prev, [current.eid]: optionNumber }));
      setSaving(current.eid);
      setSaveError("");
      const ok = await onAnswer(current, optionNumber);
      setSaving(null);
      if (!ok) {
        setAnswers((prev) => {
          const next = { ...prev };
          if (previous) next[current.eid] = previous;
          else delete next[current.eid];
          return next;
        });
        setSaveError("Your answer was not saved. Check your connection and try again.");
      }
    },
    [answers, current, onAnswer, submitting],
  );

  // Keyboard: A-E / 1-5 to answer, arrows to move
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else {
        const key = e.key.toUpperCase();
        const n = "ABCDE".indexOf(key) + 1 || (/^[1-5]$/.test(key) ? Number(key) : 0);
        if (n && current?.options.some((o) => o.number === n)) void choose(n);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, confirmOpen, current, go, index]);

  if (!current) return null;

  const percent = questions.length ? Math.round((answered / questions.length) * 100) : 0;

  return (
    <>
      <div className={styles.testTopbar} role="region" aria-label="Test status">
        {timed && (
          <span
            className={`${styles.timer} ${secondsLeft <= 60 ? styles.timerLow : ""}`}
            aria-label={`Time left ${timeLabel}`}
          >
            <i className="bi bi-stopwatch" aria-hidden="true" /> {timeLabel}
          </span>
        )}
        <div className={styles.progressWrap}>
          <div className={styles.progressLabel}>
            <span>
              {answered} of {questions.length} answered
            </span>
            <span aria-live="polite">{saving ? "Saving…" : answered ? "Saved" : ""}</span>
          </div>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Answered"
          >
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
        </div>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => (unanswered > 0 ? setConfirmOpen(true) : onSubmit())}
          disabled={submitting || saving !== null}
        >
          {submitting ? "Submitting…" : submitLabel}
        </button>
      </div>

      {timed && expired && (
        <div className={`${styles.inlineAlert} ${styles.inlineAlertWarn}`} role="alert">
          <i className="bi bi-alarm" aria-hidden="true" /> Time is over! Submit your test to see your score.
        </div>
      )}

      {header}

      <div className={styles.testLayout}>
        <section className={styles.card} aria-label={`Question ${index + 1}`} ref={questionRef}>
          {current.section && (
            <div className={`${styles.badge} ${styles.badgeScore} mb-2`}>{current.section}</div>
          )}
          <QuestionView
            number={index + 1}
            total={questions.length}
            story={current.story}
            question={current.question}
            options={current.options}
            selected={answers[current.eid] ?? 0}
            onSelect={(n) => void choose(n)}
            disabled={submitting}
          />
          {saveError && (
            <div className={`${styles.inlineAlert} ${styles.inlineAlertError} mt-3 mb-0`} role="alert">
              {saveError}
            </div>
          )}
          <div className={styles.questionFooter}>
            <div className="d-flex flex-wrap gap-2">{footerExtra?.(current)}</div>
            <div className="d-flex gap-2">
              <button type="button" className={styles.btnGhost} onClick={() => go(index - 1)} disabled={index === 0}>
                <i className="bi bi-arrow-left" aria-hidden="true" /> Previous
              </button>
              {index < questions.length - 1 ? (
                <button type="button" className={styles.btnSecondary} onClick={() => go(index + 1)}>
                  Next <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => (unanswered > 0 ? setConfirmOpen(true) : onSubmit())}
                  disabled={submitting || saving !== null}
                >
                  {submitLabel}
                </button>
              )}
            </div>
          </div>
          <p className={`${styles.muted} small mt-3 mb-0 d-none d-md-block`}>
            Tip: press A–E to answer and ← → to move between questions.
          </p>
        </section>

        <aside className={styles.card} aria-label="Question navigator">
          <h2 className={styles.cardTitle} style={{ fontSize: "0.95rem" }}>
            Questions
          </h2>
          <div className={styles.palette}>
            {questions.map((q, i) => (
              <button
                key={q.eid}
                type="button"
                className={`${styles.paletteCell} ${answers[q.eid] ? styles.paletteAnswered : ""} ${
                  i === index ? styles.paletteCurrent : ""
                }`}
                onClick={() => go(i)}
                aria-label={`Question ${i + 1}${answers[q.eid] ? ", answered" : ", not answered"}`}
                aria-current={i === index ? "true" : undefined}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className={styles.legend}>
            <span>
              <span className={styles.legendSwatch} style={{ background: "#002341", borderColor: "#002341" }} />
              Answered
            </span>
            <span>
              <span className={styles.legendSwatch} />
              Not answered
            </span>
          </div>
        </aside>
      </div>

      {confirmOpen && (
        <div className={styles.modalBackdrop} onClick={() => setConfirmOpen(false)}>
          <div
            className={styles.modal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="submit-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="submit-confirm-title" className={styles.cardTitle}>
              Submit with {unanswered} unanswered?
            </h2>
            <p className={styles.muted}>Unanswered questions are marked wrong.</p>
            <div className="d-flex gap-2 justify-content-end">
              <button
                type="button"
                className={styles.btnGhost}
                autoFocus
                onClick={() => {
                  setConfirmOpen(false);
                  const firstOpen = questions.findIndex((q) => !answers[q.eid]);
                  if (firstOpen >= 0) go(firstOpen);
                }}
              >
                Keep answering
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  setConfirmOpen(false);
                  onSubmit();
                }}
              >
                Submit anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
