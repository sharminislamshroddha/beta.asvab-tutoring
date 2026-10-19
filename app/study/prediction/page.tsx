import Link from "next/link";
import { StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import { getStudyDashboard, getStudyProgressReport } from "@/lib/study-api";
import { formatStudyDate } from "@/lib/study-types";

export const metadata = { title: "Prediction Tests" };

export default async function StudyPredictionListPage() {
  const [dashboard, progress] = await Promise.all([getStudyDashboard(), getStudyProgressReport()]);
  const crumbs = [{ label: "Dashboard", href: "/study" }, { label: "Prediction Tests" }];

  if (!dashboard.ok) {
    return (
      <>
        <StudyPageHeader title="Prediction Tests" crumbs={crumbs} />
        <StudyNotice code={dashboard.code} message={dashboard.message} />
      </>
    );
  }

  const { course, prediction_tests, access, user } = dashboard.data;
  const results = progress.ok ? progress.data.predictions : [];

  return (
    <>
      <StudyPageHeader
        title={`${course?.name ?? ""} Prediction Test`.trim()}
        subtitle="A full-length test that predicts the score you can expect on the real exam."
        crumbs={crumbs}
      />

      {!access.prediction_tests_enabled ? (
        <StudyNotice
          code="prediction_locked"
          message="You do not have permission to access this section yet. Please contact your instructor for assistance."
        />
      ) : (
        <>
          {!user.is_paid && (
            <div
              className={`${styles.inlineAlert} ${access.can_take_pred_test ? styles.inlineAlertInfo : styles.inlineAlertWarn}`}
              role="status"
            >
              <i className="bi bi-info-circle" aria-hidden="true" />
              <span>
                {access.can_take_pred_test
                  ? "You can take one prediction test for free. Subscribe for unlimited attempts."
                  : "You've used your free prediction test. "}
                {!access.can_take_pred_test && <Link href="/subscribe-again">Subscribe for unlimited attempts</Link>}
              </span>
            </div>
          )}

          <section className={styles.section} aria-labelledby="pred-tests-title">
            <h2 id="pred-tests-title" className={styles.sectionTitle}>
              Choose a test
            </h2>
            <div className={styles.grid}>
              {prediction_tests.map((test) => (
                <Link key={test.pred_test_id} href={`/study/prediction/${test.pred_test_id}`} className={styles.tile}>
                  <span className={`${styles.tileIcon} ${styles.tileIconNavy}`} aria-hidden="true">
                    <i className="bi bi-bullseye" />
                  </span>
                  <span className={styles.tileBody}>
                    <span className={`${styles.tileName} d-block`}>{test.name}</span>
                    <span className={`${styles.tileMeta} d-block`}>{test.shortcode || "Full test"}</span>
                  </span>
                  <i className={`bi bi-chevron-right ${styles.tileChevron}`} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {results.length > 0 && (
        <section className={styles.card} aria-labelledby="pred-results-title">
          <h2 id="pred-results-title" className={styles.cardTitle}>
            <i className="bi bi-trophy" aria-hidden="true" /> Your results
          </h2>
          <ul className={styles.lessonList}>
            {results.map((r) => (
              <li key={r.result_id}>
                <Link href={`/study/prediction/${r.pred_test_id}/result/${r.result_id}`} className={styles.lessonRow}>
                  <span className="flex-grow-1">
                    <span className={`${styles.tileName} d-block`}>{r.name}</span>
                    <span className={`${styles.tileMeta} d-block`}>
                      {formatStudyDate(r.date)}
                      {r.total ? ` · ${r.correct} of ${r.total} correct` : ""}
                    </span>
                  </span>
                  <span className={`${styles.badge} ${styles.badgeScore}`} style={{ fontSize: "0.9rem" }}>
                    Score {r.score}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
