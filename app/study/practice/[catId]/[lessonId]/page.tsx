import { notFound } from "next/navigation";
import PracticeTestClient from "@/components/study/PracticeTestClient";
import { StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import { getStudyDashboard, getStudyLessonOverview } from "@/lib/study-api";

export const metadata = { title: "Practice Test" };

export default async function StudyPracticePage({
  params,
}: {
  params: Promise<{ catId: string; lessonId: string }>;
}) {
  const { catId: rawCat, lessonId: rawLesson } = await params;
  const catId = Number(rawCat);
  const lessonId = Number(rawLesson);
  if (!Number.isInteger(catId) || catId <= 0 || !Number.isInteger(lessonId) || lessonId <= 0) notFound();

  const [dashboard, overview] = await Promise.all([getStudyDashboard(), getStudyLessonOverview(catId, lessonId)]);
  const catName =
    (dashboard.ok ? dashboard.data.categories.find((c) => c.cat_id === catId)?.name : "") || "Lessons";
  const lessonName = overview.ok ? overview.data.lesson_name : "Lesson";
  const crumbs = [
    { label: "Dashboard", href: "/study" },
    { label: catName, href: `/study/category/${catId}` },
    { label: lessonName, href: `/study/lesson/${catId}/${lessonId}?tab=practice` },
    { label: "Practice test" },
  ];

  return (
    <>
      <StudyPageHeader title={`${lessonName}: Practice Test`} crumbs={crumbs} />
      {overview.ok ? (
        <PracticeTestClient catId={catId} lessonId={lessonId} lessonName={lessonName} />
      ) : (
        <StudyNotice code={overview.code} message={overview.message} />
      )}
    </>
  );
}
