"use client";

import { useMemo, useRef, useState } from "react";
import type { ReviewQuestion } from "@/lib/study-types";
import QuestionView, { Explanation } from "./QuestionView";
import styles from "./study.module.css";
import { useMathTypeset } from "./useMathTypeset";

type Filter = "all" | "correct" | "wrong" | "unanswered";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "correct", label: "Correct" },
  { id: "wrong", label: "Wrong" },
  { id: "unanswered", label: "Unanswered" },
];

/** Answer review after a test (same correct / wrong filters as the web portal). */
export default function ReviewList({ questions }: { questions: ReviewQuestion[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const ref = useRef<HTMLDivElement>(null);
  useMathTypeset(ref, [filter, questions]);

  const counts = useMemo(
    () => ({
      all: questions.length,
      correct: questions.filter((q) => q.status === "correct").length,
      wrong: questions.filter((q) => q.status === "wrong").length,
      unanswered: questions.filter((q) => q.status === "unanswered").length,
    }),
    [questions],
  );
  const shown = filter === "all" ? questions : questions.filter((q) => q.status === filter);

  if (questions.length === 0) {
    return (
      <div className={`${styles.card} ${styles.emptyState}`}>
        <i className="bi bi-list-check" aria-hidden="true" />
        Answer review isn&apos;t available for this test.
      </div>
    );
  }

  let lastSection = "";

  return (
    <div ref={ref}>
      <div className={styles.filterBar} role="group" aria-label="Filter questions">
        {FILTERS.filter((f) => f.id === "all" || counts[f.id] > 0).map((f) => (
          <button
            key={f.id}
            type="button"
            className={`${styles.sectionTab} ${filter === f.id ? styles.sectionTabActive : ""}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label} ({counts[f.id]})
          </button>
        ))}
      </div>

      {shown.map((q, i) => {
        const showSection = q.section && q.section !== lastSection;
        lastSection = q.section || lastSection;
        return (
          <div key={`${q.serial}-${i}`}>
            {showSection && <h3 className={`${styles.sectionTitle} mt-2`}>{q.section}</h3>}
            <article className={`${styles.card} mb-3`} aria-label={`Question ${q.serial || i + 1}`}>
              <div className="d-flex justify-content-end mb-1">
                <span
                  className={`${styles.badge} ${
                    q.status === "correct" ? styles.badgeFree : q.status === "wrong" ? styles.badgeScore : styles.badgeLocked
                  }`}
                  style={q.status === "wrong" ? { background: "var(--study-red-soft)", color: "var(--study-red)" } : undefined}
                >
                  {q.status === "correct" ? "Correct" : q.status === "wrong" ? "Wrong" : "Not answered"}
                </span>
              </div>
              <QuestionView
                number={q.serial || i + 1}
                story={q.story}
                question={q.question}
                options={q.options}
                selected={q.myAnswer}
                correctNumber={q.correctNumber || undefined}
              />
              <Explanation html={q.explanation} />
            </article>
          </div>
        );
      })}
    </div>
  );
}
