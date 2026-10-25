import Link from "next/link";
import { StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import { getStudyDashboard, getStudyProgressReport } from "@/lib/study-api";
import { formatStudyDate, type ProgressPredictionRow } from "@/lib/study-types";

export const metadata = { title: "Prediction Tests" };

function formatMinutes(total: number) {
  if (total <= 0) return "";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes} min`;
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

export default async function StudyPredictionListPage() {
  const [dashboard, progress] = await Promise.all([
    getStudyDashboard(),
    getStudyProgressReport(),
  ]);
  const crumbs = [
    { label: "Dashboard", href: "/study" },
    { label: "Prediction Tests" },
  ];

  if (!dashboard.ok) {
    return (
      <>
        <StudyPageHeader title="Prediction Tests" crumbs={crumbs} />
        <StudyNotice code={dashboard.code} message={dashboard.message} />
      </>
    );
  }

  const {
    course,
    prediction_tests,
    access,
    user,
    open_tests = [],
  } = dashboard.data;
  const results = progress.ok
    ? [...progress.data.predictions].sort((a, b) =>
        b.date.localeCompare(a.date),
      )
    : [];
  const latestByTest = new Map<number, ProgressPredictionRow>();
  for (const r of results) {
    if (!latestByTest.has(r.pred_test_id)) latestByTest.set(r.pred_test_id, r);
  }
  const title = `${course?.name ?? ""} Prediction Tests`.trim();

  return (
    <>
      <StudyPageHeader
        title={title}
        subtitle="Full-length practice exams that predict the score you can expect on the real test."
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
                {!access.can_take_pred_test && (
                  <Link href="/subscribe-again">
                    Subscribe for unlimited attempts
                  </Link>
                )}
              </span>
            </div>
          )}

          <section className={styles.section} aria-label="Prediction tests">
            {prediction_tests.length === 0 ? (
              <div className={`${styles.card} ${styles.emptyState}`}>
                <i className="bi bi-bullseye" aria-hidden="true" />
                No prediction tests are available for your course yet.
              </div>
            ) : (
              <div className={styles.predGrid}>
                {prediction_tests.map((test) => {
                  const sections = test.sections ?? [];
                  const questions = sections.reduce(
                    (sum, s) => sum + s.questions,
                    0,
                  );
                  const minutes = sections.reduce(
                    (sum, s) => sum + s.minutes,
                    0,
                  );
                  const open = open_tests.find(
                    (t) =>
                      t.type === "prediction" &&
                      t.pred_test_id === test.pred_test_id,
                  );
                  const answered =
                    open?.type === "prediction" ? open.answered : 0;
                  const answeredPercent = questions
                    ? Math.min(100, Math.round((answered / questions) * 100))
                    : 0;
                  const latest = latestByTest.get(test.pred_test_id);
                  const status = open ? "progress" : latest ? "done" : "new";
                  const href = `/study/prediction/${test.pred_test_id}`;
                  const meta = [
                    sections.length
                      ? `${sections.length} ${sections.length === 1 ? "section" : "sections"}`
                      : "",
                    questions ? `${questions} questions` : "",
                    minutes ? `about ${formatMinutes(minutes)}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <article
                      key={test.pred_test_id}
                      className={styles.predCard}
                    >
                      <div className={styles.predCardHead}>
                        <span
                          className={styles.predCardIcon}
                          aria-hidden="true"
                        >
                          <i className="bi bi-bullseye" />
                        </span>
                        <div className={styles.predCardTitleWrap}>
                          <h3 className={styles.predCardTitle}>{test.name}</h3>
                          {meta && (
                            <p className={styles.predCardMeta}>{meta}</p>
                          )}
                        </div>
                        {status === "progress" ? (
                          <span
                            className={`${styles.statusPill} ${styles.statusNeedsWork}`}
                          >
                            <i
                              className="bi bi-hourglass-split"
                              aria-hidden="true"
                            />{" "}
                            In progress
                          </span>
                        ) : status === "done" ? (
                          <span
                            className={`${styles.statusPill} ${styles.statusPassed}`}
                          >
                            <i
                              className="bi bi-check-circle-fill"
                              aria-hidden="true"
                            />{" "}
                            Completed
                          </span>
                        ) : (
                          <span
                            className={`${styles.statusPill} ${styles.statusNew}`}
                          >
                            <i className="bi bi-circle" aria-hidden="true" />{" "}
                            Not started
                          </span>
                        )}
                      </div>

                      {sections.length > 0 && (
                        <ul
                          className={styles.predSections}
                          aria-label="Sections"
                        >
                          {sections.map((s) => (
                            <li
                              key={s.cat_id}
                              className={styles.predSection}
                              title={`${s.name}: ${s.questions} questions${s.minutes ? `, ${s.minutes} min` : ""}`}
                            >
                              <strong>{s.shortcode || s.name}</strong>
                              <span>
                                {s.questions}q
                                {s.minutes ? ` · ${s.minutes}m` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {status === "progress" && questions > 0 && (
                        <div className={styles.predProgress}>
                          <div className={styles.progressLabel}>
                            <span>
                              {answered} of {questions} answered
                            </span>
                            <span>{answeredPercent}%</span>
                          </div>
                          <div
                            className={styles.progressBar}
                            aria-hidden="true"
                          >
                            <div
                              className={styles.progressFill}
                              style={{ width: `${answeredPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {latest && (
                        <div className={styles.predLatest}>
                          <span className={styles.predLatestScore}>
                            {latest.score}
                          </span>
                          <span>
                            <span className={styles.predLatestLabel}>
                              Latest predicted score
                            </span>
                            <span className={styles.predLatestDate}>
                              {formatStudyDate(latest.date)}
                              {latest.total
                                ? ` · ${latest.correct} of ${latest.total} correct`
                                : ""}
                            </span>
                          </span>
                        </div>
                      )}

                      <div className={styles.predActions}>
                        {open ? (
                          <Link href={href} className={styles.btnPrimary}>
                            <i className="bi bi-play-fill" aria-hidden="true" />{" "}
                            Resume test
                          </Link>
                        ) : access.can_take_pred_test ? (
                          <Link href={href} className={styles.btnPrimary}>
                            <i
                              className={`bi ${latest ? "bi-arrow-repeat" : "bi-play-fill"}`}
                              aria-hidden="true"
                            />{" "}
                            {latest ? "Retake test" : "Start test"}
                          </Link>
                        ) : (
                          <Link
                            href="/subscribe-again"
                            className={styles.btnPrimary}
                          >
                            <i className="bi bi-unlock" aria-hidden="true" />{" "}
                            Subscribe to retake
                          </Link>
                        )}
                        {latest && (
                          <Link
                            href={`/study/prediction/${latest.pred_test_id}/result/${latest.result_id}`}
                            className={styles.btnGhost}
                          >
                            <i className="bi bi-bar-chart" aria-hidden="true" />{" "}
                            View result
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
