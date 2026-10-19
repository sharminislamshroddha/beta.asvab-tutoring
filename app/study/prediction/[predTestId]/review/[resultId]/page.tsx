import Link from "next/link";
import { notFound } from "next/navigation";
import ReviewList from "@/components/study/ReviewList";
import { StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import { getStudyPredictionReview } from "@/lib/study-api";

export const metadata = { title: "Prediction Test Review" };

export default async function StudyPredictionReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ predTestId: string; resultId: string }>;
  searchParams: Promise<{ cat?: string }>;
}) {
  const { predTestId: rawTest, resultId: rawResult } = await params;
  const { cat = "" } = await searchParams;
  const predTestId = Number(rawTest);
  const resultId = Number(rawResult);
  if (![predTestId, resultId].every((n) => Number.isInteger(n) && n > 0)) notFound();

  const review = await getStudyPredictionReview(predTestId, resultId, cat);
  const crumbs = [
    { label: "Dashboard", href: "/study" },
    { label: "Prediction Tests", href: "/study/prediction" },
    { label: "Review" },
  ];

  if (!review.ok) {
    return (
      <>
        <StudyPageHeader title="Answer review" crumbs={crumbs} />
        <StudyNotice code={review.code} message={review.message} />
      </>
    );
  }

  const { cat_id, cat_name, score, sections, questions } = review.data;

  return (
    <>
      <StudyPageHeader
        title={`${cat_name || "Section"}: Answer Review`}
        subtitle={`Section score: ${score}`}
        crumbs={crumbs}
        actions={
          <Link href="/study/prediction" className={styles.btnGhost}>
            Back to prediction tests
          </Link>
        }
      />

      {sections.length > 1 && (
        <nav className={styles.sectionTabs} aria-label="Sections">
          {sections.map((s) =>
            s.result_id && s.cat_id ? (
              <Link
                key={s.key}
                href={`/study/prediction/${predTestId}/review/${s.result_id}?cat=${encodeURIComponent(s.cat_id)}`}
                className={`${styles.sectionTab} ${s.cat_id === cat_id ? styles.sectionTabActive : ""}`}
                aria-current={s.cat_id === cat_id ? "page" : undefined}
                style={{ textDecoration: "none" }}
              >
                {s.label} · {s.score}
              </Link>
            ) : null,
          )}
        </nav>
      )}

      <ReviewList questions={questions} />
    </>
  );
}
