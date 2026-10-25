import Link from "next/link";
import { notFound } from "next/navigation";
import ReviewList from "@/components/study/ReviewList";
import {
  ScoreRing,
  Stat,
  StudyNotice,
  StudyPageHeader,
} from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import { getStudyDashboard, getStudyPracticeReport } from "@/lib/study-api";
import { formatStudyDate } from "@/lib/study-types";

export const metadata = { title: "Practice Test Result" };

function scoreMessage(score: number) {
  if (score >= 85)
    return "Excellent work! You have a strong handle on this lesson.";
  if (score >= 70)
    return "Good job! Review the questions you missed to lock it in.";
  if (score >= 50)
    return "You're getting there. Go over the explanations and try again.";
  return "Keep going. Revisit the study notes and homework, then retake the test.";
}

export default async function StudyPracticeResultPage({
  params,
}: {
  params: Promise<{ catId: string; lessonId: string; resultId: string }>;
}) {
  const {
    catId: rawCat,
    lessonId: rawLesson,
    resultId: rawResult,
  } = await params;
  const catId = Number(rawCat);
  const lessonId = Number(rawLesson);
  const resultId = Number(rawResult);
  if (![catId, lessonId, resultId].every((n) => Number.isInteger(n) && n > 0))
    notFound();

  const [dashboard, review] = await Promise.all([
    getStudyDashboard(),
    getStudyPracticeReport(catId, lessonId, resultId),
  ]);
  const catName =
    (dashboard.ok
      ? dashboard.data.categories.find((c) => c.cat_id === catId)?.name
      : "") || "Lessons";

  if (!review.ok || !review.data.report) {
    return (
      <>
        <StudyPageHeader
          title="Practice test result"
          crumbs={[{ label: "Dashboard", href: "/study" }]}
        />
        <StudyNotice
          code={review.ok ? "not_found" : review.code}
          message={review.ok ? "We couldn't find this result." : review.message}
        />
      </>
    );
  }

  const { report, questions } = review.data;
  const lessonName = report.lesson_name || "Lesson";

  return (
    <>
      <StudyPageHeader
        title={`${report.cat_name || catName} – ${lessonName}: Result`}
        subtitle={
          report.date ? `Submitted ${formatStudyDate(report.date)}` : undefined
        }
        crumbs={[
          { label: "Dashboard", href: "/study" },
          {
            label: report.cat_name || catName,
            href: `/study/category/${catId}`,
          },
          { label: lessonName, href: `/study/lesson/${catId}/${lessonId}` },
          { label: "Result" },
        ]}
        actions={
          <>
            <Link
              href={`/study/practice/${catId}/${lessonId}`}
              className={styles.btnPrimary}
            >
              <i className="bi bi-arrow-repeat" aria-hidden="true" /> Retake
              test
            </Link>
            <Link
              href={`/study/progress?history=cat-${catId}&lesson=${lessonId}#attempt-history`}
              className={styles.btnGhost}
            >
              Progress report
            </Link>
          </>
        }
      />

      <section
        className={`${styles.card} ${styles.section}`}
        aria-label="Score summary"
      >
        <div className={styles.scoreLayout}>
          <ScoreRing value={report.score} label="Score" />
          <div>
            <p
              className="fw-semibold mb-3"
              style={{ color: "var(--study-navy)" }}
            >
              {scoreMessage(report.score)}
            </p>
            <div className={styles.statRow}>
              <Stat value={report.total} label="Questions" />
              <Stat
                value={
                  <span style={{ color: "var(--study-green)" }}>
                    {report.correct}
                  </span>
                }
                label="Correct"
              />
              <Stat
                value={
                  <span style={{ color: "var(--study-red)" }}>
                    {report.wrong}
                  </span>
                }
                label="Wrong / skipped"
              />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="review-title">
        <h2 id="review-title" className={styles.sectionTitle}>
          Review your answers
        </h2>
        <ReviewList questions={questions} />
      </section>
    </>
  );
}
