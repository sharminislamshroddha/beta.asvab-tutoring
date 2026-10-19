import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StudyNotice, StudyPageHeader, ScoreBar } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import { getStudyDashboard, getStudyLessons, getStudyProgressReport } from "@/lib/study-api";

export default async function StudyCategoryPage({ params }: { params: Promise<{ catId: string }> }) {
  const { catId: rawCatId } = await params;
  const catId = Number(rawCatId);
  if (!Number.isInteger(catId) || catId <= 0) notFound();

  const dashboard = await getStudyDashboard();
  const category = dashboard.ok ? dashboard.data.categories.find((c) => c.cat_id === catId) : undefined;
  if (category?.is_flashcard) redirect(`/study/flashcards/${catId}`);

  const [lessons, progress] = await Promise.all([getStudyLessons(catId), getStudyProgressReport()]);

  const title = category?.name || "Lessons";
  const crumbs = [{ label: "Dashboard", href: "/study" }, { label: title }];

  if (!lessons.ok) {
    return (
      <>
        <StudyPageHeader title={title} crumbs={crumbs} />
        <StudyNotice code={lessons.code} message={lessons.message} />
      </>
    );
  }

  const latestScore = new Map<number, number>();
  if (progress.ok) {
    for (const row of progress.data.lessons) {
      if (row.cat_id === catId) latestScore.set(row.lesson_id, row.score);
    }
  }
  const sorted = [...lessons.data].sort((a, b) => a.order - b.order);
  const completed = sorted.filter((l) => latestScore.has(l.lesson_id)).length;

  return (
    <>
      <StudyPageHeader
        title={title}
        subtitle={`${sorted.length} ${sorted.length === 1 ? "lesson" : "lessons"} · ${completed} tested`}
        crumbs={crumbs}
      />

      {sorted.length === 0 ? (
        <div className={`${styles.card} ${styles.emptyState}`}>
          <i className="bi bi-journal" aria-hidden="true" />
          No lessons have been published in this topic yet.
        </div>
      ) : (
        <ol className={styles.lessonList} aria-label={`${title} lessons`}>
          {sorted.map((lesson, i) => {
            const score = latestScore.get(lesson.lesson_id);
            const body = (
              <>
                <span className={styles.lessonNumber} aria-hidden="true">
                  {lesson.locked ? <i className="bi bi-lock" /> : i + 1}
                </span>
                <span className="flex-grow-1" style={{ minWidth: 0 }}>
                  <span className={`${styles.tileName} d-block`}>{lesson.lesson_name}</span>
                  <span className={`${styles.tileMeta} d-block`}>
                    {lesson.locked
                      ? "Included with the full course"
                      : score === undefined
                        ? "Study, homework and practice test"
                        : "Latest practice test score"}
                  </span>
                </span>
                {lesson.locked ? (
                  <span className={`${styles.badge} ${styles.badgeLocked}`}>Locked</span>
                ) : score !== undefined ? (
                  <span style={{ width: 130 }}>
                    <ScoreBar score={score} />
                  </span>
                ) : (
                  <i className={`bi bi-chevron-right ${styles.tileChevron}`} aria-hidden="true" />
                )}
              </>
            );
            return (
              <li key={lesson.lesson_id}>
                {lesson.locked ? (
                  <Link
                    href="/subscribe-again"
                    className={`${styles.lessonRow} ${styles.lessonRowLocked}`}
                    aria-label={`${lesson.lesson_name} (locked, renew to unlock)`}
                  >
                    {body}
                  </Link>
                ) : (
                  <Link href={`/study/lesson/${catId}/${lesson.lesson_id}`} className={styles.lessonRow}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
