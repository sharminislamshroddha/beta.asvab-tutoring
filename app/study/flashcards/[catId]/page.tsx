import { notFound } from "next/navigation";
import FlashcardDeck from "@/components/study/FlashcardDeck";
import { StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import { getStudyDashboard, getStudyFlashcards } from "@/lib/study-api";

export const metadata = { title: "Flashcards" };

export default async function StudyFlashcardsPage({ params }: { params: Promise<{ catId: string }> }) {
  const { catId: raw } = await params;
  const catId = Number(raw);
  if (!Number.isInteger(catId) || catId <= 0) notFound();

  const [dashboard, cards] = await Promise.all([getStudyDashboard(), getStudyFlashcards(catId)]);
  const name = (dashboard.ok ? dashboard.data.categories.find((c) => c.cat_id === catId)?.name : "") || "Flashcards";
  const crumbs = [{ label: "Dashboard", href: "/study" }, { label: name }];

  return (
    <>
      <StudyPageHeader title={name} subtitle="Read the card, recall the answer, then flip to check." crumbs={crumbs} />
      {!cards.ok ? (
        <StudyNotice code={cards.code} message={cards.message} />
      ) : cards.data.length === 0 ? (
        <div className={`${styles.card} ${styles.emptyState}`}>
          <i className="bi bi-stack" aria-hidden="true" />
          No flashcards yet.
        </div>
      ) : (
        <FlashcardDeck cards={cards.data} />
      )}
    </>
  );
}
