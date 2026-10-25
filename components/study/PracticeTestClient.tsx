"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { studyRequest } from "@/lib/study-client";
import {
  asRecord,
  normalizePracticeTest,
  num,
  type PracticeTest,
  type StudyErrorCode,
  type TestQuestion,
} from "@/lib/study-types";
import styles from "./study.module.css";
import { StudyNotice } from "./StudyUi";
import TestRunner from "./TestRunner";

export default function PracticeTestClient({
  catId,
  lessonId,
}: {
  catId: number;
  lessonId: number;
}) {
  const router = useRouter();
  const [test, setTest] = useState<PracticeTest | null>(null);
  const [error, setError] = useState<{ code: StudyErrorCode; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await studyRequest("student-practice-questions", { cat_id: catId, lesson_id: lessonId });
      if (cancelled) return;
      if (!result.ok) {
        setError({ code: result.code, message: result.message });
        return;
      }
      const data = normalizePracticeTest(result.data);
      if (data.questions.length === 0) {
        setError({ code: "not_found", message: "This lesson doesn't have practice test questions yet." });
        return;
      }
      setTest(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [catId, lessonId]);

  const onAnswer = useCallback(
    async (question: TestQuestion, optionNumber: number) => {
      const result = await studyRequest("student-practice-answer", {
        cat_id: catId,
        lesson_id: lessonId,
        eid: question.eid,
        answer_no: optionNumber,
      });
      return result.ok;
    },
    [catId, lessonId],
  );

  const onSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError("");
    const result = await studyRequest("student-practice-submit", { cat_id: catId, lesson_id: lessonId });
    const resultId = result.ok ? num(asRecord(result.data.report).result_id) || num(result.data.result_id) : 0;
    if (!result.ok || !resultId) {
      setSubmitting(false);
      setSubmitError(result.ok ? "We couldn't load your score. Please try again." : result.message);
      return;
    }
    router.replace(`/study/practice/${catId}/${lessonId}/result/${resultId}`);
  }, [catId, lessonId, router]);

  if (error) {
    return (
      <StudyNotice code={error.code} message={error.message}>
        <Link href={`/study/lesson/${catId}/${lessonId}`} className={styles.btnGhost}>
          Back to lesson
        </Link>
      </StudyNotice>
    );
  }

  if (!test) {
    return (
      <div className={styles.card} aria-busy="true">
        <p className={styles.muted}>Preparing your practice test…</p>
        <div className={styles.skeleton} style={{ height: 60, marginBottom: 12 }} />
        <div className={styles.skeleton} style={{ height: 200 }} />
      </div>
    );
  }

  return (
    <TestRunner
      questions={test.questions}
      minutes={test.minutes}
      onAnswer={onAnswer}
      onSubmit={() => void onSubmit()}
      submitting={submitting}
      submitLabel="Submit test"
      showAll
      header={
        <>
          {test.answeredCount > 0 && (
            <div className={`${styles.inlineAlert} ${styles.inlineAlertInfo}`} role="status">
              <i className="bi bi-arrow-repeat" aria-hidden="true" /> Welcome back! You already answered{" "}
              {test.answeredCount} question(s). Pick up where you left off.
            </div>
          )}
          {submitError && (
            <div className={`${styles.inlineAlert} ${styles.inlineAlertError}`} role="alert">
              {submitError}
            </div>
          )}
        </>
      }
    />
  );
}
