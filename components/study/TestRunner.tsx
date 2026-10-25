"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  /** Unanswered questions across the whole test (multi-section tests) */
  unansweredOverall?: (answeredHere: number) => number;
  /** Multi-section tests: the last question moves on instead of submitting */
  nextSection?: { label: string; shortLabel?: string; onGo: () => void };
  /** Every question on one page instead of Previous / Next (practice tests) */
  showAll?: boolean;
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
  unansweredOverall,
  nextSection,
  showAll = false,
}: Props) {
  const [index, setIndex] = useState(() => {
    const firstOpen = questions.findIndex((q) => !q.myAnswer);
    return firstOpen >= 0 ? firstOpen : 0;
  });
  const [answers, setAnswers] = useState<Record<number, number>>(() =>
    Object.fromEntries(
      questions.filter((q) => q.myAnswer).map((q) => [q.eid, q.myAnswer]),
    ),
  );
  const [saving, setSaving] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<{
    eid: number;
    message: string;
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Phones / tablets (one-page tests): the question navigator is a bottom sheet
  const [paletteOpen, setPaletteOpen] = useState(false);
  const questionRef = useRef<HTMLDivElement>(null);
  const topbarRef = useRef<HTMLDivElement>(null);
  const timed = minutes > 0;
  const {
    label: timeLabel,
    secondsLeft,
    expired,
  } = useCountdown(minutes, timed && !submitting);

  const current = questions[index];
  const answered = questions.filter((q) => answers[q.eid]).length;
  const unanswered = unansweredOverall
    ? unansweredOverall(answered)
    : questions.length - answered;
  // With sections left, submitting is offered only once every question is answered
  const canSubmit = !nextSection || unanswered === 0;

  useMathTypeset(questionRef, [showAll ? questions.length : current?.eid]);

  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(next, questions.length - 1)));
      setSaveError(null);
    },
    [questions.length],
  );

  /** One-page mode: bring a question into view (navigator, "Keep answering") */
  const scrollToQuestion = useCallback((question: TestQuestion | undefined) => {
    if (!question) return;
    setPaletteOpen(false);
    document
      .getElementById(`test-question-${question.eid}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const choose = useCallback(
    async (question: TestQuestion | undefined, optionNumber: number) => {
      if (!question || submitting) return;
      const previous = answers[question.eid];
      if (previous === optionNumber) return;
      setAnswers((prev) => ({ ...prev, [question.eid]: optionNumber }));
      setSaving(question.eid);
      setSaveError(null);
      const ok = await onAnswer(question, optionNumber);
      setSaving(null);
      if (!ok) {
        setAnswers((prev) => {
          const next = { ...prev };
          if (previous) next[question.eid] = previous;
          else delete next[question.eid];
          return next;
        });
        setSaveError({
          eid: question.eid,
          message:
            "Your answer was not saved. Check your connection and try again.",
        });
      }
    },
    [answers, onAnswer, submitting],
  );

  // Keyboard (one question at a time): A-E / 1-5 to answer, arrows to move
  useEffect(() => {
    if (showAll) return;
    const onKey = (e: KeyboardEvent) => {
      if (confirmOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        return;
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else {
        const key = e.key.toUpperCase();
        const n =
          "ABCDE".indexOf(key) + 1 || (/^[1-5]$/.test(key) ? Number(key) : 0);
        if (n && current?.options.some((o) => o.number === n))
          void choose(current, n);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, confirmOpen, current, go, index, showAll]);

  useEffect(() => {
    if (!paletteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPaletteOpen(false);
    };
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [paletteOpen]);

  // Phones / tablets: the status bar is pinned to the bottom of the screen in
  // place of the study tab bar (see body[data-study-test] in study.module.css)
  useEffect(() => {
    document.body.dataset.studyTest = "1";
    return () => {
      delete document.body.dataset.studyTest;
    };
  }, []);

  // The question navigator sticks just below the (sticky) status bar
  useEffect(() => {
    const bar = topbarRef.current;
    if (!bar) return;
    const sync = () =>
      document.documentElement.style.setProperty(
        "--study-test-topbar-height",
        `${bar.offsetHeight}px`,
      );
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(
        "--study-test-topbar-height",
      );
    };
  }, []);

  if (!current) return null;

  const percent = questions.length
    ? Math.round((answered / questions.length) * 100)
    : 0;

  // Timer, progress and submit: a bar above the questions, and (one-page tests on
  // wide screens) the top of the sticky question navigator instead
  const status = (
    <>
      {showAll && (
        <button
          type="button"
          className={styles.paletteToggle}
          onClick={() => setPaletteOpen(true)}
          aria-expanded={paletteOpen}
          aria-controls="test-question-navigator"
          aria-label={`Jump to a question (${answered} of ${questions.length} answered)`}
        >
          <i className="bi bi-grid-3x3-gap" aria-hidden="true" />
          <span>
            {answered}/{questions.length}
          </span>
        </button>
      )}
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
          <span aria-live="polite">
            {saving ? "Saving…" : answered ? "Saved" : ""}
          </span>
        </div>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Answered"
        >
          <div
            className={styles.progressFill}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      {canSubmit && (
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => (unanswered > 0 ? setConfirmOpen(true) : onSubmit())}
          disabled={submitting || saving !== null}
        >
          {submitting ? "Submitting…" : submitLabel}
        </button>
      )}
      {showAll && !canSubmit && nextSection && (
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={nextSection.onGo}
          disabled={saving !== null}
        >
          {nextSection.shortLabel ? (
            <>
              <span className="d-none d-sm-inline">{nextSection.label}</span>
              <span className="d-sm-none">{nextSection.shortLabel}</span>
            </>
          ) : (
            nextSection.label
          )}{" "}
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </button>
      )}
    </>
  );

  return (
    <>
      <div
        ref={topbarRef}
        className={`${styles.testTopbar} ${showAll ? styles.testTopbarSide : ""}`}
        role="region"
        aria-label="Test status"
      >
        {status}
      </div>

      {timed && expired && (
        <div
          className={`${styles.inlineAlert} ${styles.inlineAlertWarn}`}
          role="alert"
        >
          <i className="bi bi-alarm" aria-hidden="true" /> Time is over! Submit
          your test to see your score.
        </div>
      )}

      {header}

      <div className={styles.testLayout}>
        {showAll ? (
          <div className={styles.testAllList} ref={questionRef}>
            {questions.map((q, i) => (
              <section
                key={q.eid}
                id={`test-question-${q.eid}`}
                className={`${styles.card} ${styles.testAllQuestion}`}
                aria-label={`Question ${i + 1}`}
              >
                {q.section && (
                  <div className={`${styles.badge} ${styles.badgeScore} mb-2`}>
                    {q.section}
                  </div>
                )}
                <QuestionView
                  number={i + 1}
                  qid={q.qid}
                  // A passage shared by consecutive questions is shown once
                  story={
                    q.story && q.story !== questions[i - 1]?.story
                      ? q.story
                      : undefined
                  }
                  question={q.question}
                  options={q.options}
                  selected={answers[q.eid] ?? 0}
                  onSelect={(n) => void choose(q, n)}
                  disabled={submitting}
                />
                {saveError?.eid === q.eid && (
                  <div
                    className={`${styles.inlineAlert} ${styles.inlineAlertError} mt-3 mb-0`}
                    role="alert"
                  >
                    {saveError.message}
                  </div>
                )}
              </section>
            ))}
            <div className={`${styles.card} ${styles.testAllSubmit}`}>
              <p className="mb-0">
                <strong>
                  {answered} of {questions.length}
                </strong>{" "}
                questions answered
              </p>
              {nextSection && !canSubmit ? (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={nextSection.onGo}
                  disabled={saving !== null}
                >
                  {nextSection.label}{" "}
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() =>
                    unanswered > 0 ? setConfirmOpen(true) : onSubmit()
                  }
                  disabled={submitting || saving !== null}
                >
                  {submitting ? "Submitting…" : submitLabel}
                </button>
              )}
            </div>
          </div>
        ) : (
          <section
            className={styles.card}
            aria-label={`Question ${index + 1}`}
            ref={questionRef}
          >
            {current.section && (
              <div className={`${styles.badge} ${styles.badgeScore} mb-2`}>
                {current.section}
              </div>
            )}
            <QuestionView
              number={index + 1}
              qid={current.qid}
              story={current.story}
              question={current.question}
              options={current.options}
              selected={answers[current.eid] ?? 0}
              onSelect={(n) => void choose(current, n)}
              disabled={submitting}
            />
            {saveError?.eid === current.eid && (
              <div
                className={`${styles.inlineAlert} ${styles.inlineAlertError} mt-3 mb-0`}
                role="alert"
              >
                {saveError.message}
              </div>
            )}
            <div className={styles.questionFooter}>
              <div className={styles.questionNav}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => go(index - 1)}
                  disabled={index === 0}
                >
                  <i className="bi bi-arrow-left" aria-hidden="true" /> Previous
                </button>
                {index < questions.length - 1 ? (
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => go(index + 1)}
                  >
                    Next <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                ) : nextSection && !canSubmit ? (
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={nextSection.onGo}
                    disabled={saving !== null}
                  >
                    {nextSection.label}{" "}
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() =>
                      unanswered > 0 ? setConfirmOpen(true) : onSubmit()
                    }
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
        )}

        {showAll && (
          <div
            className={`${styles.paletteBackdrop} ${paletteOpen ? styles.paletteBackdropOpen : ""}`}
            onClick={() => setPaletteOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          id="test-question-navigator"
          className={`${styles.card} ${
            showAll
              ? `${styles.paletteSticky} ${styles.paletteSheet} ${paletteOpen ? styles.paletteSheetOpen : ""}`
              : ""
          }`}
          aria-label="Question navigator"
        >
          {showAll && (
            <div
              className={styles.sideStatus}
              role="region"
              aria-label="Test status"
            >
              {status}
            </div>
          )}
          <div className={styles.paletteHead}>
            <h2 className={styles.cardTitle} style={{ fontSize: "0.95rem" }}>
              Questions
            </h2>
            {showAll && (
              <button
                type="button"
                className={styles.paletteClose}
                onClick={() => setPaletteOpen(false)}
                aria-label="Close question list"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className={styles.palette}>
            {questions.map((q, i) => (
              <button
                key={q.eid}
                type="button"
                className={`${styles.paletteCell} ${answers[q.eid] ? styles.paletteAnswered : ""} ${
                  !showAll && i === index ? styles.paletteCurrent : ""
                }`}
                onClick={() => (showAll ? scrollToQuestion(q) : go(i))}
                aria-label={`Question ${i + 1}${answers[q.eid] ? ", answered" : ", not answered"}`}
                aria-current={!showAll && i === index ? "true" : undefined}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className={styles.legend}>
            <span>
              <span
                className={styles.legendSwatch}
                style={{ background: "#002341", borderColor: "#002341" }}
              />
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
        <div
          className={styles.modalBackdrop}
          onClick={() => setConfirmOpen(false)}
        >
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
            <p className={styles.muted}>
              Unanswered questions are marked wrong.
            </p>
            <div className="d-flex gap-2 justify-content-end">
              <button
                type="button"
                className={styles.btnGhost}
                autoFocus
                onClick={() => {
                  setConfirmOpen(false);
                  const firstOpen = questions.findIndex((q) => !answers[q.eid]);
                  if (firstOpen >= 0) {
                    if (showAll) scrollToQuestion(questions[firstOpen]);
                    else go(firstOpen);
                  }
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
