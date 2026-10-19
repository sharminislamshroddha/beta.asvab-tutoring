"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { studyRequest } from "@/lib/study-client";
import {
  normalizePredictionTest,
  num,
  type PredictionTest,
  type StudyErrorCode,
  type TestQuestion,
} from "@/lib/study-types";
import styles from "./study.module.css";
import { StudyNotice } from "./StudyUi";
import TestRunner from "./TestRunner";

type LoadOptions = { catId?: string; fresh?: boolean };

export default function PredictionTestClient({ predTestId }: { predTestId: number }) {
  const router = useRouter();
  const [test, setTest] = useState<PredictionTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: StudyErrorCode; message: string } | null>(null);
  const [resumePrompt, setResumePrompt] = useState(false);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = useCallback(
    async ({ catId, fresh }: LoadOptions = {}) => {
      setLoading(true);
      const params: Record<string, string | number> = { pred_test_id: predTestId };
      if (catId) params.cat_id = catId;
      if (fresh) params.test_type = "freshtest";
      const result = await studyRequest("student-prediction-questions", params);
      setLoading(false);
      if (!result.ok) {
        setError({ code: result.code, message: result.message });
        return null;
      }
      const data = normalizePredictionTest(result.data);
      setTest(data);
      return data;
    },
    [predTestId],
  );

  useEffect(() => {
    void (async () => {
      const data = await load();
      if (data && data.completedTotal > 0) setResumePrompt(true);
      else if (data) setStarted(true);
    })();
  }, [load]);

  const switchSection = async (catId: string) => {
    if (!test || catId === test.cat_id || loading) return;
    await load({ catId });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onAnswer = useCallback(
    async (question: TestQuestion, optionNumber: number) => {
      const wasAnswered = question.myAnswer > 0;
      const result = await studyRequest("student-prediction-answer", {
        pred_test_id: predTestId,
        cat_id: question.cat_id,
        eid: question.eid,
        answer_no: optionNumber,
      });
      if (result.ok && !wasAnswered) {
        question.myAnswer = optionNumber;
        setTest((prev) =>
          prev
            ? {
                ...prev,
                sections: prev.sections.map((s) =>
                  s.cat_id === prev.cat_id ? { ...s, completed: Math.min(s.total, s.completed + 1) } : s,
                ),
              }
            : prev,
        );
      }
      return result.ok;
    },
    [predTestId],
  );

  const onSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError("");
    const result = await studyRequest("student-prediction-submit", { pred_test_id: predTestId });
    if (!result.ok) {
      setSubmitting(false);
      setSubmitError(result.message);
      return;
    }
    const resultId = num(result.data.result_id);
    router.replace(resultId ? `/study/prediction/${predTestId}/result/${resultId}` : "/study/prediction");
  }, [predTestId, router]);

  if (error) {
    return (
      <StudyNotice code={error.code} message={error.message}>
        <Link href="/study/prediction" className={styles.btnGhost}>
          Back to prediction tests
        </Link>
      </StudyNotice>
    );
  }

  if (!test) {
    return (
      <div className={styles.card} aria-busy="true">
        <p className={styles.muted}>Preparing your prediction test…</p>
        <div className={styles.skeleton} style={{ height: 200 }} />
      </div>
    );
  }

  if (resumePrompt && !started) {
    return (
      <section className={styles.card} aria-labelledby="resume-title">
        <h2 id="resume-title" className={styles.cardTitle}>
          <i className="bi bi-arrow-repeat" aria-hidden="true" /> Test in progress
        </h2>
        <p>
          You have already answered {test.completedTotal} of {test.total} questions. Do you want to
          continue or start a new test?
        </p>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => {
              setResumePrompt(false);
              setStarted(true);
            }}
          >
            Continue test
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            disabled={loading}
            onClick={async () => {
              const data = await load({ fresh: true });
              if (data) {
                setResumePrompt(false);
                setStarted(true);
              }
            }}
          >
            Start a new test
          </button>
        </div>
      </section>
    );
  }

  const currentSection = test.sections.find((s) => s.cat_id === test.cat_id);
  const otherSectionsOpen = test.sections
    .filter((s) => s.cat_id !== test.cat_id)
    .reduce((sum, s) => sum + Math.max(0, s.total - s.completed), 0);
  // Next section that still has open questions: after this one first, then earlier skipped ones
  const sectionIndex = test.sections.findIndex((s) => s.cat_id === test.cat_id);
  const isOpen = (s: (typeof test.sections)[number]) => s.cat_id !== test.cat_id && s.completed < s.total;
  const nextSection =
    test.sections.slice(sectionIndex + 1).find(isOpen) ?? test.sections.slice(0, Math.max(sectionIndex, 0)).find(isOpen);

  const sectionTabs = (
    <>
      {submitError && (
        <div className={`${styles.inlineAlert} ${styles.inlineAlertError}`} role="alert">
          {submitError}
        </div>
      )}
      {test.sections.length > 1 && (
        <nav className={styles.sectionTabs} aria-label="Test sections">
          {test.sections.map((s) => {
            const done = s.total > 0 && s.completed >= s.total;
            return (
              <button
                key={s.cat_id}
                type="button"
                className={`${styles.sectionTab} ${s.cat_id === test.cat_id ? styles.sectionTabActive : ""} ${
                  done ? styles.sectionTabDone : ""
                }`}
                aria-current={s.cat_id === test.cat_id ? "step" : undefined}
                onClick={() => void switchSection(s.cat_id)}
                disabled={loading}
                title={s.name}
              >
                {done && <i className="bi bi-check-circle-fill me-1" aria-hidden="true" />}
                {s.shortcode} ({s.completed}/{s.total})
              </button>
            );
          })}
        </nav>
      )}
      <p className={`${styles.muted} mb-3`}>
        <strong style={{ color: "var(--study-navy)" }}>{test.category_name || currentSection?.name}</strong>
        {currentSection ? ` · answer ${currentSection.total} questions to get your ${currentSection.name} score.` : ""}
        {nextSection && (
          <>
            {" "}
            <button
              type="button"
              className="btn btn-link p-0 align-baseline"
              onClick={() => void switchSection(nextSection.cat_id)}
              disabled={loading}
            >
              Next section: {nextSection.name} →
            </button>
          </>
        )}
      </p>
    </>
  );

  if (loading) {
    return (
      <>
        {sectionTabs}
        <div className={styles.card} aria-busy="true">
          <div className={styles.skeleton} style={{ height: 200 }} />
        </div>
      </>
    );
  }

  return (
    <TestRunner
      key={test.cat_id}
      questions={test.questions}
      minutes={currentSection?.minutes ?? 0}
      onAnswer={onAnswer}
      onSubmit={() => void onSubmit()}
      submitting={submitting}
      submitLabel="Submit test"
      header={sectionTabs}
      unansweredOverall={(answeredHere) => otherSectionsOpen + Math.max(0, test.questions.length - answeredHere)}
      nextSection={
        nextSection
          ? { label: `Next section: ${nextSection.shortcode}`, onGo: () => void switchSection(nextSection.cat_id) }
          : undefined
      }
    />
  );
}
