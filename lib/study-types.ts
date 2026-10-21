/**
 * Types + normalizers for the student study area (/study).
 * Data comes from the "student-*" actions of the PHP asvab-api.php
 * (see the STUDENT PORTAL API section there). Most of them return the
 * mobile app's response shapes, so values are normalized here once.
 */

export type StudyErrorCode =
  | "invalid_token"
  | "no_course"
  | "subscription_required"
  | "final_locked"
  | "prediction_locked"
  | "not_found"
  | "unknown";

export type StudyResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: StudyErrorCode; message: string };

export type StudySidebarLesson = {
  lesson_id: number;
  name: string;
  /** Short lesson description (Lesson_title) */
  description: string;
  is_free: boolean;
  locked: boolean;
};

export type StudyCategory = {
  cat_id: number;
  name: string;
  shortcode: string;
  is_free: boolean;
  is_flashcard: boolean;
  lesson_total: number;
  lessons?: StudySidebarLesson[];
};

export type StudyPredictionTest = {
  pred_test_id: number;
  name: string;
  shortcode: string;
  is_free: boolean;
};

export type StudyDashboard = {
  user: {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    is_paid: boolean;
    expire_date: string;
  };
  course: { course_id: number; name: string } | null;
  overview_video: { desktop_id: string | null; mobile_id: string | null } | null;
  categories: StudyCategory[];
  prediction_tests: StudyPredictionTest[];
  access: {
    prediction_tests_enabled: boolean;
    final_lessons_enabled: boolean;
    can_take_pred_test: boolean;
  };
};

export type StudyLessonListItem = {
  lesson_id: number;
  lesson_name: string;
  locked: boolean;
  order: number;
};

/** Per-lesson progress for the "All lessons" page (student-category-progress). */
export type LessonProgress = {
  lesson_id: number;
  homework_total: number;
  homework_viewed: number;
  homework_bookmarked: number;
  practice_total: number;
  attempts: number;
  best_score: number | null;
  previous_score: number | null;
  latest: { result_id: number; score: number; correct: number; total: number; date: string } | null;
};

export type StudyVideo = { title: string; url: string; youtubeId: string | null };

export type StudyLessonOverview = {
  lesson_id: number;
  cat_id: number;
  lesson_name: string;
  practice_test_total: number;
  homework_total: number;
  videos: StudyVideo[];
};

export type StudyStudyItem = { study_id: number; title: string; content: string };

export type OptionKey = "a" | "b" | "c" | "d" | "e";
export const OPTION_KEYS: OptionKey[] = ["a", "b", "c", "d", "e"];
export const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

export type StudyOption = { key: OptionKey; number: number; html: string };

export type HomeworkQuestion = {
  qid: number;
  serial: number;
  story: string;
  question: string;
  options: StudyOption[];
  correctNumber: number;
  explanation: string;
};

/** A question in an open (practice or prediction) test. */
export type TestQuestion = {
  qid: number;
  eid: number;
  serial: number;
  cat_id: number;
  story: string;
  section: string;
  question: string;
  options: StudyOption[];
  myAnswer: number;
};

export type PracticeTest = {
  cat_id: number;
  lesson_id: number;
  minutes: number;
  questions: TestQuestion[];
  answeredCount: number;
};

export type PracticeReport = {
  result_id: number;
  cat_id: number;
  cat_name: string;
  lesson_id: number;
  lesson_name: string;
  date: string;
  correct: number;
  wrong: number;
  total: number;
  score: number;
};

export type ReviewQuestion = {
  serial: number;
  story: string;
  section: string;
  question: string;
  options: StudyOption[];
  correctNumber: number;
  myAnswer: number;
  explanation: string;
  status: "correct" | "wrong" | "unanswered";
};

export type PredictionSection = {
  cat_id: string;
  name: string;
  shortcode: string;
  total: number;
  completed: number;
  minutes: number;
};

export type PredictionTest = {
  pred_test_id: number;
  name: string;
  cat_id: string;
  category_name: string;
  total: number;
  completedTotal: number;
  sections: PredictionSection[];
  questions: TestQuestion[];
};

export type ScoreFeedback = {
  title: string;
  message: string;
  band: string;
  officialLabel: string;
};

export type ScoreCard = {
  key: string;
  label: string;
  score: number;
  correct: number | null;
  total: number | null;
  result_id: number | null;
  cat_id: string | null;
  feedback: ScoreFeedback | null;
};

/** Full ASVAB prediction test, shown in the "ASVAB SCORE REPORT" format. */
export type AsvabScoreReport = {
  sessionDate: string;
  applicantName: string;
  standardScores: { code: string; score: number }[];
  composites: { branch: string; score: number }[];
  afqt: number | null;
};

export type PredictionReport = {
  pred_test_id: number;
  test_name: string;
  canReview: boolean;
  date: string;
  main: ScoreCard | null;
  sections: ScoreCard[];
  composites: ScoreCard[];
  feedback: ScoreFeedback | null;
  asvab: AsvabScoreReport | null;
};

export type PredictionReview = {
  cat_id: string;
  cat_name: string;
  score: number;
  sections: ScoreCard[];
  questions: ReviewQuestion[];
};

export type ProgressLessonRow = {
  result_id: number;
  cat_id: number;
  cat_name: string;
  lesson_id: number;
  lesson_name: string;
  canOpen: boolean;
  correct: number;
  total: number;
  score: number;
  date: string;
};

export type ProgressPredictionRow = {
  result_id: number;
  pred_test_id: number;
  name: string;
  score: number;
  correct: number | null;
  total: number | null;
  date: string;
};

export type ProgressReport = {
  canReviewPrediction: boolean;
  lessons: ProgressLessonRow[];
  predictions: ProgressPredictionRow[];
};

export type Flashcard = { id: number; front: string; back: string };

/* ------------------------------------------------------------------ */
/* Normalizers                                                         */
/* ------------------------------------------------------------------ */

type Json = Record<string, unknown>;

export function asRecord(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};
}

export function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

export function str(value: unknown): string {
  return value == null ? "" : String(value);
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return [];
}

/** Section-keyed dictionaries (SHSAT ELA) are flattened in order. */
function flattenSections(value: unknown): Json[] {
  if (Array.isArray(value)) return value.map(asRecord);
  const rec = asRecord(value);
  return Object.values(rec).flatMap((list) => toArray(list).map(asRecord));
}

export function youtubeIdFromUrl(url: string): string | null {
  const match = url.match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{6,})/);
  return match ? match[1] : null;
}

function letterToNumber(letter: string): number {
  const idx = OPTION_LETTERS.indexOf(letter.trim().toUpperCase());
  return idx >= 0 ? idx + 1 : 0;
}

function readOptions(row: Json): StudyOption[] {
  return OPTION_KEYS.map((key, i) => ({
    key,
    number: i + 1,
    html: str(row[`option_${key}`]),
  })).filter((o) => o.html.trim() !== "");
}

export function normalizeLessonList(json: unknown): StudyLessonListItem[] {
  return toArray(asRecord(json).list)
    .map(asRecord)
    .map((row) => ({
      lesson_id: num(row.lesson_id),
      lesson_name: str(row.lesson_name),
      // app "paid" = 1 means the student still has to pay for it
      locked: num(row.paid) === 1,
      order: num(row.lesson_order),
    }))
    .filter((l) => l.lesson_id > 0);
}

export function normalizeCategoryProgress(json: unknown): LessonProgress[] {
  const optional = (value: unknown) => (value === null || value === undefined ? null : num(value));
  return toArray(asRecord(asRecord(json).data).lessons)
    .map(asRecord)
    .map((row) => {
      const latest = asRecord(row.latest);
      return {
        lesson_id: num(row.lesson_id),
        homework_total: num(row.homework_total),
        homework_viewed: num(row.homework_viewed),
        homework_bookmarked: num(row.homework_bookmarked),
        practice_total: num(row.practice_total),
        attempts: num(row.attempts),
        best_score: optional(row.best_score),
        previous_score: optional(row.previous_score),
        latest: latest.result_id
          ? {
              result_id: num(latest.result_id),
              score: num(latest.score),
              correct: num(latest.correct),
              total: num(latest.total),
              date: str(latest.date),
            }
          : null,
      };
    })
    .filter((l) => l.lesson_id > 0);
}

export function normalizeLessonOverview(json: unknown): StudyLessonOverview {
  const rec = asRecord(json);
  const lesson = asRecord(rec.lesson);
  return {
    lesson_id: num(lesson.lesson_id),
    cat_id: num(lesson.cat_id),
    lesson_name: str(lesson.lesson_name),
    practice_test_total: num(rec.practice_test_total),
    homework_total: num(rec.homework_total),
    videos: toArray(rec.videos)
      .map(asRecord)
      .map((v) => {
        const url = str(v.video);
        return { title: str(v.title), url, youtubeId: youtubeIdFromUrl(url) };
      })
      .filter((v) => v.url),
  };
}

export function normalizeHomework(json: unknown): HomeworkQuestion[] {
  return toArray(asRecord(json).homework_questions)
    .map(asRecord)
    .map((row) => ({
      qid: num(row.qid),
      serial: num(row.serial_no),
      story: str(row.story),
      question: str(row.question),
      options: readOptions(row),
      correctNumber: letterToNumber(str(row.correct_answer)),
      explanation: str(row.question_explanation),
    }))
    .filter((q) => q.qid > 0);
}

function normalizeTestQuestion(row: Json): TestQuestion {
  return {
    qid: num(row.id),
    eid: num(row.eid),
    serial: num(row.serial_no),
    cat_id: num(row.cat_id),
    story: str(row.story),
    section: str(row.section_name),
    question: str(row.question),
    options: readOptions(row),
    myAnswer: num(row.my_answer),
  };
}

export function normalizePracticeTest(json: unknown): PracticeTest {
  const rec = asRecord(json);
  const questions = flattenSections(rec.practicetest)
    .map(normalizeTestQuestion)
    .filter((q) => q.eid > 0);
  return {
    cat_id: num(rec.cat_id),
    lesson_id: num(rec.lesson_id),
    minutes: num(rec.practice_test_time, 30) || 30,
    questions,
    answeredCount: questions.filter((q) => q.myAnswer > 0).length,
  };
}

export function normalizePracticeReport(json: unknown): PracticeReport | null {
  const report = asRecord(asRecord(json).report);
  if (!report.result_id) return null;
  const total = num(report.total_questions);
  const correct = num(report.correct);
  return {
    result_id: num(report.result_id),
    cat_id: num(report.cat_id),
    cat_name: str(report.cat_name),
    lesson_id: num(report.lesson_id),
    lesson_name: str(report.lesson_name),
    date: str(report.date),
    correct,
    wrong: Math.max(0, total - correct),
    total,
    score: num(report.score),
  };
}

/** "B | Your answer is C | Wrong Answer" -> correct option number */
function parseCorrectAnswer(text: string): number {
  return letterToNumber(text.split("|")[0] ?? "");
}

function normalizeReviewQuestion(row: Json): ReviewQuestion {
  const correctNumber = parseCorrectAnswer(str(row.correct_answer));
  const myAnswer = num(row.myanswer);
  return {
    serial: num(row.srno),
    story: str(row.story),
    section: str(row.section_name),
    question: str(row.question),
    options: readOptions(row),
    correctNumber,
    myAnswer,
    explanation: str(row.explanation),
    status: !myAnswer ? "unanswered" : myAnswer === correctNumber ? "correct" : "wrong",
  };
}

export function normalizeReviewQuestions(value: unknown): ReviewQuestion[] {
  return flattenSections(value).map(normalizeReviewQuestion);
}

export function normalizePredictionTest(json: unknown): PredictionTest {
  const rec = asRecord(json);
  return {
    pred_test_id: num(rec.pred_test_id),
    name: str(rec.pred_test_name),
    cat_id: str(rec.cat_id),
    category_name: str(rec.category_name),
    total: num(rec.total),
    completedTotal: num(rec.completed_total),
    sections: toArray(rec.prediction_category)
      .map(asRecord)
      .map((s) => ({
        cat_id: str(s.cat_id),
        name: str(s.cat_name),
        shortcode: str(s.shortcode) || str(s.cat_name),
        total: num(s.total),
        completed: num(s.completed),
        minutes: num(s.duration),
      })),
    questions: flattenSections(rec.question_test)
      .map(normalizeTestQuestion)
      .filter((q) => q.eid > 0),
  };
}

function normalizeFeedback(value: unknown): ScoreFeedback | null {
  const rec = asRecord(value);
  const title = str(rec.title);
  const message = str(rec.message);
  if (!title && !message) return null;
  return {
    title,
    message,
    band: str(rec.band),
    officialLabel: str(rec.official_label),
  };
}

const LABELS: Record<string, string> = {
  marine_gt: "Marine GT",
  navy_gt: "Navy GT",
  army_gt: "Army GT",
  afqt_percentile_score: "AFQT",
  VE: "VE",
};

function toScoreCard(key: string, value: unknown): ScoreCard | null {
  const rec = asRecord(value);
  if (rec.score === undefined || rec.score === null || rec.score === "") return null;
  const total = rec.total_questions != null && rec.total_questions !== "" ? num(rec.total_questions) : null;
  const correct =
    rec.correct != null ? num(rec.correct) : rec.correct_answers != null ? num(rec.correct_answers) : null;
  return {
    key,
    label: LABELS[key] || str(rec.cat_name) || str(rec.pred_name) || key,
    score: Math.round(num(rec.score)),
    correct: total ? correct : null,
    total: total || null,
    result_id: rec.result_id ? num(rec.result_id) : null,
    cat_id: rec.cat_id != null ? str(rec.cat_id) : null,
    feedback: normalizeFeedback(rec.score_feedback),
  };
}

const REPORT_META_KEYS = new Set([
  "prediction_score",
  "composite_scores",
  "applicant_name",
  "session_date",
  "score_feedback",
]);

const ASVAB_COMPOSITES: [string, string][] = [
  ["marine_gt", "Marine"],
  ["navy_gt", "Navy"],
  ["army_gt", "Army"],
];

/** Full ASVAB reports carry VE and the Marine / Navy / Army GT composites. */
function readAsvabReport(report: Json): AsvabScoreReport | null {
  if (!ASVAB_COMPOSITES.some(([key]) => asRecord(report[key]).score != null)) return null;

  // Section cards keep the prediction test's section order
  const standardScores: { code: string; score: number }[] = [];
  for (const [key, value] of Object.entries(report)) {
    if (REPORT_META_KEYS.has(key) || key === "VE" || ASVAB_COMPOSITES.some(([k]) => k === key)) continue;
    const card = asRecord(value);
    if (!card.shortcode || card.score == null) continue;
    standardScores.push({ code: str(card.shortcode), score: Math.round(num(card.score)) });
  }
  const ve = asRecord(report.VE);
  if (ve.score != null && ve.score !== "") standardScores.push({ code: "VE", score: Math.round(num(ve.score)) });

  const afqtSource = asRecord(report.prediction_score).score ?? asRecord(report.afqt_percentile_score).score;

  return {
    sessionDate: str(report.session_date),
    applicantName: str(report.applicant_name),
    standardScores,
    composites: ASVAB_COMPOSITES.filter(([key]) => asRecord(report[key]).score != null).map(([key, branch]) => ({
      branch,
      score: Math.round(num(asRecord(report[key]).score)),
    })),
    afqt: afqtSource == null || afqtSource === "" ? null : Math.round(num(afqtSource)),
  };
}

export function normalizePredictionReport(json: unknown): PredictionReport {
  const rec = asRecord(json);
  const test = asRecord(rec.prediction_test);
  const report = asRecord(rec.report);
  const main = toScoreCard("prediction_score", report.prediction_score);

  const sections: ScoreCard[] = [];
  for (const [key, value] of Object.entries(report)) {
    if (REPORT_META_KEYS.has(key)) continue;
    const card = toScoreCard(key, value);
    if (card) sections.push(card);
  }

  const composites = Object.entries(asRecord(report.composite_scores))
    .map(([key, value]) => toScoreCard(key, value))
    .filter((c): c is ScoreCard => c !== null);

  return {
    pred_test_id: num(test.Predic_test_id),
    test_name: str(test.test_name),
    canReview: num(test.display_pred_test_review) === 1,
    date: str(report.session_date) || str(asRecord(report.prediction_score).date),
    main,
    sections,
    composites,
    feedback: normalizeFeedback(report.score_feedback) || main?.feedback || null,
    asvab: readAsvabReport(report),
  };
}

export function normalizePredictionReview(json: unknown): PredictionReview {
  const rec = asRecord(json);
  return {
    cat_id: str(rec.cat_id),
    cat_name: str(rec.cat_name),
    score: num(rec.prediction_score),
    sections: Object.entries(asRecord(rec.pred_test_cat_wise_scores))
      .map(([key, value]) => toScoreCard(key, value))
      .filter((c): c is ScoreCard => c !== null),
    questions: normalizeReviewQuestions(rec.questions),
  };
}

export function normalizeProgressReport(json: unknown): ProgressReport {
  const rec = asRecord(json);
  const lessons = toArray(rec.lesson_result)
    .map(asRecord)
    .map((r) => ({
      result_id: num(r.result_id),
      cat_id: num(r.cat_id),
      cat_name: str(r.cat_name),
      lesson_id: num(r.lesson_id),
      lesson_name: str(r.lesson_name),
      canOpen: num(r.is_display) === 1,
      correct: num(r.correct_answers),
      total: num(r.total_questions),
      score: Math.round(num(r.score)),
      date: str(r.result_date),
    }))
    .filter((r) => r.result_id > 0);

  // Each entry is { "<test name>": hub } or, for ASVAB Prep / GT,
  // { standard_score, composite_scores: { afqt_percentile_score: hub } }.
  const predictions: ProgressPredictionRow[] = [];
  for (const entry of toArray(rec["prediction-test"]).map(asRecord)) {
    const composite = asRecord(entry.composite_scores);
    const hub = asRecord(composite.afqt_percentile_score);
    if (hub.result_id) {
      predictions.push({
        result_id: num(hub.result_id),
        pred_test_id: num(hub.Predic_test_id),
        name: str(hub.pred_name) || "Prediction Test",
        score: Math.round(num(hub.score)),
        correct: null,
        total: null,
        date: str(entry.session_date) || str(hub.result_date),
      });
      continue;
    }
    for (const [name, value] of Object.entries(entry)) {
      const row = asRecord(value);
      if (!row.result_id || !row.pred_test_id) continue;
      const total = num(row.total_questions);
      predictions.push({
        result_id: num(row.result_id),
        pred_test_id: num(row.pred_test_id),
        name: str(row.pred_test_name) || name,
        score: Math.round(num(row.score)),
        correct: total ? num(row.correct_answers) : null,
        total: total || null,
        date: str(row.result_date),
      });
    }
  }

  return {
    canReviewPrediction: num(rec.display_pred_test_review) === 1,
    lessons,
    predictions,
  };
}

export function normalizeFlashcards(json: unknown): Flashcard[] {
  return toArray(asRecord(json).questions)
    .map(asRecord)
    .map((row) => ({
      id: num(row.id),
      front: str(row.question),
      back: str(row.question_explanation),
    }))
    .filter((c) => c.id > 0);
}

export function formatStudyDate(value: string): string {
  if (!value) return "";
  const iso = /^\d{4}-\d{2}-\d{2}/.test(value) ? value.replace(" ", "T") : "";
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
