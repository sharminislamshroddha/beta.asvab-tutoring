import "server-only";

import { cache } from "react";
import { getSession } from "@/lib/auth-session";
import { parsePhpJsonText } from "@/lib/php-json";
import {
  asRecord,
  normalizeCategoryProgress,
  normalizeFlashcards,
  normalizeLessonList,
  normalizeLessonOverview,
  normalizePracticeReport,
  normalizePredictionReport,
  normalizePredictionReview,
  normalizeProgressReport,
  normalizeReviewQuestions,
  num,
  str,
  type Flashcard,
  type LessonProgress,
  type PracticeReport,
  type PredictionReport,
  type PredictionReview,
  type ProgressReport,
  type ReviewQuestion,
  type StudyDashboard,
  type StudyErrorCode,
  type StudyLessonListItem,
  type StudyLessonOverview,
  type StudyResult,
  type StudyStudyItem,
} from "@/lib/study-types";

/** Actions of the PHP "STUDENT PORTAL API" section (asvab-api.php). */
export const STUDY_ACTIONS = new Set([
  "student-dashboard",
  "student-category-progress",
  "student-lesson-study",
  "student-homework-state",
  "student-homework-bookmark",
  "student-homework-view",
  "student-lessons",
  "student-lesson-view",
  "student-lesson-homework",
  "student-practice-questions",
  "student-practice-answer",
  "student-practice-submit",
  "student-practice-result",
  "student-practice-review",
  "student-flashcards",
  "student-prediction-questions",
  "student-prediction-answer",
  "student-prediction-submit",
  "student-prediction-result",
  "student-prediction-review",
  "student-progress-report",
  "student-report-error",
]);

const MAX_ATTEMPTS = 3;

function phpApiUrl(): string {
  return process.env.PHP_API_URL || process.env.NEXT_PUBLIC_PHP_API_URL || "";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const KNOWN_CODES = new Set<StudyErrorCode>([
  "invalid_token",
  "no_course",
  "subscription_required",
  "final_locked",
  "prediction_locked",
]);

/**
 * The app-api actions report problems inside a 200 response
 * ("error": "Token does not exist!", or status 201 for paid lessons).
 */
function readError(
  httpStatus: number,
  json: Record<string, unknown>,
): { status: number; code: StudyErrorCode; message: string } | null {
  const code = str(json.code) as StudyErrorCode;
  const message = str(json.message) || str(json.error);

  if (httpStatus >= 400) {
    return {
      status: httpStatus,
      code: KNOWN_CODES.has(code) ? code : httpStatus === 404 ? "not_found" : "unknown",
      message: message || "Something went wrong. Please try again.",
    };
  }
  if (json.error) {
    const tokenError = /token/i.test(str(json.error));
    return {
      status: tokenError ? 401 : 400,
      code: tokenError ? "invalid_token" : "unknown",
      message: tokenError ? "Your session has expired. Please log in again." : str(json.error),
    };
  }
  if (json.isSuccess === false && num(json.status) === 201) {
    return {
      status: 403,
      code: "subscription_required",
      message: "This lesson is part of the full course. Renew your subscription to unlock it.",
    };
  }
  return null;
}

/**
 * POST a student-* action with the session's auth token.
 * Only nginx 415s (which never reach PHP) and network errors are retried,
 * so answers and submissions are never sent twice.
 */
export async function callStudyAction(
  action: string,
  params: Record<string, string | number> = {},
  authToken?: string,
): Promise<StudyResult<Record<string, unknown>>> {
  const token = authToken ?? (await getSession())?.auth_token;
  if (!token) {
    return { ok: false, status: 401, code: "invalid_token", message: "Please log in to continue." };
  }

  const url = phpApiUrl();
  if (!url) {
    return { ok: false, status: 500, code: "unknown", message: "The study service is not configured." };
  }

  const body = new URLSearchParams({ action, auth_token: token });
  for (const [key, value] of Object.entries(params)) {
    if (key === "action" || key === "auth_token") continue;
    body.set(key, String(value));
  }

  const secret = process.env.INTERNAL_API_SECRET?.trim();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json",
          ...(secret ? { "X-ASVAB-SECRET": secret } : {}),
        },
        body: body.toString(),
        cache: "no-store",
      });
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(200 * attempt);
        continue;
      }
      console.error(`[study] ${action}: fetch failed`, error);
      return { ok: false, status: 502, code: "unknown", message: "We couldn't reach the server. Please try again." };
    }

    if (response.status === 415 && attempt < MAX_ATTEMPTS) {
      await sleep(200 * attempt);
      continue;
    }

    const text = await response.text();
    const json = asRecord(parsePhpJsonText(text));
    if (!text || (Object.keys(json).length === 0 && !response.ok)) {
      console.error(`[study] ${action}: HTTP ${response.status}, unreadable response`);
      return { ok: false, status: response.status || 502, code: "unknown", message: "Something went wrong. Please try again." };
    }

    const error = readError(response.status, json);
    if (error) return { ok: false, ...error };
    return { ok: true, data: json };
  }

  return { ok: false, status: 502, code: "unknown", message: "We couldn't reach the server. Please try again." };
}

function mapResult<T>(
  result: StudyResult<Record<string, unknown>>,
  map: (json: Record<string, unknown>) => T,
): StudyResult<T> {
  return result.ok ? { ok: true, data: map(result.data) } : result;
}

/** Cached per request so the layout and the page share one call. */
export const getStudyDashboard = cache(async (): Promise<StudyResult<StudyDashboard>> => {
  const result = await callStudyAction("student-dashboard");
  return mapResult(result, (json) => asRecord(json.data) as unknown as StudyDashboard);
});

export async function getStudyLessons(catId: number): Promise<StudyResult<StudyLessonListItem[]>> {
  return mapResult(await callStudyAction("student-lessons", { cat_id: catId }), normalizeLessonList);
}

export async function getStudyCategoryProgress(catId: number): Promise<StudyResult<LessonProgress[]>> {
  return mapResult(await callStudyAction("student-category-progress", { cat_id: catId }), normalizeCategoryProgress);
}

export async function getStudyLessonOverview(
  catId: number,
  lessonId: number,
): Promise<StudyResult<StudyLessonOverview>> {
  return mapResult(
    await callStudyAction("student-lesson-view", { cat_id: catId, lesson_id: lessonId }),
    normalizeLessonOverview,
  );
}

export async function getStudyLessonStudy(
  catId: number,
  lessonId: number,
): Promise<StudyResult<{ lessonName: string; catName: string; items: StudyStudyItem[] }>> {
  return mapResult(
    await callStudyAction("student-lesson-study", { cat_id: catId, lesson_id: lessonId }),
    (json) => {
      const data = asRecord(json.data);
      const lesson = asRecord(data.lesson);
      return {
        lessonName: str(lesson.lesson_name),
        catName: str(lesson.cat_name),
        items: (Array.isArray(data.study) ? data.study : []).map((row) => {
          const rec = asRecord(row);
          return { study_id: num(rec.study_id), title: str(rec.title), content: str(rec.content) };
        }),
      };
    },
  );
}

export async function getStudyPracticeReport(
  catId: number,
  lessonId: number,
  resultId: number,
): Promise<StudyResult<{ report: PracticeReport | null; questions: ReviewQuestion[] }>> {
  return mapResult(
    await callStudyAction("student-practice-review", {
      cat_id: catId,
      lesson_id: lessonId,
      result_id: resultId,
    }),
    (json) => ({
      report: normalizePracticeReport(json),
      questions: normalizeReviewQuestions(json.qlist),
    }),
  );
}

export async function getStudyPredictionReport(
  predTestId: number,
  resultId: number,
): Promise<StudyResult<PredictionReport>> {
  return mapResult(
    await callStudyAction("student-prediction-result", {
      pred_test_id: predTestId,
      result_id: resultId,
    }),
    normalizePredictionReport,
  );
}

export async function getStudyPredictionReview(
  predTestId: number,
  resultId: number,
  catId: string,
): Promise<StudyResult<PredictionReview>> {
  return mapResult(
    await callStudyAction("student-prediction-review", {
      pred_test_id: predTestId,
      result_id: resultId,
      cat_id: catId,
    }),
    normalizePredictionReview,
  );
}

export async function getStudyProgressReport(): Promise<StudyResult<ProgressReport>> {
  return mapResult(await callStudyAction("student-progress-report"), normalizeProgressReport);
}

export async function getStudyFlashcards(catId: number): Promise<StudyResult<Flashcard[]>> {
  return mapResult(
    await callStudyAction("student-flashcards", { flashcard_id: catId }),
    normalizeFlashcards,
  );
}
