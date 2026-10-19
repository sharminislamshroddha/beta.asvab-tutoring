import Link from "next/link";
import { notFound } from "next/navigation";
import HomeworkPanel from "@/components/study/HomeworkPanel";
import LessonVideos from "@/components/study/LessonVideos";
import StudyAccordion from "@/components/study/StudyAccordion";
import { StudyNotice, StudyPageHeader, ScoreBar } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import {
  getStudyDashboard,
  getStudyLessonOverview,
  getStudyLessonStudy,
  getStudyProgressReport,
} from "@/lib/study-api";
import { formatStudyDate } from "@/lib/study-types";

type Tab = "study" | "videos" | "homework" | "practice";

export default async function StudyLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ catId: string; lessonId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { catId: rawCat, lessonId: rawLesson } = await params;
  const { tab: rawTab } = await searchParams;
  const catId = Number(rawCat);
  const lessonId = Number(rawLesson);
  if (!Number.isInteger(catId) || catId <= 0 || !Number.isInteger(lessonId) || lessonId <= 0) notFound();

  const [dashboard, overview, study, progress] = await Promise.all([
    getStudyDashboard(),
    getStudyLessonOverview(catId, lessonId),
    getStudyLessonStudy(catId, lessonId),
    getStudyProgressReport(),
  ]);

  const category = dashboard.ok ? dashboard.data.categories.find((c) => c.cat_id === catId) : undefined;
  const catName = category?.name || (study.ok ? study.data.catName : "") || "Lessons";
  const baseCrumbs = [
    { label: "Dashboard", href: "/study" },
    { label: catName, href: `/study/category/${catId}` },
  ];

  const failed = !overview.ok ? overview : !study.ok ? study : null;
  if (failed) {
    return (
      <>
        <StudyPageHeader title="Lesson" crumbs={baseCrumbs} />
        <StudyNotice code={failed.code} message={failed.message}>
          <Link href={`/study/category/${catId}`} className={styles.btnGhost}>
            Back to {catName}
          </Link>
        </StudyNotice>
      </>
    );
  }
  if (!overview.ok || !study.ok) return null;

  const lesson = overview.data;
  const studyItems = study.data.items;
  const lessonName = lesson.lesson_name || study.data.lessonName;

  const tabs: { id: Tab; label: string; icon: string; count?: number }[] = [];
  if (studyItems.length) tabs.push({ id: "study", label: "Study", icon: "bi-book", count: studyItems.length });
  if (lesson.videos.length) tabs.push({ id: "videos", label: "Videos", icon: "bi-play-btn", count: lesson.videos.length });
  if (lesson.homework_total) tabs.push({ id: "homework", label: "Homework", icon: "bi-pencil-square", count: lesson.homework_total });
  tabs.push({ id: "practice", label: "Practice Test", icon: "bi-clipboard-check" });

  // Same default as the web portal: study when there is study content, else homework
  const requested = tabs.find((t) => t.id === rawTab)?.id;
  const active: Tab = requested ?? (studyItems.length ? "study" : lesson.homework_total ? "homework" : tabs[0].id);

  const attempts = progress.ok
    ? progress.data.lessons.filter((r) => r.lesson_id === lessonId && r.cat_id === catId)
    : [];

  return (
    <>
      <StudyPageHeader title={lessonName} crumbs={[...baseCrumbs, { label: lessonName }]} />

      <nav className={styles.tabs} aria-label="Lesson sections">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/study/lesson/${catId}/${lessonId}?tab=${tab.id}`}
            className={`${styles.tab} ${tab.id === active ? styles.tabActive : ""}`}
            aria-current={tab.id === active ? "page" : undefined}
            scroll={false}
          >
            <i className={`bi ${tab.icon}`} aria-hidden="true" />
            {tab.label}
            {tab.count ? <span className={styles.tabCount}>{tab.count}</span> : null}
          </Link>
        ))}
      </nav>

      {active === "study" && <StudyAccordion items={studyItems} />}

      {active === "videos" && <LessonVideos videos={lesson.videos} />}

      {active === "homework" && <HomeworkPanel catId={catId} lessonId={lessonId} />}

      {active === "practice" && (
        <section className={styles.card} aria-labelledby="practice-title">
          <h2 id="practice-title" className={styles.cardTitle}>
            <i className="bi bi-clipboard-check" aria-hidden="true" /> Practice test
          </h2>
          {lesson.practice_test_total > 0 ? (
            <>
              <p className={styles.muted}>
                {lesson.practice_test_total} questions on {lessonName}. Your answers are saved as you go,
                so you can leave and continue later. Submit when you are done to see your score and
                review every answer.
              </p>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <Link href={`/study/practice/${catId}/${lessonId}`} className={styles.btnPrimary}>
                  <i className="bi bi-play-fill" aria-hidden="true" /> Start practice test
                </Link>
                {lesson.homework_total > 0 && (
                  <Link href={`/study/lesson/${catId}/${lessonId}?tab=homework`} className={styles.btnGhost}>
                    Warm up with homework first
                  </Link>
                )}
              </div>
            </>
          ) : (
            <p className={styles.muted}>There is no practice test for this lesson yet.</p>
          )}

          {attempts.length > 0 && (
            <>
              <h3 className={`${styles.sectionTitle} mt-3`} style={{ fontSize: "1rem" }}>
                Your latest result
              </h3>
              <ul className={styles.lessonList}>
                {attempts.map((a) => (
                  <li key={a.result_id}>
                    <Link
                      href={`/study/practice/${catId}/${lessonId}/result/${a.result_id}`}
                      className={styles.lessonRow}
                    >
                      <span className="flex-grow-1">
                        <span className={`${styles.tileName} d-block`}>{formatStudyDate(a.date)}</span>
                        <span className={`${styles.tileMeta} d-block`}>
                          {a.correct} of {a.total} correct · view answers
                        </span>
                      </span>
                      <span style={{ width: 130 }}>
                        <ScoreBar score={a.score} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </>
  );
}
