import { notFound, redirect } from "next/navigation";
import CategoryLessons, { type CategoryLesson } from "@/components/study/CategoryLessons";
import { StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import { getStudyCategoryProgress, getStudyDashboard, getStudyLessons } from "@/lib/study-api";

export default async function StudyCategoryPage({ params }: { params: Promise<{ catId: string }> }) {
  const { catId: rawCatId } = await params;
  const catId = Number(rawCatId);
  if (!Number.isInteger(catId) || catId <= 0) notFound();

  const dashboard = await getStudyDashboard();
  const category = dashboard.ok ? dashboard.data.categories.find((c) => c.cat_id === catId) : undefined;
  if (category?.is_flashcard) redirect(`/study/flashcards/${catId}`);

  const [lessons, progress] = await Promise.all([getStudyLessons(catId), getStudyCategoryProgress(catId)]);

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

  const descriptions = new Map((category?.lessons ?? []).map((l) => [l.lesson_id, l.description]));
  const progressById = new Map((progress.ok ? progress.data : []).map((p) => [p.lesson_id, p]));
  const items: CategoryLesson[] = [...lessons.data]
    .sort((a, b) => a.order - b.order)
    .map((lesson, i) => ({
      lesson_id: lesson.lesson_id,
      number: i + 1,
      name: lesson.lesson_name,
      description: descriptions.get(lesson.lesson_id) ?? "",
      locked: lesson.locked,
      progress: progressById.get(lesson.lesson_id) ?? null,
    }));

  return (
    <>
      <StudyPageHeader
        title={title}
        subtitle={`${items.length} ${items.length === 1 ? "lesson" : "lessons"}`}
        crumbs={crumbs}
      />

      {items.length === 0 ? (
        <div className={`${styles.card} ${styles.emptyState}`}>
          <i className="bi bi-journal" aria-hidden="true" />
          No lessons have been published in this topic yet.
        </div>
      ) : (
        <CategoryLessons catId={catId} lessons={items} />
      )}
    </>
  );
}
