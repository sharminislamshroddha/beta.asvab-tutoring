"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import Link from "next/link";
import Script from "next/script";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import CoursePricingPanel from "@/components/pricing/CoursePricingPanel";
import prepStyles from "@/components/pricing/coursePricing.module.css";
import freeTestStyles from "@/components/free-test/freeTest.module.css";
import styles from "./freePredTest.module.css";
import {
  typesetMathJax,
  ACTIVE_CATEGORY_STYLE,
  INACTIVE_CATEGORY_STYLE,
} from "@/utils/mathjax";
import QuestionHtml from "@/components/free-test/QuestionHtml";
import type { PackagesByService } from "@/lib/package-types";
import type {
  FreePredTestQuestion,
  FreePredTestScoreResponse,
} from "@/lib/prediction-test-types";
import {
  prepareFreePredTestQuestions,
  buildPredTestScorePayload,
} from "@/lib/prediction-test-types";
import {
  getCategoryDescription,
  getFreeTestCategoryNames,
  shuffleAllQuestionsByCategory,
  type FreeTestCategory,
  type PreparedTestQuestion,
} from "@/lib/course-types";
import { calculateFreePredTestScore } from "@/lib/php-api-client";
import { getFreePredictionTestDescription } from "@/lib/page-metadata";
import FreePredTestSidebar from "./FreePredTestSidebar";
import IncompleteCategoriesModal from "./IncompleteCategoriesModal";
import TestRulesIntro from "@/components/free-test/TestRulesIntro";

const BREADCRUMB_SEGMENTS = (courseCode: string) =>
  ["courses", courseCode, "free-prediction-test"] as const;

const BREADCRUMB_TITLE = "Free Prediction Test";

const TOP_SCROLL_BELOW_SHOW_ALL_PADDING = -120;

/** Bootstrap lg breakpoint — sidebar stacks below main content below this width. */
const MOBILE_MAX_WIDTH_PX = 991.98;

/** Pixels above the results sidebar when auto-scrolling after submit on mobile. */
const POST_SUBMIT_RESULTS_SCROLL_TOP_PADDING = 120;

export interface TestResult {
  question: string;
  story?: string | null;
  story_title?: string | null;
  story_id?: string | number | null;
  options: string[];
  userAnswer: number | null;
  correctAnswer: number;
  isCorrect: boolean;
}

type UserAnswers = Record<string, number>;

interface FreePredTestProps {
  courseName: string;
  /** How-to card name. Variant courses append the selected grade. */
  rulesCourseName?: string;
  predictionTestName?: string;
  courseCode: string;
  courseId: number;
  /** Grade MAIN for variant courses; used on the full-prediction checkout link. */
  gradeMainId?: number;
  ft_categories?: FreeTestCategory[];
  ft_ques_list?: { [key: string]: FreePredTestQuestion[] };
  packagesByService?: PackagesByService;
  /** Variant courses hide the test until the student picks a grade. */
  awaitingGrade?: boolean;
  /** Rendered above the test, below the page heading. Used for the grade picker. */
  headerSlot?: React.ReactNode;
}

function ShowAllFreePredictionTestsLink({
  anchorRef,
}: {
  anchorRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div ref={anchorRef} className={`container ${styles.showAllTestsWrap}`}>
      <Link
        href="/free-prediction-tests"
        className={`btn btn-secondary-custom px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2 ${styles.showAllTestsBtn}`}
      >
        <i className="bi bi-clipboard-check" aria-hidden />
        Show all Free Prediction Tests
      </Link>
    </div>
  );
}

function shouldShowStoryPassage(
  question: FreePredTestQuestion,
  previousQuestion?: FreePredTestQuestion,
): boolean {
  if (!question.story?.trim() || !question.story_id) return false;
  return String(question.story_id) !== String(previousQuestion?.story_id ?? "");
}

function shouldShowStoryPassageForResult(
  result: TestResult,
  previousResult?: TestResult,
): boolean {
  if (!result.story?.trim() || !result.story_id) return false;
  return String(result.story_id) !== String(previousResult?.story_id ?? "");
}

function StoryPassage({
  story,
  storyTitle,
}: {
  story: string;
  storyTitle?: string | null;
}) {
  return (
    <div
      className={`mb-4 p-3 rounded-3 border bg-light ${styles.storyPassage}`}
    >
      {storyTitle?.trim() ? (
        <h6 className="fw-semibold mb-2 text-secondary">{storyTitle}</h6>
      ) : null}
      <QuestionHtml html={story} />
    </div>
  );
}

function CategoryDescription({ html }: { html: string }) {
  return (
    <div
      className={`mb-4 p-3 rounded-3 border bg-light ${styles.categoryDescription}`}
    >
      <QuestionHtml html={html} />
    </div>
  );
}

function UnavailableMessage({
  courseName,
  predictionTestName,
  courseCode,
  headerSlot,
}: {
  courseName?: string;
  predictionTestName?: string;
  courseCode: string;
  headerSlot?: React.ReactNode;
}) {
  const testName = predictionTestName?.trim() || courseName?.trim() || "COURSE";

  return (
    <>
      <div className="page-title-area text-white py-5">
        <div className="container text-center">
          <h1>
            FREE {testName.toUpperCase()} PREDICTION TEST
          </h1>
          <h2 className="h4">
            {getFreePredictionTestDescription(courseCode)}
          </h2>
          <Breadcrumb
            segments={[...BREADCRUMB_SEGMENTS(courseCode)]}
            segmentLabels={{ 1: courseName || courseCode.toUpperCase() }}
            dynamicTitle={BREADCRUMB_TITLE}
          />
        </div>
      </div>
      <ShowAllFreePredictionTestsLink />
      <div className="container pb-5">
        {headerSlot ? <div className="mb-4">{headerSlot}</div> : null}
        <div className="row justify-content-center">
          <div className="col-lg-8 text-center">
            <div className="alert alert-info">
              <h3>No Free Prediction Test Available</h3>
              <p>
                Sorry, currently there are no free prediction tests available for
                this course. Check back again later.
              </p>
              <Link
                href={`/courses/${encodeURIComponent(courseCode)}`}
                className="btn btn-primary-custom mt-3"
              >
                Back to Course
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function FreePredTest({
  courseName,
  rulesCourseName,
  predictionTestName,
  courseCode,
  courseId,
  gradeMainId,
  ft_categories,
  ft_ques_list,
  packagesByService,
  awaitingGrade = false,
  headerSlot,
}: FreePredTestProps) {
  const categoryNames = useMemo(
    () => getFreeTestCategoryNames(ft_categories ?? []),
    [ft_categories],
  );
  const [activeCategory, setActiveCategory] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<FreePredTestScoreResponse | null>(
    null,
  );
  const [reviewResults, setReviewResults] = useState<Record<number, TestResult[]>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [questionsByCategory, setQuestionsByCategory] = useState<
    Record<string, PreparedTestQuestion<FreePredTestQuestion>[]>
  >(() => {
    if (!ft_categories?.length || !ft_ques_list) return {};
    const prepared = prepareFreePredTestQuestions(ft_categories, ft_ques_list);
    if (!prepared.sufficient) return {};
    return shuffleAllQuestionsByCategory(
      getFreeTestCategoryNames(ft_categories),
      prepared.questionsByCategory,
    );
  });
  const skipCourseShuffleRef = useRef(true);
  const [mathJaxReady, setMathJaxReady] = useState(false);

  const mathContentRef = useRef<HTMLDivElement>(null);
  const showAllTestsRef = useRef<HTMLDivElement>(null);
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  const shouldScrollAfterSubmitRef = useRef(false);

  const scrollToTestTop = useCallback(() => {
    const el = showAllTestsRef.current;
    if (!el) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const rect = el.getBoundingClientRect();
    const targetTop =
      window.scrollY + rect.bottom + TOP_SCROLL_BELOW_SHOW_ALL_PADDING;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  }, []);

  const scrollToResultsSection = useCallback(() => {
    const el = resultsSectionRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const targetTop =
      window.scrollY + rect.top - POST_SUBMIT_RESULTS_SCROLL_TOP_PADDING;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }, []);

  const scrollAfterSubmit = useCallback(() => {
    const isMobile = window.matchMedia(
      `(max-width: ${MOBILE_MAX_WIDTH_PX}px)`,
    ).matches;

    if (isMobile) {
      scrollToResultsSection();
    } else {
      scrollToTestTop();
    }
  }, [scrollToTestTop, scrollToResultsSection]);

  const runTypeset = useCallback(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await typesetMathJax(mathContentRef.current);
    setMathJaxReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!mathJaxReady) return;
    void typesetMathJax(mathContentRef.current);
  }, [testSubmitted, activeCategory, reviewResults, mathJaxReady]);

  useLayoutEffect(() => {
    if (mathJaxReady || !mathContentRef.current) return;
    if (!window.MathJax?.Hub) return;
    void (async () => {
      await typesetMathJax(mathContentRef.current);
      setMathJaxReady(true);
    })();
  }, [mathJaxReady, ft_categories]);

  useLayoutEffect(() => {
    if (!shouldScrollAfterSubmitRef.current || !testSubmitted) return;
    shouldScrollAfterSubmitRef.current = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollAfterSubmit();
      });
    });
  }, [testSubmitted, scrollAfterSubmit]);

  const { sufficient: hasSufficientQuestions, questionsByCategory: rawQuestionsByCategory } =
    useMemo(() => {
      if (!ft_categories?.length || !ft_ques_list) {
        return { sufficient: false, questionsByCategory: {} };
      }
      return prepareFreePredTestQuestions(ft_categories, ft_ques_list);
    }, [ft_categories, ft_ques_list]);

  useEffect(() => {
    if (skipCourseShuffleRef.current) {
      skipCourseShuffleRef.current = false;
      return;
    }
    if (!hasSufficientQuestions || !ft_categories) {
      setQuestionsByCategory({});
      return;
    }
    setQuestionsByCategory(
      shuffleAllQuestionsByCategory(categoryNames, rawQuestionsByCategory),
    );
  }, [ft_categories, ft_ques_list, hasSufficientQuestions, rawQuestionsByCategory, categoryNames]);

  const testName = predictionTestName?.trim() || courseName?.trim() || "COURSE";
  const howToCourseName = rulesCourseName?.trim() || testName;

  if (awaitingGrade) {
    return (
      <>
        <div className="page-title-area text-white py-5">
          <div className="container text-center">
            <h1>FREE {testName.toUpperCase()} PREDICTION TEST</h1>
            <h2 className="h4">
              {getFreePredictionTestDescription(courseCode)}
            </h2>
            <Breadcrumb
              segments={[...BREADCRUMB_SEGMENTS(courseCode)]}
              segmentLabels={{ 1: courseName || courseCode.toUpperCase() }}
              dynamicTitle={BREADCRUMB_TITLE}
            />
          </div>
        </div>
        <ShowAllFreePredictionTestsLink anchorRef={showAllTestsRef} />
        <div className="container pb-5">
          <div className="row g-4">
            {headerSlot ? <div className="col-12">{headerSlot}</div> : null}
            <div className="col-12">
              <TestRulesIntro
                variant="prediction"
                courseName={howToCourseName}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!ft_categories || !ft_ques_list || ft_categories.length === 0) {
    return (
      <UnavailableMessage
        courseName={courseName}
        predictionTestName={predictionTestName}
        courseCode={courseCode}
        headerSlot={headerSlot}
      />
    );
  }

  if (!hasSufficientQuestions) {
    return (
      <UnavailableMessage
        courseName={courseName}
        predictionTestName={predictionTestName}
        courseCode={courseCode}
        headerSlot={headerSlot}
      />
    );
  }

  const activeCategoryName = categoryNames[activeCategory];
  const questions = questionsByCategory[activeCategoryName] || [];
  const isFirstCategory = activeCategory === 0;
  const isLastCategory = activeCategory === categoryNames.length - 1;

  const getAnsweredCount = (
    catIdx: number,
    catQuestions: PreparedTestQuestion<FreePredTestQuestion>[],
  ) =>
    catQuestions.reduce(
      (count, _, qIndex) =>
        userAnswers[`${catIdx}-${qIndex}`] !== undefined ? count + 1 : count,
      0,
    );

  const isCategoryComplete = (catIdx: number) => {
    const catName = categoryNames[catIdx];
    const catQuestions = questionsByCategory[catName] || [];
    return (
      getAnsweredCount(catIdx, catQuestions) === catQuestions.length &&
      catQuestions.length > 0
    );
  };

  const incompleteCategories = (() => {
    const names: string[] = [];
    const indices: number[] = [];
    categoryNames.forEach((name, idx) => {
      if (!isCategoryComplete(idx)) {
        names.push(name);
        indices.push(idx);
      }
    });
    return { names, indices };
  })();

  const allCategoriesComplete = incompleteCategories.names.length === 0;
  const completedSectionCount = categoryNames.filter((_, idx) =>
    isCategoryComplete(idx),
  ).length;

  const categoryProgress = categoryNames.map((name, idx) => {
    const catQuestions = questionsByCategory[name] || [];
    const answered = getAnsweredCount(idx, catQuestions);
    return {
      name,
      answeredCount: answered,
      totalQuestions: catQuestions.length,
      isComplete: answered === catQuestions.length && catQuestions.length > 0,
    };
  });

  const handleAnswerChange = (
    categoryIndex: number,
    questionIndex: number,
    optionIndex: number,
  ) => {
    if (testSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [`${categoryIndex}-${questionIndex}`]: optionIndex,
    }));
  };

  const buildReviewResults = (): Record<number, TestResult[]> => {
    const allResults: Record<number, TestResult[]> = {};
    categoryNames.forEach((catName, catIdx) => {
      const catQuestions = questionsByCategory[catName] || [];
      allResults[catIdx] = catQuestions.map((pq, qIndex) => {
        const userAnswer = userAnswers[`${catIdx}-${qIndex}`];
        const correctAnswer = pq.correctAnswerIndex;
        const isCorrect = userAnswer === correctAnswer;
        return {
          question: pq.question.question,
          story: pq.question.story,
          story_title: pq.question.story_title,
          story_id: pq.question.story_id,
          options: pq.options,
          userAnswer: userAnswer ?? null,
          correctAnswer,
          isCorrect,
        };
      });
    });
    return allResults;
  };

  const handleSubmit = async () => {
    if (testSubmitted || isSubmitting) return;

    if (!allCategoriesComplete) {
      setShowIncompleteModal(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = buildPredTestScorePayload(
      ft_categories,
      questionsByCategory,
      courseId,
      userAnswers,
    );

    const result = await calculateFreePredTestScore(payload);

    if (!result || result.pred_score == null) {
      setSubmitError(
        result?.message ||
          "Unable to calculate your prediction score. Please try again.",
      );
      setIsSubmitting(false);
      return;
    }

    setReviewResults(buildReviewResults());
    setScoreResult(result);
    setTestSubmitted(true);
    setIsSubmitting(false);
    shouldScrollAfterSubmitRef.current = true;
  };

  const retakeTest = () => {
    if (ft_categories) {
      setQuestionsByCategory(
        shuffleAllQuestionsByCategory(categoryNames, rawQuestionsByCategory),
      );
    }
    setTestSubmitted(false);
    setScoreResult(null);
    setReviewResults({});
    setUserAnswers({});
    setSubmitError(null);
    setActiveCategory(0);
    scrollToTestTop();
  };

  const goToCategory = (index: number) => {
    setActiveCategory(index);
    scrollToTestTop();
  };

  const prepIntroTitle = testSubmitted
    ? "Recommended Next Steps"
    : "Explore Prep Options";
  const prepIntroText = testSubmitted
    ? `Your prediction score is a starting point. Our ${courseName || "exam"} courses help you improve before test day — choose a plan below.`
    : `Complete all sections to receive your predicted score. Our ${courseName || "exam"} courses build on this with structured lessons and expert guidance.`;

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/latest.js?config=TeX-MML-AM_CHTML"
        strategy="afterInteractive"
        onLoad={() => void runTypeset()}
      />

      <IncompleteCategoriesModal
        show={showIncompleteModal}
        incompleteCategories={incompleteCategories.names}
        categoryIndices={incompleteCategories.indices}
        onClose={() => setShowIncompleteModal(false)}
        onGoToCategory={goToCategory}
      />

      <div className="page-title-area text-white py-5">
        <div className="container text-center">
          <h1>FREE {testName.toUpperCase()} PREDICTION TEST</h1>
          <h2 className="h4">
            {getFreePredictionTestDescription(courseCode)}
          </h2>
          <Breadcrumb
            segments={[...BREADCRUMB_SEGMENTS(courseCode)]}
            segmentLabels={{ 1: courseName || courseCode.toUpperCase() }}
            dynamicTitle={BREADCRUMB_TITLE}
          />
        </div>
      </div>

      <ShowAllFreePredictionTestsLink anchorRef={showAllTestsRef} />

      <div className="container pb-5">
        <div className="row g-4">
          {headerSlot ? <div className="col-12">{headerSlot}</div> : null}

          <div className="col-12">
            <TestRulesIntro variant="prediction" courseName={howToCourseName} />
          </div>

          <div className="col-lg-8">
            <div className="card shadow-sm border-0 mb-4 rounded-3 overflow-hidden">
              <div className="bg-light px-4 py-3 border-bottom">
                <h5 className="mb-0 fw-semibold text-secondary">Select Section</h5>
              </div>
              <div className="card-body p-3">
                <ul className="nav nav-pills gap-2 justify-content-start flex-wrap">
                  {ft_categories.map((cat, idx) => {
                    const complete = isCategoryComplete(idx);
                    return (
                      <li key={idx} className="nav-item">
                        <button
                          type="button"
                          className={`nav-link px-4 py-2 fw-semibold ${
                            activeCategory === idx ? "active shadow-sm" : ""
                          }`}
                          onClick={() => goToCategory(idx)}
                          style={{
                            backgroundColor:
                              activeCategory === idx ? "#e58a34" : "#f8f9fa",
                            color: activeCategory === idx ? "#fff" : "#495057",
                            border: "1px solid",
                            borderColor:
                              activeCategory === idx ? "#e58a34" : "#e9ecef",
                            borderRadius: "20px",
                          }}
                        >
                          {cat.name}
                          {complete ? (
                            <i
                              className={`bi bi-check-circle-fill ${styles.categoryCheck}`}
                              aria-label="Complete"
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="card-footer bg-white border-top px-4 py-2">
                <span className="small text-muted">
                  {completedSectionCount} of {ft_categories.length} sections complete
                </span>
              </div>
            </div>

            <div
              ref={mathContentRef}
              className={`${styles.categoryPanels} ${
                mathJaxReady ? "" : styles.categoryPanelsLoading
              }`}
            >
              {categoryNames.map((catName, catIdx) => {
                const categoryDescription = getCategoryDescription(
                  ft_categories,
                  catName,
                );
                const catQuestions = questionsByCategory[catName] || [];
                const catReview = reviewResults[catIdx];
                const isActive = catIdx === activeCategory;
                const catAnsweredCount = getAnsweredCount(catIdx, catQuestions);
                const catTotalQuestions = catQuestions.length;
                const catProgress =
                  catTotalQuestions > 0
                    ? Math.round((catAnsweredCount / catTotalQuestions) * 100)
                    : 0;

                return (
                  <div
                    key={catIdx}
                    style={
                      isActive ? ACTIVE_CATEGORY_STYLE : INACTIVE_CATEGORY_STYLE
                    }
                    aria-hidden={!isActive}
                  >
                    {!testSubmitted ? (
                      catQuestions.length > 0 ? (
                        <>
                          <div className="card shadow-sm border-0 mb-4 p-4 rounded-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="fw-semibold text-secondary">
                                Section:{" "}
                                <span style={{ color: "#002341" }}>{catName}</span>
                              </span>
                              <span
                                className="fw-semibold"
                                style={{ color: "#e58a34" }}
                              >
                                {catAnsweredCount} of {catTotalQuestions} Answered
                              </span>
                            </div>
                            <div
                              className="progress"
                              style={{ height: "10px", borderRadius: "5px" }}
                            >
                              <div
                                className="progress-bar progress-bar-striped progress-bar-animated"
                                role="progressbar"
                                style={{
                                  width: `${catProgress}%`,
                                  backgroundColor: "#e58a34",
                                }}
                              />
                            </div>
                          </div>

                          {categoryDescription ? (
                            <CategoryDescription html={categoryDescription} />
                          ) : null}

                          {catQuestions.map((pq, qIdx) => {
                            const options = pq.options;
                            const q = pq.question;
                            const isAnswered =
                              userAnswers[`${catIdx}-${qIdx}`] !== undefined;
                            return (
                              <div
                                key={q.id || q.qid || qIdx}
                                className="card mb-4 border-0 shadow-sm rounded-3 overflow-hidden"
                                style={{
                                  borderLeft: isAnswered
                                    ? "5px solid #e58a34"
                                    : "5px solid #dee2e6",
                                }}
                              >
                                <div className="card-body p-4">
                                  {shouldShowStoryPassage(
                                    q,
                                    catQuestions[qIdx - 1]?.question,
                                  ) &&
                                  q.story ? (
                                    <StoryPassage
                                      story={q.story}
                                      storyTitle={q.story_title}
                                    />
                                  ) : null}
                                  <div className="d-flex align-items-start mb-3">
                                    <span
                                      className="badge me-3 px-3 py-2 rounded-3 text-white"
                                      style={{
                                        backgroundColor: isAnswered
                                          ? "#e58a34"
                                          : "#6c757d",
                                      }}
                                    >
                                      Q {qIdx + 1}
                                    </span>
                                    <div className="fw-bold mb-0 lh-base text-dark pt-1 flex-grow-1">
                                      <QuestionHtml html={q.question} />
                                    </div>
                                  </div>
                                  <div className="options-container mt-4 ps-lg-5">
                                    <div className="row g-2">
                                      {options.map((opt, oIdx) => {
                                        const isSelected =
                                          userAnswers[`${catIdx}-${qIdx}`] === oIdx;
                                        return (
                                          <div key={oIdx} className="col-12">
                                            <label
                                              htmlFor={`pred-q-${catIdx}-${qIdx}-o-${oIdx}`}
                                              className={`d-flex align-items-center p-3 rounded-3 border cursor-pointer w-100 mb-0 ${freeTestStyles.optionLabel} ${
                                                isSelected
                                                  ? freeTestStyles.optionLabelSelected
                                                  : ""
                                              }`}
                                            >
                                              <input
                                                className="visually-hidden"
                                                type="radio"
                                                name={`pred-q-${catIdx}-${qIdx}`}
                                                id={`pred-q-${catIdx}-${qIdx}-o-${oIdx}`}
                                                checked={isSelected}
                                                onChange={() =>
                                                  handleAnswerChange(
                                                    catIdx,
                                                    qIdx,
                                                    oIdx,
                                                  )
                                                }
                                              />
                                              <span
                                                className={`flex-shrink-0 ${freeTestStyles.optionRadio} ${
                                                  isSelected
                                                    ? freeTestStyles.optionRadioSelected
                                                    : ""
                                                }`}
                                                aria-hidden="true"
                                              />
                                              <span className="ms-3 text-dark fw-medium flex-grow-1">
                                                <QuestionHtml html={opt} />
                                              </span>
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {isActive ? (
                            <div
                              className={`d-flex justify-content-center align-items-center flex-wrap my-4 ${styles.sectionNav}`}
                            >
                              {!isFirstCategory ? (
                                <button
                                  type="button"
                                  onClick={() => goToCategory(activeCategory - 1)}
                                  className="btn btn-outline-secondary px-4 py-3 fw-semibold"
                                  style={{ borderRadius: "30px" }}
                                >
                                  <i className="bi bi-arrow-left me-2" aria-hidden />
                                  Previous Section
                                </button>
                              ) : null}
                              {!isLastCategory ? (
                                <button
                                  type="button"
                                  onClick={() => goToCategory(activeCategory + 1)}
                                  className="btn px-4 py-3 fw-bold text-white shadow-sm"
                                  style={{
                                    backgroundColor: "#002341",
                                    borderColor: "#002341",
                                    borderRadius: "30px",
                                  }}
                                >
                                  Continue to Next Section
                                  <i className="bi bi-arrow-right ms-2" aria-hidden />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={scrollToTestTop}
                                className="btn btn-light px-4 py-3 fw-semibold border"
                                style={{ borderRadius: "30px" }}
                                title="Go to Top"
                              >
                                <i className="bi bi-arrow-up me-1" aria-hidden /> Top
                              </button>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="card shadow-sm border-0 p-5 text-center rounded-3">
                          <h4 className="fw-bold">No Questions Found</h4>
                          <p className="text-muted mb-0">
                            There are no prediction questions in this section yet.
                          </p>
                        </div>
                      )
                    ) : catReview ? (
                      <div className="results-container">
                        <h3 className="fw-bold mb-4 text-dark">
                          Question Review — {catName}
                        </h3>
                        {catReview.map((res, i) => (
                          <div
                            key={i}
                            className="card mb-4 border-0 shadow-sm rounded-3 overflow-hidden"
                            style={{
                              borderLeft: res.isCorrect
                                ? "5px solid #198754"
                                : "5px solid #dc3545",
                            }}
                          >
                            <div
                              className="px-4 py-3 d-flex justify-content-between align-items-center"
                              style={{
                                backgroundColor: res.isCorrect
                                  ? "#f4fcf7"
                                  : "#fff5f5",
                              }}
                            >
                              <span className="fw-bold">Question {i + 1}</span>
                              <span
                                className={`badge px-3 py-2 rounded-pill fw-semibold ${
                                  res.isCorrect
                                    ? "bg-success text-white"
                                    : "bg-danger text-white"
                                }`}
                              >
                                {res.isCorrect ? "Correct" : "Incorrect"}
                              </span>
                            </div>
                            <div className="card-body p-4">
                              {shouldShowStoryPassageForResult(
                                res,
                                i > 0 ? catReview[i - 1] : undefined,
                              ) && res.story ? (
                                <StoryPassage
                                  story={res.story}
                                  storyTitle={res.story_title}
                                />
                              ) : null}
                              <div className="fw-semibold text-dark mb-4">
                                <QuestionHtml html={res.question} />
                              </div>
                              <div className="row g-2">
                                {res.options.map((opt, oIdx) => {
                                  let cardBg = "#fff";
                                  let borderCol = "#dee2e6";
                                  let textCol = "text-dark";
                                  if (oIdx === res.correctAnswer) {
                                    cardBg = "#e8f5e9";
                                    borderCol = "#2e7d32";
                                    textCol = "text-success fw-bold";
                                  } else if (
                                    res.userAnswer !== null &&
                                    oIdx === res.userAnswer &&
                                    !res.isCorrect
                                  ) {
                                    cardBg = "#ffebee";
                                    borderCol = "#c62828";
                                    textCol = "text-danger fw-bold";
                                  }
                                  return (
                                    <div key={oIdx} className="col-12">
                                      <div
                                        className="d-flex align-items-center p-3 rounded-3 border"
                                        style={{
                                          backgroundColor: cardBg,
                                          borderColor: borderCol,
                                        }}
                                      >
                                        <span
                                          className={`flex-grow-1 d-flex align-items-center gap-2 ${textCol}`}
                                        >
                                          <span className="text-muted flex-shrink-0">
                                            {String.fromCharCode(65 + oIdx)}.
                                          </span>
                                          <QuestionHtml
                                            html={opt}
                                            className={freeTestStyles.resultOptionHtml}
                                          />
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {!testSubmitted ? (
              <div
                className={`card shadow-sm rounded-4 p-4 mb-4 text-center ${styles.submitBar}`}
              >
                <p className={`mb-3 ${styles.submitHint}`}>
                  {allCategoriesComplete
                    ? "All sections complete. Submit to view your prediction score."
                    : "Complete all sections before submitting to view your prediction result."}
                </p>
                {submitError ? (
                  <div className="alert alert-danger py-2 small mb-3">
                    {submitError}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!allCategoriesComplete || isSubmitting}
                  className="btn btn-lg px-5 py-3 fw-bold text-white shadow-sm"
                  style={{
                    backgroundColor: allCategoriesComplete ? "#e58a34" : "#adb5bd",
                    borderColor: allCategoriesComplete ? "#e58a34" : "#adb5bd",
                    borderRadius: "30px",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden
                      />
                      Calculating…
                    </>
                  ) : (
                    "Submit Prediction Test"
                  )}
                </button>
                {!allCategoriesComplete ? (
                  <p className="small text-muted mt-3 mb-0">
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 align-baseline"
                      onClick={() => setShowIncompleteModal(true)}
                    >
                      Which sections are incomplete?
                    </button>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="text-center my-5 d-flex justify-content-center align-items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={retakeTest}
                  className="btn btn-outline-secondary px-4 py-3 fw-bold"
                  style={{ borderRadius: "30px" }}
                >
                  <i className="bi bi-arrow-clockwise me-2" aria-hidden />
                  Retake Entire Test
                </button>
                <Link
                  href={`/courses/${encodeURIComponent(courseCode)}`}
                  className="btn px-4 py-3 fw-bold text-white shadow-sm"
                  style={{
                    backgroundColor: "#002341",
                    borderColor: "#002341",
                    borderRadius: "30px",
                  }}
                >
                  Back to Course Overview
                </Link>
                <button
                  type="button"
                  onClick={scrollToTestTop}
                  className="btn btn-light px-4 py-3 fw-semibold border"
                  style={{ borderRadius: "30px" }}
                >
                  <i className="bi bi-arrow-up me-1" aria-hidden /> Top
                </button>
              </div>
            )}
          </div>

          <div
            ref={resultsSectionRef}
            className={`col-lg-4 align-self-start ${styles.resultsScrollTarget}`}
          >
            <FreePredTestSidebar
              testSubmitted={testSubmitted}
              predScore={scoreResult?.pred_score ?? null}
              predTestName={scoreResult?.pred_test_name ?? predictionTestName}
              catScores={scoreResult?.cat_scores}
              categoryProgress={categoryProgress}
              completedSectionCount={completedSectionCount}
              totalSectionCount={ft_categories.length}
              courseName={courseName}
              courseCode={courseCode}
              passingScore={scoreResult?.passing_score}
              courseId={courseId}
              gradeMainId={gradeMainId}
              packagesByService={packagesByService}
            />
            {packagesByService ? (
              <div className={`mt-4 ${prepStyles.prepStack}`}>
                <div className={prepStyles.prepIntro}>
                  <div className={prepStyles.prepIntroHeader}>
                    <i className={`bi bi-stars ${prepStyles.prepIntroIcon}`} />
                    <h2 className={prepStyles.prepIntroTitle}>
                      {prepIntroTitle}
                    </h2>
                  </div>
                  <p className={prepStyles.prepIntroText}>{prepIntroText}</p>
                  <ul className={prepStyles.prepIntroBenefits}>
                    <li>
                      <i className="bi bi-check-circle-fill" />
                      Expert-led instruction
                    </li>
                    <li>
                      <i className="bi bi-check-circle-fill" />
                      Flexible learning formats
                    </li>
                    <li>
                      <i className="bi bi-check-circle-fill" />
                      Proven score improvement
                    </li>
                    <li>
                      <i className="bi bi-check-circle-fill" />
                      Homeworks
                    </li>
                    <li>
                      <i className="bi bi-check-circle-fill" />
                      Practice Tests
                    </li>
                    <li>
                      <i className="bi bi-check-circle-fill" />
                      Video Tutorials/Video Lessons
                    </li>
                    <li>
                      <i className="bi bi-check-circle-fill" />
                      Full unlimited real-world prediction tests
                    </li>
                  </ul>
                </div>
                <CoursePricingPanel
                  courseCode={courseCode}
                  packagesByService={packagesByService}
                  embedded
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
