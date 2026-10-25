import Link from "next/link";
import { notFound } from "next/navigation";
import AsvabScoreReport from "@/components/study/AsvabScoreReport";
import PredictionSectionTable from "@/components/study/PredictionSectionTable";
import { Stat, StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import { getStudyPredictionReport } from "@/lib/study-api";
import { formatStudyDate, type ScoreCard } from "@/lib/study-types";

export const metadata = { title: "Prediction Test Result" };

function ScoreCardTile({
  card,
  reviewHref,
}: {
  card: ScoreCard;
  reviewHref?: string;
}) {
  return (
    <div
      className={styles.tile}
      style={{
        alignItems: "flex-start",
        flexDirection: "column",
        gap: "0.35rem",
      }}
    >
      <span className={styles.tileMeta} style={{ margin: 0, fontWeight: 600 }}>
        {card.label}
      </span>
      <span
        style={{
          fontSize: "1.6rem",
          fontWeight: 800,
          color: "var(--study-navy)",
          lineHeight: 1,
        }}
      >
        {card.score}
      </span>
      {card.total ? (
        <span className={styles.tileMeta} style={{ margin: 0 }}>
          {card.correct} of {card.total} correct
        </span>
      ) : null}
      {reviewHref && (
        <Link
          href={reviewHref}
          className="small fw-semibold"
          style={{ color: "var(--study-orange)" }}
        >
          Review answers →
        </Link>
      )}
    </div>
  );
}

export default async function StudyPredictionResultPage({
  params,
}: {
  params: Promise<{ predTestId: string; resultId: string }>;
}) {
  const { predTestId: rawTest, resultId: rawResult } = await params;
  const predTestId = Number(rawTest);
  const resultId = Number(rawResult);
  if (![predTestId, resultId].every((n) => Number.isInteger(n) && n > 0))
    notFound();

  const report = await getStudyPredictionReport(predTestId, resultId);
  const crumbs = [
    { label: "Dashboard", href: "/study" },
    { label: "Prediction Tests", href: "/study/prediction" },
    { label: "Result" },
  ];

  if (!report.ok) {
    return (
      <>
        <StudyPageHeader title="Prediction test result" crumbs={crumbs} />
        <StudyNotice code={report.code} message={report.message} />
      </>
    );
  }

  const {
    main,
    sections,
    composites,
    feedback,
    canReview,
    test_name,
    date,
    asvab,
  } = report.data;
  // Test categories only: VE, the GT scores and AFQT have no questions of their own
  const categorySections = sections.filter((card) => card.cat_id && card.total);

  return (
    <>
      <StudyPageHeader
        title={test_name ? `${test_name}: Result` : "Prediction test result"}
        subtitle={date ? `Taken ${formatStudyDate(date)}` : undefined}
        crumbs={crumbs}
        actions={
          <>
            <Link
              href={`/study/prediction/${predTestId}`}
              className={styles.btnPrimary}
            >
              <i className="bi bi-arrow-repeat" aria-hidden="true" /> Take again
            </Link>
            <Link
              href={`/study/progress?history=pred-${predTestId}#attempt-history`}
              className={styles.btnGhost}
            >
              Progress report
            </Link>
          </>
        }
      />

      {asvab ? (
        <>
          <AsvabScoreReport report={asvab} />
          {categorySections.length > 0 && (
            <section
              className={styles.section}
              aria-labelledby="asvab-review-title"
            >
              <h2 id="asvab-review-title" className={styles.sectionTitle}>
                Review your answers
              </h2>
              <PredictionSectionTable
                predTestId={predTestId}
                sections={categorySections}
                canReview={canReview}
              />
              {!canReview && (
                <p className={`${styles.muted} small mt-2`}>
                  Subscribe to review every answer with explanations.{" "}
                  <Link href="/subscribe-again">Subscribe</Link>
                </p>
              )}
            </section>
          )}
        </>
      ) : (
        <>
          <section
            className={`${styles.card} ${styles.section}`}
            aria-label="Predicted score"
          >
            <div className={styles.scoreLayout}>
              <div className="text-center px-3">
                <div
                  className={styles.muted}
                  style={{ fontSize: "0.85rem", fontWeight: 600 }}
                >
                  Predicted score
                </div>
                <div
                  style={{
                    fontSize: "3.5rem",
                    fontWeight: 800,
                    color: "var(--study-navy)",
                    lineHeight: 1.1,
                  }}
                >
                  {main ? main.score : "–"}
                </div>
              </div>
              <div>
                {feedback ? (
                  <div className={styles.feedback}>
                    <p className={styles.feedbackTitle}>{feedback.title}</p>
                    <p className="mb-0">{feedback.message}</p>
                    {feedback.officialLabel && (
                      <p className="small mt-2 mb-0">
                        {feedback.officialLabel}
                      </p>
                    )}
                  </div>
                ) : null}
                {main?.total ? (
                  <div className={`${styles.statRow} mt-3`}>
                    <Stat value={main.total} label="Questions" />
                    <Stat
                      value={
                        <span style={{ color: "var(--study-green)" }}>
                          {main.correct}
                        </span>
                      }
                      label="Correct"
                    />
                    <Stat
                      value={
                        <span style={{ color: "var(--study-red)" }}>
                          {(main.total ?? 0) - (main.correct ?? 0)}
                        </span>
                      }
                      label="Wrong / skipped"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {sections.length > 0 && (
            <section
              className={styles.section}
              aria-labelledby="sections-title"
            >
              <h2 id="sections-title" className={styles.sectionTitle}>
                Section scores
              </h2>
              <PredictionSectionTable
                predTestId={predTestId}
                sections={sections}
                canReview={canReview}
              />
              {!canReview && (
                <p className={`${styles.muted} small mt-2`}>
                  Subscribe to review every answer with explanations.{" "}
                  <Link href="/subscribe-again">Subscribe</Link>
                </p>
              )}
            </section>
          )}

          {composites.length > 0 && (
            <section
              className={styles.section}
              aria-labelledby="composites-title"
            >
              <h2 id="composites-title" className={styles.sectionTitle}>
                Composite scores
              </h2>
              <div className={styles.grid}>
                {composites.map((card) => (
                  <ScoreCardTile key={card.key} card={card} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
