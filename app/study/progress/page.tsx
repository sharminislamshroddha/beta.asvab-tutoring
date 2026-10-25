import Link from "next/link";
import {
  scoreColor,
  StudyNotice,
  StudyPageHeader,
} from "@/components/study/StudyUi";
import AttemptHistory from "@/components/study/AttemptHistory";
import ScoreBarChart, {
  type ScoreBarRow,
  type ScoreBarSeries,
} from "@/components/study/ScoreBarChart";
import styles from "@/components/study/study.module.css";
import {
  getStudyAttemptHistory,
  getStudyDashboard,
  getStudyProgressReport,
} from "@/lib/study-api";
import {
  formatStudyDate,
  type ProgressLessonRow,
  type ProgressPredictionRow,
} from "@/lib/study-types";

export const metadata = { title: "Progress Report" };

export default async function StudyProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ history?: string; lesson?: string }>;
}) {
  const { history: historyItem, lesson } = await searchParams;
  const [progress, dashboard, history] = await Promise.all([
    getStudyProgressReport(),
    getStudyDashboard(),
    getStudyAttemptHistory(),
  ]);
  const crumbs = [
    { label: "Dashboard", href: "/study" },
    { label: "Progress Report" },
  ];

  if (!progress.ok) {
    return (
      <>
        <StudyPageHeader title="Progress Report" crumbs={crumbs} />
        <StudyNotice code={progress.code} message={progress.message} />
      </>
    );
  }

  const { lessons, predictions } = progress.data;
  const average = lessons.length
    ? Math.round(lessons.reduce((s, r) => s + r.score, 0) / lessons.length)
    : null;
  const bestLesson = lessons.reduce<ProgressLessonRow | null>(
    (top, r) => (!top || r.score > top.score ? r : top),
    null,
  );
  const latestPrediction = [...predictions].sort((a, b) =>
    b.date.localeCompare(a.date),
  )[0];
  const lessonTotal = dashboard.ok
    ? dashboard.data.categories
        .filter((c) => !c.is_flashcard)
        .reduce((sum, c) => sum + c.lesson_total, 0)
    : 0;
  const testedPercent = lessonTotal
    ? Math.min(100, Math.round((lessons.length / lessonTotal) * 100))
    : 0;

  // Overall progress chart: average latest practice score per category (course
  // order), then the latest score on each prediction test
  const courseCategories = dashboard.ok
    ? dashboard.data.categories.filter((c) => !c.is_flashcard)
    : [];
  const chartRows: ScoreBarRow[] = [];
  for (const cat of courseCategories) {
    const tested = lessons.filter((r) => r.cat_id === cat.cat_id);
    if (!tested.length) continue;
    chartRows.push({
      key: `cat-${cat.cat_id}`,
      label: cat.name,
      short: cat.shortcode || cat.name,
      series: "categories",
      value: Math.round(
        tested.reduce((sum, r) => sum + r.score, 0) / tested.length,
      ),
      detail: `${tested.length} ${tested.length === 1 ? "lesson" : "lessons"} tested`,
    });
  }
  const latestByTest = new Map<number, ProgressPredictionRow>();
  for (const r of [...predictions].sort((a, b) =>
    b.date.localeCompare(a.date),
  )) {
    if (!latestByTest.has(r.pred_test_id)) latestByTest.set(r.pred_test_id, r);
  }
  // Prediction tests: average of every attempt (attempt history), else the latest
  const predictionAttempts = history.ok ? history.data.prediction : [];
  for (const r of latestByTest.values()) {
    const attempts = predictionAttempts.filter(
      (a) => a.pred_test_id === r.pred_test_id,
    );
    const average = attempts.length
      ? Math.round(
          attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length,
        )
      : r.score;
    chartRows.push({
      key: `pred-${r.pred_test_id}`,
      label: r.name,
      short:
        (dashboard.ok
          ? dashboard.data.prediction_tests.find(
              (t) => t.pred_test_id === r.pred_test_id,
            )?.shortcode
          : "") || r.name,
      series: "predictions",
      value: average,
      detail: attempts.length
        ? `Average of ${attempts.length} ${attempts.length === 1 ? "attempt" : "attempts"} · latest ${r.score}`
        : `Latest attempt · ${formatStudyDate(r.date)}`,
    });
  }
  const chartSeries: ScoreBarSeries[] = [
    {
      key: "categories",
      label: "Category average",
      color: "#1d5fbf",
      unit: "%",
      passLine: 70,
    },
    {
      key: "predictions",
      label: "Prediction test average",
      color: "#d97a1e",
    },
  ];

  return (
    <>
      <StudyPageHeader
        title="Progress Report"
        subtitle="Your latest practice test score for every lesson, plus your prediction tests."
        crumbs={crumbs}
      />

      <section
        className={`${styles.summaryGrid} ${styles.section}`}
        aria-label="Overview"
      >
        <div className={styles.summaryCard}>
          <span
            className={`${styles.summaryIcon} ${styles.summaryIconNavy}`}
            aria-hidden="true"
          >
            <i className="bi bi-journal-check" />
          </span>
          <span className={styles.summaryLabel}>Lessons tested</span>
          <span className={styles.summaryValue}>
            {lessons.length}
            {lessonTotal > 0 && <small> / {lessonTotal}</small>}
          </span>
          {lessonTotal > 0 && (
            <>
              <span className={styles.summaryMeter} aria-hidden="true">
                <span
                  style={{
                    width: `${testedPercent}%`,
                    background: "var(--study-navy)",
                  }}
                />
              </span>
              <span className={styles.summaryHint}>
                {testedPercent}% of the course
              </span>
            </>
          )}
        </div>

        <div className={styles.summaryCard}>
          <span
            className={`${styles.summaryIcon} ${styles.summaryIconOrange}`}
            aria-hidden="true"
          >
            <i className="bi bi-speedometer2" />
          </span>
          <span className={styles.summaryLabel}>Average score</span>
          <span
            className={styles.summaryValue}
            style={
              average === null ? undefined : { color: scoreColor(average) }
            }
          >
            {average === null ? "–" : `${average}%`}
          </span>
          {average !== null && (
            <>
              <span className={styles.summaryMeter} aria-hidden="true">
                <span
                  style={{
                    width: `${average}%`,
                    background: scoreColor(average),
                  }}
                />
              </span>
              <span className={styles.summaryHint}>
                Across your latest practice tests
              </span>
            </>
          )}
        </div>

        <div className={styles.summaryCard}>
          <span
            className={`${styles.summaryIcon} ${styles.summaryIconGreen}`}
            aria-hidden="true"
          >
            <i className="bi bi-award" />
          </span>
          <span className={styles.summaryLabel}>Best score</span>
          <span className={styles.summaryValue}>
            {bestLesson ? `${bestLesson.score}%` : "–"}
          </span>
          {bestLesson && (
            <span className={styles.summaryHint}>
              {bestLesson.cat_name ? `${bestLesson.cat_name} – ` : ""}
              {bestLesson.lesson_name}
            </span>
          )}
        </div>

        <div className={styles.summaryCard}>
          <span
            className={`${styles.summaryIcon} ${styles.summaryIconBlue}`}
            aria-hidden="true"
          >
            <i className="bi bi-bullseye" />
          </span>
          <span className={styles.summaryLabel}>Latest prediction score</span>
          <span className={styles.summaryValue}>
            {latestPrediction ? latestPrediction.score : "–"}
          </span>
          <span className={styles.summaryHint}>
            {latestPrediction
              ? `${latestPrediction.name} · ${formatStudyDate(latestPrediction.date)}`
              : "No prediction test taken yet"}
          </span>
        </div>
      </section>

      {chartRows.length > 0 && (
        <section className={styles.section} aria-label="Overall progress">
          <ScoreBarChart
            title="Overall Progress"
            subtitle="Average practice test score in each category, and your average score on each prediction test"
            series={chartSeries}
            rows={chartRows}
          />
        </section>
      )}

      {lessons.length === 0 && predictions.length === 0 && (
        <div className={`${styles.card} ${styles.emptyState}`}>
          <i className="bi bi-graph-up" aria-hidden="true" />
          Take your first practice test and your progress will show up here.
          <div className="mt-3">
            <Link href="/study" className={styles.btnPrimary}>
              Go to lessons
            </Link>
          </div>
        </div>
      )}

      {history.ok &&
        (history.data.practice.length > 0 ||
          history.data.prediction.length > 0) && (
          <AttemptHistory
            history={history.data}
            initialSelected={historyItem}
            initialLesson={Number(lesson) || undefined}
            categoryOrder={courseCategories.map((c) => c.cat_id)}
            predictionOrder={
              dashboard.ok
                ? dashboard.data.prediction_tests.map((t) => t.pred_test_id)
                : []
            }
          />
        )}
    </>
  );
}
