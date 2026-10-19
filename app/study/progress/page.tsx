import Link from "next/link";
import { ScoreBar, Stat, StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import { getStudyProgressReport } from "@/lib/study-api";
import { formatStudyDate, type ProgressLessonRow } from "@/lib/study-types";

export const metadata = { title: "Progress Report" };

export default async function StudyProgressPage() {
  const progress = await getStudyProgressReport();
  const crumbs = [{ label: "Dashboard", href: "/study" }, { label: "Progress Report" }];

  if (!progress.ok) {
    return (
      <>
        <StudyPageHeader title="Progress Report" crumbs={crumbs} />
        <StudyNotice code={progress.code} message={progress.message} />
      </>
    );
  }

  const { lessons, predictions } = progress.data;
  const byCategory = new Map<string, ProgressLessonRow[]>();
  for (const row of lessons) {
    const key = row.cat_name || "Other";
    byCategory.set(key, [...(byCategory.get(key) ?? []), row]);
  }
  const average = lessons.length ? Math.round(lessons.reduce((s, r) => s + r.score, 0) / lessons.length) : null;
  const best = lessons.length ? Math.max(...lessons.map((r) => r.score)) : null;
  const latestPrediction = predictions[0];

  return (
    <>
      <StudyPageHeader
        title="Progress Report"
        subtitle="Your latest practice test score for every lesson, plus your prediction tests."
        crumbs={crumbs}
      />

      <section className={`${styles.statRow} ${styles.section}`} aria-label="Overview">
        <Stat value={lessons.length} label="Lessons tested" />
        <Stat value={average === null ? "–" : `${average}%`} label="Average score" />
        <Stat value={best === null ? "–" : `${best}%`} label="Best score" />
        <Stat value={latestPrediction ? latestPrediction.score : "–"} label="Latest prediction score" />
      </section>

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

      {[...byCategory.entries()].map(([catName, rows]) => (
        <section key={catName} className={`${styles.card} ${styles.section}`} aria-label={catName}>
          <h2 className={styles.cardTitle}>{catName}</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Lesson</th>
                <th scope="col">Date</th>
                <th scope="col">Correct</th>
                <th scope="col">Score</th>
                <th scope="col">
                  <span className={styles.srOnly}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.result_id}>
                  <td data-label="Lesson" className="fw-semibold">
                    {r.lesson_name}
                  </td>
                  <td data-label="Date">{formatStudyDate(r.date)}</td>
                  <td data-label="Correct">
                    {r.correct}/{r.total}
                  </td>
                  <td data-label="Score">
                    <ScoreBar score={r.score} />
                  </td>
                  <td data-label="" className="text-md-end">
                    {r.canOpen ? (
                      <Link href={`/study/practice/${r.cat_id}/${r.lesson_id}/result/${r.result_id}`} className="small fw-semibold">
                        Review
                      </Link>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeLocked}`}>Locked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {predictions.length > 0 && (
        <section className={styles.card} aria-labelledby="progress-pred-title">
          <h2 id="progress-pred-title" className={styles.cardTitle}>
            <i className="bi bi-bullseye" aria-hidden="true" /> Prediction tests
          </h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Test</th>
                <th scope="col">Date</th>
                <th scope="col">Correct</th>
                <th scope="col">Predicted score</th>
                <th scope="col">
                  <span className={styles.srOnly}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p) => (
                <tr key={p.result_id}>
                  <td data-label="Test" className="fw-semibold">
                    {p.name}
                  </td>
                  <td data-label="Date">{formatStudyDate(p.date)}</td>
                  <td data-label="Correct">{p.total ? `${p.correct}/${p.total}` : "–"}</td>
                  <td data-label="Predicted score">
                    <strong>{p.score}</strong>
                  </td>
                  <td data-label="" className="text-md-end">
                    <Link href={`/study/prediction/${p.pred_test_id}/result/${p.result_id}`} className="small fw-semibold">
                      View report
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
