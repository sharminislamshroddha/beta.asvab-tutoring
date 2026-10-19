import type { CourseVariantOption } from "@/lib/course-types";
import { fetchCourseDetailsByCode } from "@/lib/php-api";
import {
  convertCourseIdToCode,
  parseHasVariants,
} from "@/lib/package-utils";

export type CheckoutVariantInfo = {
  has_variants: 0 | 1;
  variants: CourseVariantOption[];
};

export { parseHasVariants };

/**
 * Temporary checkout-only hide for Grade 3 and Grade 4.
 * User-registration still lists every variant from the API.
 */
const CHECKOUT_BLOCKED_GRADE_PATTERN = /\bgrade\s*[34]\b/i;

export function isCheckoutBlockedGrade(
  variant: Pick<CourseVariantOption, "course_name">,
): boolean {
  return CHECKOUT_BLOCKED_GRADE_PATTERN.test(String(variant.course_name ?? ""));
}

export function filterCheckoutGrades(
  variants: readonly CourseVariantOption[],
): CourseVariantOption[] {
  return variants.filter((variant) => !isCheckoutBlockedGrade(variant));
}

export function courseRequiresGradeSelection(
  info: CheckoutVariantInfo | null | undefined,
): boolean {
  return Boolean(
    info &&
      parseHasVariants(info.has_variants) === 1 &&
      Array.isArray(info.variants) &&
      info.variants.length > 0,
  );
}

export function isSelectedCheckoutGradeAllowed(
  info: CheckoutVariantInfo | null | undefined,
  selectedGradeMainId: string,
): boolean {
  if (!selectedGradeMainId) return false;
  return (info?.variants ?? []).some(
    (variant) => String(variant.main_course_id) === String(selectedGradeMainId),
  );
}

/** Valid checkout grade from a URL `main_course_id`, or empty. */
export function getPreselectedCheckoutGrade(
  info: CheckoutVariantInfo | null | undefined,
  mainCourseId: string | null | undefined,
): string {
  const id = String(mainCourseId ?? "").trim();
  return isSelectedCheckoutGradeAllowed(info, id) ? id : "";
}

/** Resolve payment identity: parent asvab id in URL, grade MAIN + is_variant=1 at pay. */
export function resolvePaymentCourseIdentity(args: {
  parentCourseId: string;
  selectedGradeMainId: string;
  requiresGrade: boolean;
}): { course_id: string; is_variant: 0 | 1 } {
  if (args.requiresGrade && args.selectedGradeMainId) {
    return {
      course_id: String(args.selectedGradeMainId),
      is_variant: 1,
    };
  }
  return {
    course_id: String(args.parentCourseId),
    is_variant: 0,
  };
}

export async function resolveCheckoutVariants(
  courseId: string,
): Promise<CheckoutVariantInfo> {
  const code = convertCourseIdToCode(courseId);
  if (!code) {
    return { has_variants: 0, variants: [] };
  }

  const details = await fetchCourseDetailsByCode(code);
  const variants = filterCheckoutGrades(
    Array.isArray(details?.variants) ? details.variants : [],
  );
  const has_variants =
    parseHasVariants(details?.has_variants) === 1 && variants.length > 0
      ? 1
      : 0;

  return {
    has_variants,
    variants: has_variants ? variants : [],
  };
}
