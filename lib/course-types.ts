import type { Session } from "@/components/tabs/LessonPlanTab";
import type { VideoObject } from "@/components/tabs/FreeLessonVideosTab";

export interface FreePracticeTestQuestion {
  id: number;
  question: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  option_e?: string | null;
  answer: number | string;
  story_id?: string | number | null;
  story?: string | null;
  story_title?: string | null;
  q_no?: number;
  order_no?: number | string | null;
}

export interface FreeTestCategory {
  name: string;
  description?: string | null;
}

export interface FreePracticeTestData {
  course_id: number;
  categories: FreeTestCategory[];
  questions: { [category: string]: FreePracticeTestQuestion[] };
}

/**
 * One grade of a variant course. Variant parents own no test content, so the
 * API returns a payload per grade and `data` mirrors the first populated one.
 */
export interface FreePracticeTestVariant {
  main_course_id: number | string;
  course_name: string;
  data?: FreePracticeTestData;
}

export interface FreePracticeTestResponse {
  status: number;
  isSuccess: boolean;
  message: string;
  course_name?: string;
  course_code?: string;
  full_form?: string;
  data?: FreePracticeTestData;
  has_variants?: 0 | 1 | boolean;
  variants?: FreePracticeTestVariant[];
}

export interface RelatedCourse {
  course_id: string;
  course_code: string;
  full_form: string;
  subscribe_button_url?: string;
  image?: string;
  name: string;
  details?: string;
}

export interface UserFeedback {
  feedback_id: string | number;
  user_name: string;
  course_name?: string;
  rating: string | number;
  feedback: string;
  created_at?: string;
}

export interface CourseVariantOption {
  main_course_id: number | string;
  course_name: string;
}

export interface CourseData {
  status: number;
  isSuccess: boolean;
  message: string;
  course_id?: number | string;
  course_code?: string;
  course_name?: string;
  full_form: string;
  course_header?: string;
  course_tagline?: string;
  overview?: string;
  curriculum?: string;
  sessions?: Session[];
  picture?: string;
  video?: VideoObject;
  related_courses?: RelatedCourse[];
  user_feedbacks?: UserFeedback[];
  total_ques?: number;
  image_src?: string;
  has_variants?: 0 | 1 | boolean;
  variants?: CourseVariantOption[];
}

export interface CourseOverviewVideo {
  c_id: string;
  course_id: string;
  mobile_youtube_link: string;
  desktop_youtube_link: string;
  thumbnail: string;
}

export const FREE_TEST_QUESTION_COUNT = 10;

export function getFreeTestCategoryNames(
  categories: readonly FreeTestCategory[],
): string[] {
  return categories.map((category) => category.name);
}

export function getCategoryDescription(
  categories: readonly FreeTestCategory[],
  name: string,
): string | null {
  const description = categories.find((category) => category.name === name)
    ?.description;
  const trimmed = description?.trim();
  return trimmed ? trimmed : null;
}

/** Collect non-empty answer choices (A–E) in order. */
export function getQuestionOptions(
  question: Pick<
    FreePracticeTestQuestion,
    "option_a" | "option_b" | "option_c" | "option_d" | "option_e"
  >,
): string[] {
  return [
    question.option_a,
    question.option_b,
    question.option_c,
    question.option_d,
    question.option_e,
  ].filter(
    (opt): opt is string =>
      typeof opt === "string" && opt.trim() !== "",
  );
}

/** Fisher–Yates shuffle; returns a new array. */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const STORY_GROUPED_CATEGORIES = [
  "Reading Comprehension",
  "Reading",
] as const;

export function isStoryGroupedCategory(category: string): boolean {
  return (STORY_GROUPED_CATEGORIES as readonly string[]).includes(category);
}

function hasStoryGroup(
  question: Pick<FreePracticeTestQuestion, "story_id">,
): boolean {
  const { story_id } = question;
  if (story_id == null) return false;
  const str = String(story_id).trim();
  return str !== "" && str !== "0";
}

/** Shuffle questions while keeping each story_id group contiguous. */
export function shuffleQuestionsPreservingStoryGroups<
  T extends FreePracticeTestQuestion,
>(questions: readonly T[]): T[] {
  const groups = new Map<string, T[]>();

  questions.forEach((question, index) => {
    const key = hasStoryGroup(question)
      ? String(question.story_id)
      : `__no_story__:${index}`;
    const group = groups.get(key) ?? [];
    group.push(question);
    groups.set(key, group);
  });

  return shuffleArray([...groups.values()].map((group) => shuffleArray(group))).flat();
}

/** True when the API assigned an explicit question order for this category. */
export function hasQuestionOrderNo(
  question: Pick<FreePracticeTestQuestion, "order_no">,
): boolean {
  const { order_no } = question;
  if (order_no == null) return false;
  if (typeof order_no === "string") {
    const trimmed = order_no.trim();
    if (trimmed === "" || trimmed === "0") return false;
    return true;
  }
  if (order_no === 0) return false;
  return true;
}

export function categoryHasFixedQuestionOrder<
  T extends Pick<FreePracticeTestQuestion, "order_no">,
>(questions: readonly T[]): boolean {
  return questions.some(hasQuestionOrderNo);
}

function sortQuestionsByOrderNo<T extends FreePracticeTestQuestion>(
  questions: readonly T[],
): T[] {
  return [...questions].sort((a, b) => {
    const aOrder = Number(a.order_no);
    const bOrder = Number(b.order_no);
    if (Number.isNaN(aOrder) || Number.isNaN(bOrder)) return 0;
    return aOrder - bOrder;
  });
}

function limitQuestions<T>(
  questions: readonly T[],
  limit: number,
  shuffle: boolean,
): T[] {
  const pool = shuffle ? shuffleArray(questions) : [...questions];
  return pool.length > limit ? pool.slice(0, limit) : pool;
}

export function prepareQuestionWithOrderedOptions<
  T extends FreePracticeTestQuestion,
>(question: T): PreparedTestQuestion<T> {
  const options = getQuestionOptions(question);
  const correctAnswerIndex = Number(question.answer) - 1;

  return {
    question,
    options,
    correctAnswerIndex: correctAnswerIndex >= 0 ? correctAnswerIndex : 0,
  };
}

function prepareQuestionsForCategory<
  T extends FreePracticeTestQuestion,
>(
  questions: readonly T[],
  {
    limit,
    shuffleQuestions,
    shuffleOptions,
    preserveStoryGroups = false,
  }: {
    limit?: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    preserveStoryGroups?: boolean;
  },
): PreparedTestQuestion<T>[] {
  const orderedQuestions = shuffleQuestions
    ? questions
    : sortQuestionsByOrderNo(questions);
  const selected =
    limit != null
      ? limitQuestions(orderedQuestions, limit, shuffleQuestions)
      : shuffleQuestions
        ? preserveStoryGroups
          ? shuffleQuestionsPreservingStoryGroups(orderedQuestions)
          : shuffleArray(orderedQuestions)
        : orderedQuestions;

  return shuffleOptions
    ? prepareQuestionsWithShuffledOptions(selected)
    : selected.map(prepareQuestionWithOrderedOptions);
}

/** Question with shuffled answer choices and remapped correct index. */
export interface PreparedTestQuestion<
  T extends FreePracticeTestQuestion = FreePracticeTestQuestion,
> {
  question: T;
  options: string[];
  /** 0-based index into `options` for the correct choice. */
  correctAnswerIndex: number;
}

export function prepareQuestionWithShuffledOptions<
  T extends FreePracticeTestQuestion,
>(question: T): PreparedTestQuestion<T> {
  const options = getQuestionOptions(question);
  const originalCorrectIndex = Number(question.answer) - 1;
  const indexed = options.map((opt, originalIndex) => ({ opt, originalIndex }));
  const shuffled = shuffleArray(indexed);
  const correctAnswerIndex = shuffled.findIndex(
    (item) => item.originalIndex === originalCorrectIndex,
  );

  return {
    question,
    options: shuffled.map((item) => item.opt),
    correctAnswerIndex: correctAnswerIndex >= 0 ? correctAnswerIndex : 0,
  };
}

export function prepareQuestionsWithShuffledOptions<
  T extends FreePracticeTestQuestion,
>(questions: readonly T[]): PreparedTestQuestion<T>[] {
  return questions.map(prepareQuestionWithShuffledOptions);
}

export function hasFreeTestQuestions(
  ft_categories?: FreeTestCategory[],
  ft_ques_list?: { [key: string]: FreePracticeTestQuestion[] },
): boolean {
  if (!ft_categories?.length || !ft_ques_list) return false;
  return getFreeTestCategoryNames(ft_categories).some((cat) => {
    const questions = ft_ques_list[cat];
    return Array.isArray(questions) && questions.length > 0;
  });
}

export function isFreeTestReady(
  ft_categories?: FreeTestCategory[],
  ft_ques_list?: { [key: string]: FreePracticeTestQuestion[] },
): boolean {
  if (!ft_categories?.length || !ft_ques_list) return false;
  return getFreeTestCategoryNames(ft_categories).every(
    (cat) => (ft_ques_list[cat]?.length ?? 0) >= FREE_TEST_QUESTION_COUNT,
  );
}

/** Grades that have a complete practice test, in the order the API returned them. */
export function getReadyFreeTestVariants(
  variants?: FreePracticeTestVariant[],
): FreePracticeTestVariant[] {
  if (!Array.isArray(variants)) return [];
  return variants.filter((variant) =>
    isFreeTestReady(variant.data?.categories, variant.data?.questions),
  );
}

/**
 * A variant course is ready when at least one grade has a complete test; a
 * normal course is ready when its own test is complete.
 */
export function isFreePracticeTestResponseReady(
  response?: FreePracticeTestResponse | null,
): response is FreePracticeTestResponse {
  if (!response) return false;

  if (response.variants?.length) {
    return getReadyFreeTestVariants(response.variants).length > 0;
  }

  return isFreeTestReady(response.data?.categories, response.data?.questions);
}

/** True when there is any question at all, on the course itself or any grade. */
export function hasAnyFreeTestContent(
  response?: FreePracticeTestResponse | null,
): boolean {
  if (!response) return false;

  if (response.variants?.length) {
    return response.variants.some((variant) =>
      hasFreeTestQuestions(variant.data?.categories, variant.data?.questions),
    );
  }

  return hasFreeTestQuestions(response.data?.categories, response.data?.questions);
}

/** Shuffle questions and keep at most `limit` (default 10). */
export function shuffleAndLimitQuestions<T>(
  questions: readonly T[],
  limit: number = FREE_TEST_QUESTION_COUNT,
): T[] {
  const shuffled = shuffleArray(questions);
  return shuffled.length > limit ? shuffled.slice(0, limit) : shuffled;
}

export function shuffleQuestionsByCategory<
  T extends FreePracticeTestQuestion,
>(
  categories: readonly string[],
  questionsByCategory: Record<string, readonly T[]>,
  limit: number = FREE_TEST_QUESTION_COUNT,
): Record<string, PreparedTestQuestion<T>[]> {
  return Object.fromEntries(
    categories.map((cat) => {
      const questions = questionsByCategory[cat] ?? [];
      const fixedOrder = categoryHasFixedQuestionOrder(questions);
      return [
        cat,
        prepareQuestionsForCategory(questions, {
          limit,
          shuffleQuestions: !fixedOrder,
          shuffleOptions: !fixedOrder,
        }),
      ];
    }),
  );
}

/** Shuffle and limit questions, with shuffled options per question. */
export function shuffleAndLimitPreparedQuestions<
  T extends FreePracticeTestQuestion,
>(
  questions: readonly T[],
  limit: number = FREE_TEST_QUESTION_COUNT,
): PreparedTestQuestion<T>[] {
  const fixedOrder = categoryHasFixedQuestionOrder(questions);
  return prepareQuestionsForCategory(questions, {
    limit,
    shuffleQuestions: !fixedOrder,
    shuffleOptions: !fixedOrder,
  });
}

/** Shuffle all questions per category without capping the count. */
export function shuffleAllQuestionsByCategory<
  T extends FreePracticeTestQuestion,
>(
  categories: readonly string[],
  questionsByCategory: Record<string, readonly T[]>,
): Record<string, PreparedTestQuestion<T>[]> {
  return Object.fromEntries(
    categories.map((cat) => {
      const questions = questionsByCategory[cat] ?? [];
      const fixedOrder = categoryHasFixedQuestionOrder(questions);
      return [
        cat,
        prepareQuestionsForCategory(questions, {
          shuffleQuestions: !fixedOrder,
          shuffleOptions: !fixedOrder,
          preserveStoryGroups:
            !fixedOrder && isStoryGroupedCategory(cat),
        }),
      ];
    }),
  );
}

export function prepareFreeTestQuestions(
  ft_categories: FreeTestCategory[],
  ft_ques_list: { [key: string]: FreePracticeTestQuestion[] },
): { sufficient: boolean; questionsByCategory: { [key: string]: FreePracticeTestQuestion[] } } {
  const categoryNames = getFreeTestCategoryNames(ft_categories);
  const sufficient = isFreeTestReady(ft_categories, ft_ques_list);

  if (!sufficient) {
    return { sufficient: false, questionsByCategory: {} };
  }

  const questionsByCategory = Object.fromEntries(
    categoryNames.map((cat) => [cat, ft_ques_list[cat] ?? []]),
  );

  return { sufficient: true, questionsByCategory };
}
