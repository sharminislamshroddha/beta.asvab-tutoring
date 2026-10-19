import type { CourseData, FreePracticeTestResponse } from "@/lib/course-types";
import { isFreePracticeTestResponseReady } from "@/lib/course-types";
import type { PackagesByService } from "@/lib/package-types";
import type { ServiceType } from "@/types/Services";
import { convertCourseCodeToId } from "@/lib/package-utils";

const ALL_SERVICE_TYPES: ServiceType[] = [
  "1-on-1-tutoring",
  "group-tutoring",
  "self-study",
];

export type CourseReadinessRequirements = {
  details: boolean;
  packages: boolean;
  freePracticeTest: boolean;
  mappedCourseId: boolean;
};

export const DEFAULT_PUBLISH_REQUIREMENTS: CourseReadinessRequirements = {
  details: true,
  packages: true,
  freePracticeTest: true,
  mappedCourseId: true,
};

/**
 * Testing only: course codes listed here skip all publish readiness checks
 * and are treated as publishable. Keep empty in production.
 *
 * Example: new Set(["shsat", "cna"])
 */
const FORCE_PUBLISHABLE_COURSE_CODES = new Set<string>([""]);

const NO_PUBLISH_REQUIREMENTS: CourseReadinessRequirements = {
  details: false,
  packages: false,
  freePracticeTest: false,
  mappedCourseId: false,
};

export function normalizeCourseCodeForReadiness(courseCode: string): string {
  return courseCode.replace(/-tutor$/, "").toLowerCase();
}

export function isForcePublishableCourse(courseCode: string): boolean {
  return FORCE_PUBLISHABLE_COURSE_CODES.has(
    normalizeCourseCodeForReadiness(courseCode),
  );
}

export function getPublishRequirementsForCourse(
  courseCode: string,
  base: CourseReadinessRequirements = DEFAULT_PUBLISH_REQUIREMENTS,
): CourseReadinessRequirements {
  if (isForcePublishableCourse(courseCode)) {
    return NO_PUBLISH_REQUIREMENTS;
  }

  return base;
}

export type CourseReadinessInput = {
  courseCode: string;
  details?: CourseData | null;
  packagesByService?: PackagesByService;
  freePracticeTest?: FreePracticeTestResponse | null;
};

export type CourseReadinessResult = {
  publishable: boolean;
  missing: string[];
};

export function hasNonEmptyText(value?: string | null): boolean {
  return typeof value === "string" && value.trim() !== "";
}

export function hasCourseDetails(details?: CourseData | null): boolean {
  if (!details) return false;
  if (!hasNonEmptyText(details.full_form)) return false;
  if (!hasNonEmptyText(details.overview)) return false;
  if (!hasNonEmptyText(details.image_src)) return false;
  return (
    hasNonEmptyText(details.course_header) || hasNonEmptyText(details.course_name)
  );
}

export function hasPackagesForService(
  packagesByService: PackagesByService | undefined,
  serviceType: ServiceType,
): boolean {
  if (!packagesByService) return false;

  const servicePackages = packagesByService[serviceType]?.data;
  if (!Array.isArray(servicePackages) || servicePackages.length === 0) {
    return false;
  }

  return servicePackages.some(
    (pkg) => Array.isArray(pkg.sessions) && pkg.sessions.length > 0,
  );
}

export function hasPackages(packagesByService?: PackagesByService): boolean {
  if (!packagesByService) return false;

  return ALL_SERVICE_TYPES.some((serviceType) =>
    hasPackagesForService(packagesByService, serviceType),
  );
}

export function hasMappedCourseId(courseCode: string): boolean {
  const normalized = courseCode.replace(/-tutor$/, "").toLowerCase();
  const mappedId = convertCourseCodeToId(normalized);
  return mappedId !== normalized;
}

/**
 * For a variant course (e.g. State Math Test Prep) the parent owns no test
 * content, so one ready grade is enough. Everything else a course must have
 * still comes from the parent.
 */
export function hasFreePracticeTestReady(
  response?: FreePracticeTestResponse | null,
): boolean {
  return isFreePracticeTestResponseReady(response);
}

export function assessCourseReadiness(
  input: CourseReadinessInput,
  requirements: CourseReadinessRequirements = DEFAULT_PUBLISH_REQUIREMENTS,
): CourseReadinessResult {
  const missing: string[] = [];

  if (requirements.details && !hasCourseDetails(input.details)) {
    if (!input.details) {
      missing.push("course_details");
    } else {
      if (!hasNonEmptyText(input.details.full_form)) missing.push("full_form");
      if (!hasNonEmptyText(input.details.overview)) missing.push("overview");
      if (!hasNonEmptyText(input.details.image_src)) missing.push("image_src");
      if (
        !hasNonEmptyText(input.details.course_header) &&
        !hasNonEmptyText(input.details.course_name)
      ) {
        missing.push("course_title");
      }
    }
  }

  if (requirements.packages && !hasPackages(input.packagesByService)) {
    missing.push("packages");
  }

  if (
    requirements.freePracticeTest &&
    !hasFreePracticeTestReady(input.freePracticeTest)
  ) {
    missing.push(
      input.freePracticeTest?.variants?.length
        ? "variant_free_practice_test"
        : "free_practice_test",
    );
  }

  if (requirements.mappedCourseId && !hasMappedCourseId(input.courseCode)) {
    missing.push("mapped_course_id");
  }

  return {
    publishable: missing.length === 0,
    missing,
  };
}
