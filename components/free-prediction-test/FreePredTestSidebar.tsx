"use client";

import React from "react";
import type { PackagesByService } from "@/lib/package-types";
import type { CategoryScore, PredScoreFeedback } from "@/lib/prediction-test-types";
import { getPredScoreExcellenceThreshold, getPredScoreFeedback } from "@/lib/prediction-test-types";
import { getFullPredictionTestCheckoutHref } from "@/lib/prediction-test-links";
import PredictionTestPromoCard from "@/components/prediction-test/PredictionTestPromoCard";
import ctaStyles from "@/components/prediction-test/predictionTestCta.module.css";
import SidebarProgressBar from "./SidebarProgressBar";
import styles from "./freePredTest.module.css";

type CategoryProgress = {
  name: string;
  answeredCount: number;
  totalQuestions: number;
  isComplete: boolean;
};

type Props = {
  testSubmitted: boolean;
  predScore: number | null;
  predTestName?: string;
  catScores?: Record<string, CategoryScore>;
  categoryProgress: CategoryProgress[];
  completedSectionCount: number;
  totalSectionCount: number;
  courseName: string;
  courseCode: string;
  passingScore?: number;
  courseId: number;
  gradeMainId?: number;
  packagesByService?: PackagesByService;
};

export default function FreePredTestSidebar({
  testSubmitted,
  predScore,
  predTestName,
  catScores,
  categoryProgress,
  completedSectionCount,
  totalSectionCount,
  courseName,
  courseCode,
  passingScore,
  courseId,
  gradeMainId,
  packagesByService,
}: Props) {
  const excellenceScore = getPredScoreExcellenceThreshold(courseCode);
  const feedback: PredScoreFeedback | null =
    testSubmitted && predScore != null
      ? getPredScoreFeedback(predScore, courseCode, courseName, passingScore)
      : null;
  const fullPredictionTestHref = getFullPredictionTestCheckoutHref({
    courseCode,
    courseId,
    mainCourseId: gradeMainId,
    packagesByService,
  });

  return (
    <div className={ctaStyles.ctaStack}>
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
        <div
          className="text-white text-center px-4 pt-4 pb-3"
          style={{ backgroundColor: "#002341" }}
        >
          {!feedback ? (
            <>
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                style={{
                  width: "64px",
                  height: "64px",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "2px dashed rgba(255,255,255,0.2)",
                }}
              >
                <i className="bi bi-clipboard-check fs-4 opacity-75" aria-hidden />
              </div>
              <h6 className="fw-bold mb-1">Your Prediction Score</h6>
              <p className="small opacity-75 mb-0 px-1">
                Complete all sections and submit to see your predicted exam score.
              </p>
            </>
          ) : (
            <>
              {predTestName ? (
                <p className={`fw-bold mb-3 ${styles.predTestName}`}>{predTestName}</p>
              ) : null}
              <div className={styles.scoreGaugeStack}>
                <span
                  className={`badge rounded-pill mb-3 ${styles.scoreBadge}`}
                  style={{ backgroundColor: feedback.color }}
                >
                  <i className={`bi ${feedback.iconClass} me-1`} aria-hidden />
                  {feedback.badgeText}
                </span>
                <div
                  className={`rounded-circle d-flex flex-column justify-content-center align-items-center mx-auto ${styles.scoreGauge}`}
                  style={{
                    width: "100px",
                    height: "100px",
                    border: `5px solid ${feedback.color}`,
                    backgroundColor: "#001d36",
                  }}
                >
                  <span className="fs-3 fw-bold lh-1">{predScore}</span>
                  <span className="small opacity-75" style={{ fontSize: "0.65rem" }}>
                    Score
                  </span>
                </div>
              </div>
              <p className="small opacity-85 mb-0 px-1">{feedback.message}</p>
            </>
          )}

          <div
            className="mt-3 pt-3 text-start"
            style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}
          >
            {!testSubmitted ? (
              <>
                <div className="d-flex justify-content-between align-items-center small mb-2">
                  <span className="opacity-75 fw-semibold">Sections complete</span>
                  <span className="fw-semibold">
                    {completedSectionCount}/{totalSectionCount}
                  </span>
                </div>
                <SidebarProgressBar
                  answered={completedSectionCount}
                  total={totalSectionCount}
                  className="mb-0"
                />

                <p className="small opacity-75 mb-2 fw-semibold mt-3">
                  Number of Questions Answered:
                </p>
                {categoryProgress.map((cat) => (
                  <div key={cat.name} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center small mb-1">
                      <span className={`opacity-75 ${cat.isComplete ? "text-white" : ""}`}>
                        {cat.isComplete ? (
                          <i
                            className="bi bi-check-circle-fill me-1 text-success"
                            aria-hidden
                          />
                        ) : null}
                        {cat.name}
                      </span>
                      <span className="fw-semibold">
                        {cat.answeredCount}/{cat.totalQuestions}
                      </span>
                    </div>
                    <SidebarProgressBar
                      answered={cat.answeredCount}
                      total={cat.totalQuestions}
                    />
                  </div>
                ))}
              </>
            ) : catScores ? (
              <div className="text-start mb-3">
                <p className="small opacity-75 mb-2 fw-semibold">Section Scores</p>
                {Object.entries(catScores).map(([shortcode, score]) => (
                  <div
                    key={shortcode}
                    className="d-flex justify-content-between align-items-center small mb-2"
                  >
                    <span className="opacity-75">{shortcode}</span>
                    <span className="fw-semibold">
                      {score.score != null ? score.score : "—"}
                    </span>
                  </div>
                ))}

                <p
                  className="small opacity-75 mb-2 fw-semibold mt-3 pt-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}
                >
                  Section Results
                </p>
                {Object.entries(catScores).map(([shortcode, score]) => {
                  const correct = Number(score.num_correct_ans) || 0;
                  const incorrect = Number(score.num_wrong_ans) || 0;

                  return (
                    <div key={`${shortcode}-results`} className={`mb-3 ${styles.sectionResultRow}`}>
                      <div className="d-flex justify-content-between align-items-center small mb-1">
                        <span className="opacity-75 fw-semibold">{shortcode}</span>
                      </div>
                      <div
                        className={`d-flex rounded-3 overflow-hidden ${styles.sectionResultSplit}`}
                      >
                        <div
                          className="flex-fill py-2 text-center"
                          style={{ backgroundColor: "rgba(25, 135, 84, 0.22)" }}
                        >
                          <div className="fw-bold fs-6 lh-1" style={{ color: "#8fe8b0" }}>
                            {correct}
                          </div>
                          <div
                            className="small opacity-90"
                            style={{ fontSize: "0.65rem", color: "#b8f0cc" }}
                          >
                            Correct
                          </div>
                        </div>
                        <div
                          className="flex-fill py-2 text-center"
                          style={{
                            backgroundColor: "rgba(220, 53, 69, 0.22)",
                            borderLeft: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <div className="fw-bold fs-6 lh-1" style={{ color: "#f5a8ae" }}>
                            {incorrect}
                          </div>
                          <div
                            className="small opacity-90"
                            style={{ fontSize: "0.65rem", color: "#f8c4c8" }}
                          >
                            Incorrect
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {testSubmitted && feedback ? (
        <PredictionTestPromoCard
          href={fullPredictionTestHref || "#"}
          eyebrow="Upgrade Your Prediction"
          title={`Get the full ${courseName || "exam"} prediction score`}
          text={`Take the full ${courseName || "exam"} prediction test for a more accurate result — without visiting the recruiter's office.`}
          courseName={courseName}
          excellenceScore={excellenceScore}
          benefits={[
            `All ${courseName} topics`,
            `Exactly the same questions as the real ${courseName} exam`,
            `Full ${courseName} prediction score`,
          ]}
          buttonLabel="Take a Full Prediction Test"
          disabled={!fullPredictionTestHref}
        />
      ) : null}
    </div>
  );
}
