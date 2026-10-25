import { cookies } from "next/headers";
import Link from "next/link";
import CourseOverviewVideo from "@/components/study/CourseOverviewVideo";
import { StudyNotice } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import { getStudyDashboard, getStudyProgressReport } from "@/lib/study-api";
import { openTestKey, STUDY_LAST_TEST_COOKIE } from "@/lib/study-types";

export const metadata = { title: "Dashboard" };

export default async function StudyDashboardPage() {
  const [dashboard, progress, cookieStore] = await Promise.all([
    getStudyDashboard(),
    getStudyProgressReport(),
    cookies(),
  ]);

  if (!dashboard.ok) {
    return <StudyNotice code={dashboard.code} message={dashboard.message} />;
  }

  const { user, course, overview_video, categories, prediction_tests, access } =
    dashboard.data;

  if (!course) {
    return (
      <StudyNotice
        code="no_course"
        message="Once you enroll in a course, your lessons, practice tests and progress will appear here."
      />
    );
  }

  const lessonResults = progress.ok ? progress.data.lessons : [];
  const average = lessonResults.length
    ? Math.round(
        lessonResults.reduce((sum, r) => sum + r.score, 0) /
          lessonResults.length,
      )
    : null;
  const lastResult = [...lessonResults].sort((a, b) =>
    b.date.localeCompare(a.date),
  )[0];

  // Continue the unfinished test answered last (this browser remembers which one;
  // otherwise the newest open test), else the lesson tested last
  const openTests = dashboard.data.open_tests ?? [];
  const lastTestKey = cookieStore.get(STUDY_LAST_TEST_COOKIE)?.value;
  const openTest =
    openTests.find((t) => openTestKey(t) === lastTestKey) ?? openTests[0];
  const continueLink = openTest
    ? openTest.type === "practice"
      ? {
          href: `/study/lesson/${openTest.cat_id}/${openTest.lesson_id}?tab=practice`,
          label: `${openTest.cat_name} – ${openTest.name}`,
          detail: `Practice test · ${openTest.answered} of ${openTest.total} answered`,
        }
      : {
          href: `/study/prediction/${openTest.pred_test_id}`,
          label: openTest.name,
          detail: `Prediction test · ${openTest.answered} answered`,
        }
    : lastResult
      ? {
          href: `/study/lesson/${lastResult.cat_id}/${lastResult.lesson_id}`,
          label: `${lastResult.cat_name ? `${lastResult.cat_name} – ` : ""}${lastResult.lesson_name}`,
          detail: "",
        }
      : null;

  return (
    <>
      <section className={styles.hero} aria-labelledby="study-hero-title">
        <div>
          <h1 id="study-hero-title" className={styles.heroTitle}>
            Welcome back{user.first_name ? `, ${user.first_name}` : ""}!
          </h1>
          <p className={styles.heroText}>
            {course.name} online test prep. Pick a topic, work through the
            lessons and check your score with a practice test.
          </p>
          {continueLink && (
            <div className="mt-3">
              <Link href={continueLink.href} className={styles.btnPrimary}>
                <i className="bi bi-play-circle" aria-hidden="true" />
                Continue: {continueLink.label}
              </Link>
              {continueLink.detail && (
                <p className={`${styles.heroText} small mt-2 mb-0`}>
                  {continueLink.detail}
                </p>
              )}
            </div>
          )}
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <div className={styles.heroStatValue}>{lessonResults.length}</div>
            <div className={styles.heroStatLabel}>Lessons tested</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatValue}>
              {average === null ? "–" : `${average}%`}
            </div>
            <div className={styles.heroStatLabel}>Average score</div>
          </div>
        </div>
      </section>

      {!user.is_paid && (
        <div
          className={`${styles.inlineAlert} ${styles.inlineAlertWarn}`}
          role="status"
        >
          <i className="bi bi-info-circle" aria-hidden="true" />
          <span>
            You have limited access. Free lessons are open; renew your
            subscription to unlock every lesson, flashcards and unlimited
            prediction tests. <Link href="/subscribe-again">Renew now</Link>
          </span>
        </div>
      )}

      {overview_video && (
        <section
          className={`${styles.section} ${styles.card}`}
          aria-labelledby="overview-title"
        >
          <h2 id="overview-title" className={styles.cardTitle}>
            <i className="bi bi-play-btn" aria-hidden="true" /> {course.name}{" "}
            Course Overview
          </h2>
          <CourseOverviewVideo
            desktopId={overview_video.desktop_id}
            mobileId={overview_video.mobile_id}
          />
        </section>
      )}

      <section className={styles.section} aria-labelledby="topics-title">
        <h2 id="topics-title" className={styles.sectionTitle}>
          {course.name} Online Test Prep
        </h2>
        {categories.length === 0 ? (
          <div className={`${styles.card} ${styles.emptyState}`}>
            <i className="bi bi-journal" aria-hidden="true" />
            Lessons for this course are on their way.
          </div>
        ) : (
          <div className={styles.grid}>
            {categories.map((cat) =>
              cat.is_flashcard ? (
                <Link
                  key={cat.cat_id}
                  href={`/study/flashcards/${cat.cat_id}`}
                  className={styles.tile}
                >
                  <span className={styles.tileIcon} aria-hidden="true">
                    <i className="bi bi-stack" />
                  </span>
                  <span className={styles.tileBody}>
                    <span className={`${styles.tileName} d-block`}>
                      {cat.name}
                    </span>
                    <span className={`${styles.tileMeta} d-block`}>
                      Quick review cards
                    </span>
                  </span>
                  <i
                    className={`bi bi-chevron-right ${styles.tileChevron}`}
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                <Link
                  key={cat.cat_id}
                  href={`/study/category/${cat.cat_id}`}
                  className={styles.tile}
                >
                  <span className={styles.tileIcon} aria-hidden="true">
                    {(cat.shortcode || cat.name).slice(0, 3).toUpperCase()}
                  </span>
                  <span className={styles.tileBody}>
                    <span className={`${styles.tileName} d-block`}>
                      {cat.name}
                    </span>
                    <span className={`${styles.tileMeta} d-block`}>
                      {cat.lesson_total}{" "}
                      {cat.lesson_total === 1 ? "lesson" : "lessons"}
                    </span>
                  </span>
                  <i
                    className={`bi bi-chevron-right ${styles.tileChevron}`}
                    aria-hidden="true"
                  />
                </Link>
              ),
            )}
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="tests-title">
        <h2 id="tests-title" className={styles.sectionTitle}>
          Tests &amp; Results
        </h2>
        <div className={styles.grid}>
          {prediction_tests.length > 0 && (
            <Link href="/study/prediction" className={styles.tile}>
              <span
                className={`${styles.tileIcon} ${styles.tileIconNavy}`}
                aria-hidden="true"
              >
                <i className="bi bi-bullseye" />
              </span>
              <span className={styles.tileBody}>
                <span className={`${styles.tileName} d-block`}>
                  {prediction_tests.length === 1
                    ? prediction_tests[0].name || "Prediction Test"
                    : `${course.name} Prediction Tests`}
                </span>
                <span className={`${styles.tileMeta} d-block`}>
                  {access.prediction_tests_enabled
                    ? "Predict your real exam score"
                    : "Enabled by your instructor"}
                </span>
              </span>
              <i
                className={`bi bi-chevron-right ${styles.tileChevron}`}
                aria-hidden="true"
              />
            </Link>
          )}
          <Link href="/study/progress" className={styles.tile}>
            <span
              className={`${styles.tileIcon} ${styles.tileIconNavy}`}
              aria-hidden="true"
            >
              <i className="bi bi-graph-up-arrow" />
            </span>
            <span className={styles.tileBody}>
              <span className={`${styles.tileName} d-block`}>
                Progress Report
              </span>
              <span className={`${styles.tileMeta} d-block`}>
                Scores for every test you took
              </span>
            </span>
            <i
              className={`bi bi-chevron-right ${styles.tileChevron}`}
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
    </>
  );
}
