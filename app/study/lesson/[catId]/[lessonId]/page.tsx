import Link from "next/link";
import { notFound } from "next/navigation";
import PracticeTestClient from "@/components/study/PracticeTestClient";
import HomeworkPanel from "@/components/study/HomeworkPanel";
import LessonVideos from "@/components/study/LessonVideos";
import StudyAccordion from "@/components/study/StudyAccordion";
import { StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import {
  getStudyDashboard,
  getStudyLessonOverview,
  getStudyLessonStudy,
} from "@/lib/study-api";

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

  const [dashboard, overview, study] = await Promise.all([
    getStudyDashboard(),
    getStudyLessonOverview(catId, lessonId),
    getStudyLessonStudy(catId, lessonId),
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
  tabs.push({ id: "practice", label: "Practice Test", icon: "bi-clipboard-check", count: lesson.practice_test_total });

  // Same default as the web portal: study when there is study content, else homework
  const requested = tabs.find((t) => t.id === rawTab)?.id;
  const active: Tab = requested ?? (studyItems.length ? "study" : lesson.homework_total ? "homework" : tabs[0].id);

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

      {active === "practice" &&
        (lesson.practice_test_total > 0 ? (
          <PracticeTestClient catId={catId} lessonId={lessonId} />
        ) : (
          <div className={`${styles.card} ${styles.emptyState}`}>
            <i className="bi bi-clipboard" aria-hidden="true" />
            There is no practice test for this lesson yet.
          </div>
        ))}
    </>
  );
}
