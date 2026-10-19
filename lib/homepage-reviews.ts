import type { UserFeedback } from "@/lib/course-types";
import { shuffleArray } from "@/lib/course-types";

export const HOMEPAGE_REVIEW_LIMIT = 16;
export const MAX_REVIEWS_PER_COURSE = 2;

function hasAssociatedCourse(courseName?: string): boolean {
  const trimmed = courseName?.trim();
  if (!trimmed) return false;
  return trimmed.toLowerCase() !== "unknown course";
}

/**
 * Deterministic homepage review pick for SSR (no shuffle).
 * Same filters/caps as `selectHomepageReviews`, but stable across renders.
 */
export function selectHomepageReviewsStable(
  reviews: readonly UserFeedback[],
  {
    perCourse = MAX_REVIEWS_PER_COURSE,
    limit = HOMEPAGE_REVIEW_LIMIT,
  }: { perCourse?: number; limit?: number } = {},
): UserFeedback[] {
  const byCourse = new Map<string, UserFeedback[]>();

  for (const review of reviews) {
    if (!review.feedback?.trim() || !review.user_name?.trim()) continue;
    if (!hasAssociatedCourse(review.course_name)) continue;

    const courseKey = review.course_name!.trim();
    const group = byCourse.get(courseKey) ?? [];
    group.push(review);
    byCourse.set(courseKey, group);
  }

  const selected: UserFeedback[] = [];
  for (const group of byCourse.values()) {
    selected.push(...group.slice(0, perCourse));
  }

  return selected.slice(0, limit);
}

/**
 * Pick up to 2 random reviews per course, omit reviews with no course,
 * then randomly cap the result at `limit` (default 16).
 * Intended to run on the client so each page load reshuffles.
 */
export function selectHomepageReviews(
  reviews: readonly UserFeedback[],
  {
    perCourse = MAX_REVIEWS_PER_COURSE,
    limit = HOMEPAGE_REVIEW_LIMIT,
  }: { perCourse?: number; limit?: number } = {},
): UserFeedback[] {
  const byCourse = new Map<string, UserFeedback[]>();

  for (const review of reviews) {
    if (!review.feedback?.trim() || !review.user_name?.trim()) continue;
    if (!hasAssociatedCourse(review.course_name)) continue;

    const courseKey = review.course_name!.trim();
    const group = byCourse.get(courseKey) ?? [];
    group.push(review);
    byCourse.set(courseKey, group);
  }

  const selected: UserFeedback[] = [];
  for (const group of byCourse.values()) {
    selected.push(...shuffleArray(group).slice(0, perCourse));
  }

  return shuffleArray(selected).slice(0, limit);
}
