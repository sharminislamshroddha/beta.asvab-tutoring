"use client";

import Link from "next/link";
import { useState } from "react";
import {
  formatStudyDate,
  type AttemptHistory as History,
  type PracticeAttempt,
  type PredictionAttempt,
} from "@/lib/study-types";
import { ScoreBar } from "./StudyUi";
import styles from "./study.module.css";

/** Change from the previous attempt (attempts are newest first) */
function Change({ now, before }: { now: number; before?: number }) {
  if (before === undefined)
    return <span className={styles.attemptFirst}>First try</span>;
  const diff = now - before;
  if (diff === 0) return <span className={styles.attemptSame}>No change</span>;
  return (
    <span className={diff > 0 ? styles.trendUp : styles.trendDown}>
      <i
        className={`bi ${diff > 0 ? "bi-arrow-up-short" : "bi-arrow-down-short"}`}
        aria-hidden="true"
      />
      {Math.abs(diff)}
      <span className={styles.srOnly}>
        {" "}
        {diff > 0 ? "higher" : "lower"} than the previous attempt
      </span>
    </span>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string | number) {
  const map = new Map<string | number, T[]>();
  for (const item of items)
    map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return map;
}

function AttemptRows({
  attempts,
  unit,
  link,
  lockedNote,
}: {
  attempts: (PracticeAttempt | PredictionAttempt)[];
  unit: string;
  link: (a: PracticeAttempt | PredictionAttempt) => string;
  lockedNote: string;
}) {
  const best = Math.max(...attempts.map((a) => a.score));
  return (
    <ol className={styles.attemptList}>
      <li
        className={`${styles.attemptRow} ${styles.attemptHeader}`}
        aria-hidden="true"
      >
        <span>Attempt</span>
        <span>Date</span>
        <span>Correct</span>
        <span className={styles.attemptScore}>Score</span>
        <span className={styles.attemptChange}>Change</span>
        <span />
      </li>
      {attempts.map((a, i) => (
        <li key={a.result_id} className={styles.attemptRow}>
          <span className={styles.attemptNo}>#{attempts.length - i}</span>
          <span className={styles.attemptDate}>{formatStudyDate(a.date)}</span>
          <span className={styles.attemptCorrect}>
            {a.total ? (
              <>
                <span>
                  <strong className={styles.attemptCorrectCount}>
                    {a.correct}
                  </strong>
                  <span className={styles.attemptCorrectTotal}>/{a.total}</span>
                </span>
                <span className={styles.attemptCorrectBar} aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.round((a.correct / a.total) * 100)}%`,
                    }}
                  />
                </span>
              </>
            ) : null}
          </span>
          <span className={styles.attemptScore}>
            <span
              className={`${styles.attemptScoreBadge} ${a.score === best ? styles.attemptScoreBest : ""}`}
            >
              {a.score === best && (
                <i className="bi bi-trophy-fill" aria-hidden="true" />
              )}
              {a.score}
              {unit}
              {a.score === best && (
                <span className={styles.srOnly}> (best score)</span>
              )}
            </span>
          </span>
          <span className={styles.attemptChange}>
            <Change now={a.score} before={attempts[i + 1]?.score} />
          </span>
          <span className={styles.attemptAction}>
            {a.can_open ? (
              <Link href={link(a)} className={styles.attemptLink}>
                <i className="bi bi-eye" aria-hidden="true" />
                {unit === "%" ? "Review" : "View report"}
              </Link>
            ) : (
              <span className={styles.attemptLocked} title={lockedNote}>
                <i className="bi bi-lock" aria-hidden="true" />
                <span className={styles.srOnly}>{lockedNote}</span>
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function AttemptHistory({
  history,
  categoryOrder = [],
  predictionOrder = [],
  initialSelected,
  initialLesson,
}: {
  history: History;
  /** Chip to show first, e.g. "cat-12" or "pred-23" (coming back from a result) */
  initialSelected?: string;
  /** Lesson to expand in that category */
  initialLesson?: number;
  /** cat_ids in course order */
  categoryOrder?: number[];
  /** pred_test_ids in course order */
  predictionOrder?: number[];
}) {
  const rank = (order: number[], id: number) => {
    const at = order.indexOf(id);
    return at < 0 ? Infinity : at;
  };
  const categories = [
    ...groupBy(history.practice, (a) => a.cat_id).values(),
  ].sort(
    (a, b) =>
      rank(categoryOrder, a[0].cat_id) - rank(categoryOrder, b[0].cat_id),
  );
  const predictionTests = [
    ...groupBy(history.prediction, (a) => a.pred_test_id).values(),
  ].sort(
    (a, b) =>
      rank(predictionOrder, a[0].pred_test_id) -
      rank(predictionOrder, b[0].pred_test_id),
  );

  const navItems = [
    ...categories.map((attempts) => ({
      id: `cat-${attempts[0].cat_id}`,
      code: attempts[0].cat_shortcode || attempts[0].cat_name,
      name: attempts[0].cat_name,
      count: attempts.length,
    })),
    ...predictionTests.map((attempts) => ({
      id: `pred-${attempts[0].pred_test_id}`,
      code: attempts[0].shortcode || attempts[0].name,
      name: attempts[0].name,
      count: attempts.length,
    })),
  ];
  const [selected, setSelected] = useState(
    navItems.find((item) => item.id === initialSelected)?.id ??
      navItems[0]?.id ??
      "",
  );
  const current = navItems.find((item) => item.id === selected) ?? navItems[0];
  if (!current) return null;

  const catAttempts = categories.find(
    (a) => `cat-${a[0].cat_id}` === current.id,
  );
  const predAttempts = predictionTests.find(
    (a) => `pred-${a[0].pred_test_id}` === current.id,
  );

  return (
    <section
      id="attempt-history"
      className={`${styles.card} ${styles.section} ${styles.historySection}`}
      aria-labelledby="attempt-history-title"
    >
      <h2 id="attempt-history-title" className={styles.cardTitle}>
        <i className="bi bi-clock-history" aria-hidden="true" /> Attempt history
      </h2>

      <div
        className={styles.historyNav}
        role="tablist"
        aria-label="Choose a category or prediction test"
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`history-tab-${item.id}`}
            aria-selected={item.id === current.id}
            aria-controls="history-panel"
            title={item.name}
            className={`${styles.historyNavChip} ${item.id === current.id ? styles.historyNavChipActive : ""}`}
            onClick={() => setSelected(item.id)}
          >
            {item.code}
            <span className={styles.filterCount}>{item.count}</span>
          </button>
        ))}
      </div>

      <div
        id="history-panel"
        role="tabpanel"
        aria-labelledby={`history-tab-${current.id}`}
        className={styles.historyPanel}
      >
        <h3 className={styles.historyGroupTitle}>
          {current.name}
          <span>
            {current.count} {current.count === 1 ? "attempt" : "attempts"}
          </span>
        </h3>

        {catAttempts &&
          [...groupBy(catAttempts, (a) => a.lesson_id).values()]
            .sort((a, b) => a[0].lesson_order - b[0].lesson_order)
            .map((attempts, _i, lessons) => {
              const latest = attempts[0];
              const best = Math.max(...attempts.map((a) => a.score));
              const average = Math.round(
                attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length,
              );
              return (
                <details
                  key={latest.lesson_id}
                  className={styles.historyItem}
                  open={
                    lessons.length === 1 || latest.lesson_id === initialLesson
                  }
                >
                  <summary
                    className={`${styles.historySummary} ${styles.historySummaryAvg}`}
                  >
                    <span className={styles.historyName}>
                      {latest.lesson_name}
                      <small>
                        {attempts.length}{" "}
                        {attempts.length === 1 ? "attempt" : "attempts"}
                        {attempts.length > 1 ? ` · best ${best}%` : ""}
                      </small>
                    </span>
                    <span className={styles.historyLatest}>
                      <span className={styles.historyLatestLabel}>Avg</span>
                      <span className={styles.historyAvgBar}>
                        <ScoreBar score={average} />
                      </span>
                    </span>
                    <i
                      className={`bi bi-chevron-down ${styles.historyChevron}`}
                      aria-hidden="true"
                    />
                  </summary>
                  <AttemptRows
                    attempts={attempts}
                    unit="%"
                    link={(a) =>
                      `/study/practice/${(a as PracticeAttempt).cat_id}/${(a as PracticeAttempt).lesson_id}/result/${a.result_id}`
                    }
                    lockedNote="Renew your subscription to review this lesson"
                  />
                </details>
              );
            })}

        {predAttempts && (
          <div className={styles.historyItem}>
            <div className={styles.predStats}>
              <div className={`${styles.predStat} ${styles.predStatBest}`}>
                <i className="bi bi-trophy-fill" aria-hidden="true" />
                <span>
                  <span className={styles.predStatLabel}>Best score</span>
                  <span className={styles.predStatValue}>
                    {Math.max(...predAttempts.map((a) => a.score))}
                  </span>
                </span>
              </div>
              <div className={styles.predStat}>
                <i className="bi bi-calendar3" aria-hidden="true" />
                <span>
                  <span className={styles.predStatLabel}>Latest attempt</span>
                  <span className={styles.predStatValue}>
                    {formatStudyDate(predAttempts[0].date)}
                  </span>
                </span>
              </div>
              <div className={styles.predStat}>
                <i className="bi bi-arrow-repeat" aria-hidden="true" />
                <span>
                  <span className={styles.predStatLabel}>Attempts</span>
                  <span className={styles.predStatValue}>
                    {predAttempts.length}
                  </span>
                </span>
              </div>
            </div>
            <AttemptRows
              attempts={predAttempts}
              unit=""
              link={(a) =>
                `/study/prediction/${(a as PredictionAttempt).pred_test_id}/result/${a.result_id}`
              }
              lockedNote="This report is not available"
            />
          </div>
        )}
      </div>
    </section>
  );
}
