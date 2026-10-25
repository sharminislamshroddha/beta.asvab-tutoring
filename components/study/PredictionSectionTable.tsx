"use client";

import { Fragment, useState } from "react";
import { studyRequest } from "@/lib/study-client";
import {
  normalizePredictionReview,
  type ReviewQuestion,
  type ScoreCard,
} from "@/lib/study-types";
import ReviewList from "./ReviewList";
import styles from "./study.module.css";

type Loaded =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; questions: ReviewQuestion[] };

/**
 * Section scores of a prediction test result. "Review" opens that section's
 * answers in a row right below it; several sections can be open at once.
 */
export default function PredictionSectionTable({
  predTestId,
  sections,
  canReview,
}: {
  predTestId: number;
  sections: ScoreCard[];
  canReview: boolean;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [reviews, setReviews] = useState<Record<string, Loaded>>({});

  const toggle = async (card: ScoreCard) => {
    if (open.has(card.key)) {
      setOpen((prev) => {
        const next = new Set(prev);
        next.delete(card.key);
        return next;
      });
      return;
    }
    setOpen((prev) => new Set(prev).add(card.key));
    if (reviews[card.key]?.status === "ready") return;

    setReviews((prev) => ({ ...prev, [card.key]: { status: "loading" } }));
    const result = await studyRequest("student-prediction-review", {
      pred_test_id: predTestId,
      result_id: card.result_id ?? 0,
      cat_id: card.cat_id ?? "",
    });
    setReviews((prev) => ({
      ...prev,
      [card.key]: result.ok
        ? {
            status: "ready",
            questions: normalizePredictionReview(result.data).questions,
          }
        : { status: "error", message: result.message },
    }));
  };

  return (
    <div className={`${styles.card} ${styles.sectionTableCard}`}>
      <table className={`${styles.table} ${styles.sectionTable}`}>
        <thead>
          <tr>
            <th scope="col">Section</th>
            <th scope="col">Correct</th>
            <th scope="col" className={styles.sectionTableScore}>
              Score
            </th>
            <th scope="col">
              <span className={styles.srOnly}>Review</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sections.map((card) => {
            const reviewable =
              canReview && Boolean(card.result_id && card.cat_id);
            const isOpen = open.has(card.key);
            const review = reviews[card.key];
            const panelId = `section-review-${card.key}`;
            return (
              <Fragment key={card.key}>
                <tr className={isOpen ? styles.sectionRowOpen : undefined}>
                  <td data-label="Section" className="fw-semibold">
                    {card.label}
                  </td>
                  <td data-label="Correct">
                    {card.total ? (
                      <span className={styles.attemptCorrect}>
                        <span>
                          <strong className={styles.attemptCorrectCount}>
                            {card.correct ?? 0}
                          </strong>
                          <span className={styles.attemptCorrectTotal}>
                            /{card.total}
                          </span>
                        </span>
                        <span
                          className={styles.attemptCorrectBar}
                          aria-hidden="true"
                        >
                          <span
                            style={{
                              width: `${Math.round(((card.correct ?? 0) / card.total) * 100)}%`,
                            }}
                          />
                        </span>
                      </span>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td data-label="Score" className={styles.sectionTableScore}>
                    <span className={styles.attemptScoreBadge}>
                      {card.score}
                    </span>
                  </td>
                  <td data-label="" className="text-md-end">
                    {reviewable && (
                      <button
                        type="button"
                        className={`${styles.attemptLink} ${isOpen ? styles.attemptLinkActive : ""}`}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => void toggle(card)}
                      >
                        <i
                          className={`bi ${isOpen ? "bi-chevron-up" : "bi-eye"}`}
                          aria-hidden="true"
                        />
                        {isOpen ? "Hide review" : "Review"}
                      </button>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr className={styles.sectionReviewRow}>
                    <td colSpan={4} id={panelId}>
                      {!review || review.status === "loading" ? (
                        <div aria-busy="true">
                          <p className={`${styles.muted} mb-2`}>
                            Loading {card.label} answers…
                          </p>
                          <div
                            className={styles.skeleton}
                            style={{ height: 120 }}
                          />
                        </div>
                      ) : review.status === "error" ? (
                        <div
                          className={`${styles.inlineAlert} ${styles.inlineAlertError} mb-0`}
                          role="alert"
                        >
                          {review.message}
                        </div>
                      ) : review.questions.length === 0 ? (
                        <p className={`${styles.muted} mb-0`}>
                          There are no questions to review in this section.
                        </p>
                      ) : (
                        <ReviewList questions={review.questions} />
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
