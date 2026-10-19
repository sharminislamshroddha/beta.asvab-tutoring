import {
  FREE_TEST_QUESTION_COUNT,
  getFreeTestCategoryNames,
  type FreePracticeTestQuestion,
  type FreeTestCategory,
  type PreparedTestQuestion,
} from "@/lib/course-types";

export type FreePredTestCategory = FreeTestCategory;

export interface FreePredTestQuestion extends FreePracticeTestQuestion {
  cat_id?: number | string;
  qid?: number | string;
}

export interface FreePredTestData {
  course_id: number;
  categories: FreeTestCategory[];
  questions: { [category: string]: FreePredTestQuestion[] };
}

/** One grade of a variant course; see FreePracticeTestVariant. */
export interface FreePredTestVariant {
  main_course_id: number | string;
  course_name: string;
  data?: FreePredTestData;
}

export interface FreePredTestResponse {
  status: number;
  isSuccess: boolean;
  message: string;
  course_name: string;
  prediction_test_name?: string;
  course_code?: string;
  full_form?: string;
  data?: FreePredTestData;
  has_variants?: 0 | 1 | boolean;
  variants?: FreePredTestVariant[];
}

export interface CategoryScore {
  num_correct_ans: number | string;
  num_wrong_ans: number | string;
  total_question: number | string;
  score?: number | string;
}

export interface FreePredTestScoreResponse {
  pred_test_name?: string;
  pred_score?: number;
  passing_score?: number;
  cat_scores?: Record<string, CategoryScore>;
  message?: string;
}

export interface PredScoreFeedback {
  title: string;
  message: string;
  color: string;
  iconClass: string;
  badgeText: string;
}

type PredScoreThresholds = {
  good: number;
  excellence: number;
};

const PRED_SCORE_THRESHOLDS: Record<string, PredScoreThresholds> = {
  sift: { good: 60, excellence: 75 },
  oar: { good: 60, excellence: 75 },
  astb: { good: 60, excellence: 75 },
  asvab: { good: 75, excellence: 90 },
  afoqt: { good: 75, excellence: 90 },
  "state-math-test-prep": { good: 400, excellence: 500 },
};

function normalizePredCourseCode(courseCode: string): string {
  return courseCode.toLowerCase().replace(/-tutor$/, "");
}

function getPredScoreThresholds(courseCode: string): PredScoreThresholds {
  return (
    PRED_SCORE_THRESHOLDS[normalizePredCourseCode(courseCode)] ??
    PRED_SCORE_THRESHOLDS.sift
  );
}

function getStateMathPredScoreFeedback(score: number): PredScoreFeedback {
  if (score >= 500) {
    return {
      title: "Excellence Achieved!",
      message: `You scored ${score} in your test. This is an Advanced Level SOL pass. You are highly likely to pass the real exam with this level of preparation.`,
      color: "#198754",
      iconClass: "bi-check-circle-fill",
      badgeText: "Pass Advanced Level SOL",
    };
  }

  if (score >= 400) {
    return {
      title: "Good Progress!",
      message: `You scored ${score}. You passed the SOL test. Keep practicing to further solidify your knowledge and reach an Advanced Level pass.`,
      color: "#e58a34",
      iconClass: "bi-info-circle-fill",
      badgeText: "Pass SOL Test",
    };
  }

  return {
    title: "Focus Required",
    message: `You scored ${score}. This is below the SOL passing score of 400. Consistent practice will help you improve.`,
    color: "#dc3545",
    iconClass: "bi-exclamation-triangle-fill",
    badgeText: "Fail SOL",
  };
}

export function getPredScoreExcellenceThreshold(courseCode: string): number {
  return getPredScoreThresholds(courseCode).excellence;
}

export function getPredScoreFeedback(
  score: number,
  courseCode: string,
  courseName: string,
  passingScore?: number,
): PredScoreFeedback {
  if (normalizePredCourseCode(courseCode) === "state-math-test-prep") {
    return getStateMathPredScoreFeedback(score);
  }

  const { excellence, good } = getPredScoreThresholds(courseCode);

  if (score >= excellence) {
    return {
      title: "Excellence Achieved!",
      message: `You scored ${score} in your test. You are highly likely to pass the real exam with this level of preparation.`,
      color: "#198754",
      iconClass: "bi-check-circle-fill",
      badgeText: "Excellence",
    };
  }

  if (score >= good) {
    return {
      title: "Good Progress!",
      message: `You scored ${score}. Great score! Keep practicing to further solidify your knowledge and guarantee a pass.`,
      color: "#e58a34",
      iconClass: "bi-info-circle-fill",
      badgeText: "Good Progress",
    };
  }

  if (passingScore != null && score >= passingScore) {
    return {
      title: "Keep Practicing",
      message: `You scored ${score}. Consistent practice will help you improve.`,
      color: "#5b8fc7",
      iconClass: "bi-arrow-up-circle-fill",
      badgeText: "Keep Practicing",
    };
  }

  return {
    title: "Focus Required",
    message:
      passingScore != null && score < passingScore
        ? `You scored ${score}. The minimum ${courseName} passing score is ${passingScore} or above. Consistent practice will help you improve.`
        : `You scored ${score}. Consistent practice will help you improve.`,
    color: "#dc3545",
    iconClass: "bi-exclamation-triangle-fill",
    badgeText: "Focus Required",
  };
}

export function hasFreePredTestQuestions(
  categories?: FreeTestCategory[],
  questions?: { [key: string]: FreePredTestQuestion[] },
): boolean {
  if (!categories?.length || !questions) return false;
  return getFreeTestCategoryNames(categories).some((cat) => {
    const qs = questions[cat];
    return Array.isArray(qs) && qs.length > 0;
  });
}

export function isFreePredTestReady(
  categories?: FreeTestCategory[],
  questions?: { [key: string]: FreePredTestQuestion[] },
): boolean {
  if (!categories?.length || !questions) return false;
  return getFreeTestCategoryNames(categories).every(
    (cat) => (questions[cat]?.length ?? 0) >= FREE_TEST_QUESTION_COUNT,
  );
}

/** Grades that have a complete prediction test, in the order the API returned them. */
export function getReadyFreePredTestVariants(
  variants?: FreePredTestVariant[],
): FreePredTestVariant[] {
  if (!Array.isArray(variants)) return [];
  return variants.filter((variant) =>
    isFreePredTestReady(variant.data?.categories, variant.data?.questions),
  );
}

export function isFreePredTestResponseReady(
  response?: FreePredTestResponse | null,
): boolean {
  if (!response) return false;

  if (response.variants?.length) {
    return getReadyFreePredTestVariants(response.variants).length > 0;
  }

  return isFreePredTestReady(response.data?.categories, response.data?.questions);
}

/** True when there is any question at all, on the course itself or any grade. */
export function hasAnyFreePredTestContent(
  response?: FreePredTestResponse | null,
): boolean {
  if (!response) return false;

  if (response.variants?.length) {
    return response.variants.some((variant) =>
      hasFreePredTestQuestions(variant.data?.categories, variant.data?.questions),
    );
  }

  return hasFreePredTestQuestions(
    response.data?.categories,
    response.data?.questions,
  );
}

export function prepareFreePredTestQuestions(
  categories: FreeTestCategory[],
  questions: { [key: string]: FreePredTestQuestion[] },
): {
  sufficient: boolean;
  questionsByCategory: { [key: string]: FreePredTestQuestion[] };
} {
  const categoryNames = getFreeTestCategoryNames(categories);
  const sufficient = isFreePredTestReady(categories, questions);

  if (!sufficient) {
    return { sufficient: false, questionsByCategory: {} };
  }

  const questionsByCategory = Object.fromEntries(
    categoryNames.map((cat) => [cat, questions[cat] ?? []]),
  );

  return { sufficient: true, questionsByCategory };
}

export function getCategoryCatId(questions: FreePredTestQuestion[]): number {
  const first = questions[0];
  if (!first?.cat_id) return 0;
  return Number(first.cat_id);
}

export interface PredTestScorePayload {
  course_id: string;
  pred_cat_ids: string;
  cat_correct_answers: string;
  cat_total_num_of_ques: string;
}

export function buildPredTestScorePayload(
  categories: FreeTestCategory[],
  questionsByCategory: {
    [key: string]: PreparedTestQuestion<FreePredTestQuestion>[];
  },
  courseId: number,
  userAnswers: Record<string, number>,
): PredTestScorePayload {
  const categoryNames = getFreeTestCategoryNames(categories);
  const predCatIds: number[] = [];
  const correctCounts: number[] = [];
  const totals: number[] = [];

  categoryNames.forEach((catName, catIdx) => {
    const qs = questionsByCategory[catName] ?? [];
    predCatIds.push(getCategoryCatId(qs.map((pq) => pq.question)));
    totals.push(qs.length);
    correctCounts.push(
      qs.reduce((count, pq, qIdx) => {
        const userAnswer = userAnswers[`${catIdx}-${qIdx}`];
        return userAnswer === pq.correctAnswerIndex ? count + 1 : count;
      }, 0),
    );
  });

  return {
    course_id: String(courseId),
    pred_cat_ids: predCatIds.join(","),
    cat_correct_answers: correctCounts.join(","),
    cat_total_num_of_ques: totals.join(","),
  };
}
