import type {
  CourseData,
  FreePracticeTestResponse,
  UserFeedback,
} from "@/lib/course-types";
import {
  getReadyFreeTestVariants,
  hasAnyFreeTestContent,
  isFreePracticeTestResponseReady,
} from "@/lib/course-types";
import type { FreePredTestResponse } from "@/lib/prediction-test-types";
import {
  getReadyFreePredTestVariants,
  hasAnyFreePredTestContent,
  isFreePredTestReady,
} from "@/lib/prediction-test-types";
import type {
  PackageDetailsData,
  PackagesByService,
} from "@/lib/package-types";
import type { ServiceType } from "@/types/Services";
import {
  convertCourseCodeToId,
  convertCourseIdToCode,
  convertServiceTypeToSubmenu,
  parseHasVariants,
  submenuToServiceType,
  type PricingSubmenu,
} from "@/lib/package-utils";
import {
  assessCourseReadiness,
  DEFAULT_PUBLISH_REQUIREMENTS,
  getPublishRequirementsForCourse,
  hasPackagesForService,
  type CourseReadinessRequirements,
  type CourseReadinessResult,
} from "@/lib/course-readiness";
import { unstable_cache } from "next/cache";
import { parsePhpJsonText } from "@/lib/php-json";

export const PHP_API_REVALIDATE_SECONDS = 3600;

type PhpApiSuccess<T> = {
  isSuccess?: boolean;
  status?: number;
  message?: string;
  data?: T;
  total_pages?: number | string;
};

export type ContentBlock = {
  id: number | string;
  title: string;
  description: string;
};

export type PolicyDocument = {
  id: string;
  title: string;
  description: string;
};

export type TutorProfile = {
  id: string;
  photo: string;
  name: string | null;
  designation: string | null;
  about: string | null;
};

export type FaqItem = {
  id: string;
  question: string;
  answers: string;
};

export type ServiceDetail = {
  service_id: string;
  title: string;
  is_online: string;
  course_name: string;
  course_id: string;
  ord: string;
  description: string;
  service_type: string;
};

export type PricingPackageItem = {
  course_id: string;
  course_code: string;
  name: string;
  image_src: string;
  price_range: string;
  full_form: string;
};

export type PricingPageItem = {
  pricing_id: string;
  title: string;
  description: string;
  closing_content: string;
};

export type PackageDetailsResponse = {
  isSuccess?: boolean;
  data?: unknown[];
  related_courses?: unknown[];
};

export type BlogPost = {
  blog_id: string;
  blog_title: string;
  blog_content: string;
  written_by: string;
  writer_img: string;
  created_at: string;
};

export type BlogListResult = {
  blogs: BlogPost[];
  totalPages: number;
};

export type CourseOverviewVideo = {
  course_id: string;
  mobile_youtube_link: string;
  desktop_youtube_link: string;
  thumbnail: string;
};

export type NavCourse = {
  course_id: string;
  course_code: string;
  name: string;
  full_form?: string;
  details?: string;
  image_src?: string;
  has_variants?: 0 | 1 | boolean;
  variants?: Array<{
    main_course_id: number | string;
    course_name: string;
  }>;
};

export type NavService = {
  service_id: string;
  course_name: string;
};

export type StateOption = {
  id: string;
  name: string;
};

export type RegistrationCourse = {
  course_id: string;
  name: string;
  has_variants?: 0 | 1;
  variants?: Array<{
    main_course_id: number | string;
    course_name: string;
  }>;
};

export type PackageSession = {
  session_id: string;
  name: string;
  price: string;
  is_most_popular?: "0" | "1" | string;
};

export type RegistrationCourseWithServices = RegistrationCourse & {
  availableServiceTypes: string[];
  course_code: string;
};

export type RegistrationCourseList = {
  courses: RegistrationCourse[];
  services: Record<string, number>;
};

export type RegistrationTutoringCourseList = {
  courses: RegistrationCourseWithServices[];
  services: Record<string, number>;
  sessionsByCourseService: Record<string, PackageSession[]>;
};

export function registrationSessionKey(
  courseId: string,
  serviceType: string,
): string {
  return `${courseId}:${serviceType}`;
}

const SELF_STUDY_SERVICE_TYPE = "2";
const DEFAULT_TUTORING_SERVICE_TYPES = ["0", "1"];

function tutoringServiceTypesFromMap(
  services: Record<string, number>,
): string[] {
  const fromMap = Object.values(services)
    .map((value) => String(value))
    .filter((value) => value !== SELF_STUDY_SERVICE_TYPE);

  const unique = Array.from(new Set(fromMap)).sort(
    (a, b) => Number(a) - Number(b),
  );

  return unique.length > 0 ? unique : DEFAULT_TUTORING_SERVICE_TYPES;
}

export type FreePracticeTestCourse = {
  courseCode: string;
  courseName: string;
  fullForm?: string;
  imageSrc?: string;
  sectionCount: number;
  sectionNames: string[];
};

export type FreePredTestCourse = FreePracticeTestCourse;

export type CourseAssessmentBundle = {
  readiness: CourseReadinessResult;
  details: CourseData | null;
  packagesByService: PackagesByService;
  freePracticeTest: FreePracticeTestResponse | null;
};

function normalizeCourseCode(courseCode: string): string {
  return courseCode.replace(/-tutor$/, "").toLowerCase();
}

function getPhpApiUrl(): string | undefined {
  return process.env.PHP_API_URL || process.env.NEXT_PUBLIC_PHP_API_URL;
}

const PHP_API_MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PostPhpApiOptions = {
  /** When true, bypass Next fetch cache (mutations / interactive calls). */
  cache?: RequestCache;
  revalidate?: number | false;
  maxAttempts?: number;
  /** Base delay in ms; actual wait is base * attempt number. Default 150. */
  retryBaseDelayMs?: number;
};

/**
 * Server-side PHP POST helper.
 * Retries on intermittent nginx 415 / network failures that never reach PHP.
 */
export async function postPhpApi<T>(
  action: string,
  params: Record<string, string> = {},
  options: PostPhpApiOptions = {},
): Promise<T | null> {
  const apiUrl = getPhpApiUrl();
  if (!apiUrl) {
    console.error(`PHP API: URL not configured for action "${action}"`);
    return null;
  }

  const maxAttempts = options.maxAttempts ?? PHP_API_MAX_ATTEMPTS;
  const retryBaseDelayMs = options.retryBaseDelayMs ?? 150;
  const useNoStore = options.cache === "no-store" || options.revalidate === false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ action, ...params }),
        ...(useNoStore
          ? { cache: "no-store" as const }
          : { next: { revalidate: options.revalidate ?? PHP_API_REVALIDATE_SECONDS } }),
      });

      // nginx sometimes returns 415 before PHP; retry briefly.
      if (
        (response.status === 415 || response.status >= 500) &&
        attempt < maxAttempts
      ) {
        console.warn(
          `PHP API "${action}": HTTP ${response.status}, retry ${attempt}/${maxAttempts}`,
        );
        await sleep(retryBaseDelayMs * attempt);
        continue;
      }

      if (!response.ok) {
        console.error(`PHP API "${action}": returned ${response.status}`);
        return null;
      }

      const text = await response.text();
      const parsed = parsePhpJsonText<T>(text);
      if (parsed == null) {
        console.error(`PHP API "${action}": response was not valid JSON`);
        return null;
      }
      return parsed;
    } catch (error) {
      if (attempt < maxAttempts) {
        console.warn(
          `PHP API "${action}": fetch failed, retry ${attempt}/${maxAttempts}`,
          error,
        );
        await sleep(retryBaseDelayMs * attempt);
        continue;
      }
      console.error(`PHP API "${action}": fetch failed`, error);
      return null;
    }
  }

  return null;
}

export async function fetchAboutUsItems(): Promise<ContentBlock[]> {
  const result =
    await postPhpApi<PhpApiSuccess<ContentBlock[]>>("get-about-us");

  if (result?.isSuccess && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

export async function fetchNavServices(): Promise<NavService[]> {
  const result = await postPhpApi<PhpApiSuccess<NavService[]>>(
    "get-service-course-list",
  );

  if (result?.isSuccess && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

export async function fetchStateList(): Promise<StateOption[]> {
  const result = await postPhpApi<StateOption[] | PhpApiSuccess<StateOption[]>>(
    "get-state-list",
  );

  if (Array.isArray(result)) {
    return result;
  }

  if (result?.isSuccess && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

export async function fetchRegistrationCourseList(): Promise<RegistrationCourseList> {
  const result = await postPhpApi<
    PhpApiSuccess<RegistrationCourse[]> & {
      services?: Record<string, number>;
    }
  >("get-course-list");

  if (result?.isSuccess && Array.isArray(result.data)) {
    return {
      courses: result.data,
      services:
        result.services && typeof result.services === "object"
          ? result.services
          : {},
    };
  }

  return { courses: [], services: {} };
}

export async function fetchPackageSessionList(
  courseId: string,
  serviceType: string,
): Promise<PackageSession[]> {
  const result = await postPhpApi<PhpApiSuccess<PackageSession[]>>(
    "get-package-session-list",
    { course_id: courseId, service_type: serviceType },
    { cache: "no-store" },
  );

  if (result?.status === 200 && result?.isSuccess && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

/**
 * Server-only: filters registration courses to those with 1-on-1 and/or group
 * tutoring packages, and preloads package sessions for the registration form.
 */
export async function fetchRegistrationTutoringCourseList(): Promise<RegistrationTutoringCourseList> {
  const [{ courses, services }, allCourses] = await Promise.all([
    fetchRegistrationCourseList(),
    fetchAllCoursesRaw(),
  ]);
  const tutoringServiceTypes = tutoringServiceTypesFromMap(services);
  const variantsByCourseId = new Map(
    allCourses.map((course) => [String(course.course_id), course] as const),
  );

  if (courses.length === 0 || tutoringServiceTypes.length === 0) {
    return { courses: [], services, sessionsByCourseService: {} };
  }

  const sessionsByCourseService: Record<string, PackageSession[]> = {};

  const enrichedCourses: RegistrationCourseWithServices[] = (
    await Promise.all(
      courses.map(async (course) => {
        const availableServiceTypes: string[] = [];

        await Promise.all(
          tutoringServiceTypes.map(async (serviceType) => {
            const sessions = await fetchPackageSessionList(
              course.course_id,
              serviceType,
            );
            if (sessions.length === 0) return;

            availableServiceTypes.push(serviceType);
            sessionsByCourseService[
              registrationSessionKey(course.course_id, serviceType)
            ] = sessions;
          }),
        );

        if (availableServiceTypes.length === 0) return null;

        availableServiceTypes.sort((a, b) => Number(a) - Number(b));
        const variantMeta = variantsByCourseId.get(String(course.course_id));
        const variants = Array.isArray(variantMeta?.variants)
          ? variantMeta.variants
          : [];
        const has_variants: 0 | 1 =
          parseHasVariants(variantMeta?.has_variants) === 1 &&
          variants.length > 0
            ? 1
            : 0;

        const enriched: RegistrationCourseWithServices = {
          course_id: course.course_id,
          name: course.name,
          course_code:
            String(variantMeta?.course_code || "").trim() ||
            convertCourseIdToCode(course.course_id),
          availableServiceTypes,
          has_variants,
          variants: has_variants ? variants : [],
        };
        return enriched;
      }),
    )
  ).flatMap((course) => (course ? [course] : []));

  return {
    courses: enrichedCourses,
    services,
    sessionsByCourseService,
  };
}

export async function fetchHowItWorksItems(): Promise<ContentBlock[]> {
  const result =
    await postPhpApi<PhpApiSuccess<ContentBlock[]>>("get-how-it-works");

  if (result?.isSuccess && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

export async function fetchTutorList(): Promise<TutorProfile[]> {
  const result =
    await postPhpApi<PhpApiSuccess<TutorProfile[]>>("get-tutor-list");

  if (result?.isSuccess && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

export async function fetchWebUserFeedback(): Promise<UserFeedback[]> {
  const result = await postPhpApi<PhpApiSuccess<UserFeedback[]>>(
    "get-web-user-feedback",
  );

  if (
    result?.status === 200 &&
    result.isSuccess &&
    Array.isArray(result.data)
  ) {
    return result.data;
  }

  return [];
}

export async function fetchPrivacyPolicy(): Promise<PolicyDocument | null> {
  const result =
    await postPhpApi<PhpApiSuccess<PolicyDocument[]>>("get-privacy-policy");

  if (
    result?.isSuccess &&
    Array.isArray(result.data) &&
    result.data.length > 0
  ) {
    return result.data[0];
  }

  return null;
}

export async function fetchTermsOfService(): Promise<PolicyDocument | null> {
  const result = await postPhpApi<PhpApiSuccess<PolicyDocument[]>>(
    "get-terms-conditions",
  );

  if (
    result?.isSuccess &&
    Array.isArray(result.data) &&
    result.data.length > 0
  ) {
    return result.data[0];
  }

  return null;
}

export async function fetchFaqs(): Promise<FaqItem[]> {
  const result = await postPhpApi<PhpApiSuccess<FaqItem[]>>("get-faq");

  if (result?.status === 200 && Array.isArray(result.data)) {
    return result.data;
  }

  if (result?.isSuccess && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

export async function fetchWelcomeText(): Promise<ContentBlock | null> {
  const result =
    await postPhpApi<PhpApiSuccess<ContentBlock[]>>("get-welcome-text");

  if (
    result?.isSuccess &&
    Array.isArray(result.data) &&
    result.data.length > 0
  ) {
    return result.data[0] ?? null;
  }

  return null;
}

export type NoticeItem = {
  id: string;
  title: string;
  description: string;
  notice_type: "announcement" | "update" | "reminder" | "important";
  is_pinned: boolean;
  created_at: string;
};

export async function fetchNotices(): Promise<NoticeItem[]> {
  const result = await postPhpApi<PhpApiSuccess<NoticeItem[]>>("get-notices");

  if (result?.status === 200 && Array.isArray(result.data)) {
    return result.data.map((notice) => ({
      ...notice,
      is_pinned:
        notice.is_pinned === true ||
        (notice.is_pinned as unknown) === "1",
    }));
  }

  return [];
}

function normalizeCourseDetail(
  data: Record<string, unknown> | null,
): CourseData | null {
  if (!data || data.status !== 200) {
    return null;
  }

  return data as unknown as CourseData;
}

function getCourseIdFromCode(courseCode: string): string {
  switch (courseCode) {
    case "asvab":
      return "27";
    case "astb":
      return "26";
    case "sift":
      return "25";
    case "afoqt":
      return "24";
    case "oar":
      return "21";
    case "hesi-a2":
      return "20";
    case "ati-teas":
      return "33";
    case "cna":
      return "34";
    case "shsat":
      return "30";
    case "state-math-test-prep":
      return "60";
    default:
      return "";
  }
}

export async function fetchCourseDetailsByCode(
  courseCode: string,
): Promise<CourseData | null> {
  const result = await postPhpApi<Record<string, unknown>>(
    "get-course-details-by-code",
    { course_code: normalizeCourseCode(courseCode) },
  );

  return normalizeCourseDetail(result);
}

export async function fetchFreePracticeTestByCode(
  courseCode: string,
): Promise<FreePracticeTestResponse | null> {
  const result = await postPhpApi<FreePracticeTestResponse>(
    "get-free-practice-test-by-code",
    { course_code: normalizeCourseCode(courseCode) },
  );

  if (!result || result.status !== 200 || !result.isSuccess || !result.data) {
    return null;
  }

  // A variant parent resolves to no content of its own, so the API answers 200
  // with empty lists. Treat that as no test rather than rendering an empty one.
  if (!hasAnyFreeTestContent(result)) {
    return null;
  }

  return result;
}

export async function fetchCourseOverviewVideoByCode(
  courseCode: string,
): Promise<CourseOverviewVideo | null> {
  const normalizedCode = normalizeCourseCode(courseCode);
  const courseId = getCourseIdFromCode(normalizedCode);
  const result = await postPhpApi<PhpApiSuccess<CourseOverviewVideo>>(
    "get-course-overview-video",
    {
      course_id: courseId,
    },
  );

  if (result?.isSuccess && result.data) {
    return result.data;
  }

  return null;
}

export async function fetchServiceDetail(
  serviceId: string,
): Promise<ServiceDetail | null> {
  const result = await postPhpApi<PhpApiSuccess<ServiceDetail>>(
    "get-specific-service-detail",
    { service_id: serviceId },
  );

  if (result?.isSuccess && result.data) {
    return result.data;
  }

  return null;
}

export async function fetchPricingPackages(
  submenu: PricingSubmenu,
): Promise<PricingPackageItem[]> {
  const result = await postPhpApi<PhpApiSuccess<PricingPackageItem[]>>(
    "specific-course-list-tutoring-package",
    { submenu },
  );

  if (result?.isSuccess && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

export async function fetchPricingPageContent(
  submenu: PricingSubmenu,
): Promise<PricingPageItem[]> {
  const result = await postPhpApi<PhpApiSuccess<PricingPageItem[]>>(
    "specific-get-pricing-page-content",
    { submenu },
  );

  if (result?.isSuccess && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

export async function fetchPackageDetails(
  serviceType: string,
  courseCode: string,
): Promise<PackageDetailsResponse | null> {
  const result = await postPhpApi<PackageDetailsResponse>(
    "specific-tutoring-package-details-page",
    {
      course_id: convertCourseCodeToId(courseCode),
      submenu: convertServiceTypeToSubmenu(serviceType),
    },
  );

  return result ?? null;
}

const ALL_SERVICE_TYPES: ServiceType[] = [
  "1-on-1-tutoring",
  "group-tutoring",
  "self-study",
];

export async function fetchAllPackageDetailsForCourse(
  courseCode: string,
): Promise<PackagesByService> {
  const entries = await Promise.all(
    ALL_SERVICE_TYPES.map(
      async (serviceType) =>
        [
          serviceType,
          (await fetchPackageDetails(
            serviceType,
            courseCode,
          )) as PackageDetailsData | null,
        ] as const,
    ),
  );

  return Object.fromEntries(entries) as PackagesByService;
}

export async function fetchBlogList(pageNo = 1): Promise<BlogListResult> {
  const result = await postPhpApi<PhpApiSuccess<BlogPost[]>>("get-blogs", {
    page_no: String(pageNo),
  });

  if (result?.isSuccess && Array.isArray(result.data)) {
    return {
      blogs: result.data,
      totalPages: Number(result.total_pages) || 1,
    };
  }

  return { blogs: [], totalPages: 1 };
}

export async function fetchBlogDetails(
  blogId: string,
): Promise<BlogPost | null> {
  const result = await postPhpApi<PhpApiSuccess<BlogPost>>("get-blog-details", {
    blog_id: blogId,
  });

  if (result?.isSuccess && result.data) {
    return result.data;
  }

  return null;
}

async function loadCourseAssessmentBundle(
  courseCode: string,
  requirements: CourseReadinessRequirements = DEFAULT_PUBLISH_REQUIREMENTS,
): Promise<CourseAssessmentBundle> {
  const normalizedCode = normalizeCourseCode(courseCode);

  const [details, packagesByService, freePracticeTest] = await Promise.all([
    requirements.details
      ? fetchCourseDetailsByCode(normalizedCode)
      : Promise.resolve(null),
    requirements.packages
      ? fetchAllPackageDetailsForCourse(normalizedCode)
      : Promise.resolve({} as PackagesByService),
    requirements.freePracticeTest
      ? fetchFreePracticeTestByCode(normalizedCode)
      : Promise.resolve(null),
  ]);

  const readiness = assessCourseReadiness(
    {
      courseCode: normalizedCode,
      details,
      packagesByService,
      freePracticeTest,
    },
    requirements,
  );

  return {
    readiness,
    details,
    packagesByService,
    freePracticeTest,
  };
}

function getCachedCourseAssessmentBundle(
  courseCode: string,
  requirements: CourseReadinessRequirements = DEFAULT_PUBLISH_REQUIREMENTS,
): Promise<CourseAssessmentBundle> {
  const normalizedCode = normalizeCourseCode(courseCode);
  const requirementsKey = JSON.stringify(requirements);

  return unstable_cache(
    () => loadCourseAssessmentBundle(normalizedCode, requirements),
    ["course-assessment-bundle", normalizedCode, requirementsKey],
    { revalidate: PHP_API_REVALIDATE_SECONDS },
  )();
}

export async function assessCoursePublishability(
  courseCode: string,
  requirements: CourseReadinessRequirements = DEFAULT_PUBLISH_REQUIREMENTS,
): Promise<CourseReadinessResult> {
  const resolvedRequirements = getPublishRequirementsForCourse(
    courseCode,
    requirements,
  );
  const bundle = await getCachedCourseAssessmentBundle(
    courseCode,
    resolvedRequirements,
  );
  return bundle.readiness;
}

export async function isCoursePublishable(
  courseCode: string,
  requirements: CourseReadinessRequirements = DEFAULT_PUBLISH_REQUIREMENTS,
): Promise<boolean> {
  const { publishable } = await assessCoursePublishability(
    courseCode,
    requirements,
  );
  return publishable;
}

async function fetchAllCoursesRaw(): Promise<NavCourse[]> {
  const result = await postPhpApi<PhpApiSuccess<NavCourse[]>>("get-all-courses");

  if (result?.isSuccess && Array.isArray(result.data)) {
    return result.data;
  }

  return [];
}

export async function fetchPublishableCourses(
  requirements: CourseReadinessRequirements = DEFAULT_PUBLISH_REQUIREMENTS,
): Promise<NavCourse[]> {
  const courses = await fetchAllCoursesRaw();

  const results = await Promise.all(
    courses.map(async (course) => {
      const { publishable } = await assessCoursePublishability(
        course.course_code,
        requirements,
      );
      return publishable ? course : null;
    }),
  );

  return results.filter((course): course is NavCourse => course !== null);
}

export async function fetchAllCourses(): Promise<NavCourse[]> {
  return fetchPublishableCourses();
}

export async function fetchAllCourseCodes(): Promise<string[]> {
  const courses = await fetchAllCourses();
  return courses.map((course) => course.course_code);
}

export async function fetchPublishablePricingPackages(
  submenu: PricingSubmenu,
  requirements: CourseReadinessRequirements = DEFAULT_PUBLISH_REQUIREMENTS,
): Promise<PricingPackageItem[]> {
  const packages = await fetchPricingPackages(submenu);
  const serviceType = submenuToServiceType(submenu);

  const results = await Promise.all(
    packages.map(async (pkg) => {
      const publishable = await isCoursePublishable(pkg.course_code, requirements);
      if (!publishable) return null;

      // Pricing pages need service-specific packages even for force-publishable
      // courses. Force-publishable readiness sets packages=false and would leave
      // packagesByService empty, incorrectly filtering the course out.
      const readinessRequirements = getPublishRequirementsForCourse(
        pkg.course_code,
        requirements,
      );
      const bundle = await getCachedCourseAssessmentBundle(pkg.course_code, {
        ...readinessRequirements,
        packages: true,
      });
      if (!hasPackagesForService(bundle.packagesByService, serviceType)) {
        return null;
      }

      return pkg;
    }),
  );

  return results.filter((pkg): pkg is PricingPackageItem => pkg !== null);
}

export async function fetchFreePracticeTestCatalog(): Promise<
  FreePracticeTestCourse[]
> {
  const courses = await fetchPublishableCourses();

  const entries = await Promise.all(
    courses.map(async (course) => {
      // Fetch the test itself, not the publishability bundle. That bundle skips
      // the free-test call when a course is force-publishable, which would hide
      // it from Free Tests even though it appears under Courses.
      const freeTest = await fetchFreePracticeTestByCode(course.course_code);
      if (!freeTest || !isFreePracticeTestResponseReady(freeTest)) {
        return null;
      }

      const testData =
        getReadyFreeTestVariants(freeTest.variants)[0]?.data ?? freeTest.data;
      const ft_cat_list = testData?.categories;
      if (!ft_cat_list?.length) {
        return null;
      }

      const entry: FreePracticeTestCourse = {
        courseCode: course.course_code,
        courseName: freeTest.course_name || course.name,
        fullForm: course.full_form || freeTest.full_form,
        imageSrc: course.image_src,
        sectionCount: ft_cat_list.length,
        sectionNames: ft_cat_list.map((category) => category.name),
      };

      return entry;
    }),
  );

  return entries.filter((entry): entry is FreePracticeTestCourse => entry !== null);
}

export async function fetchFreePredTestByCode(
  courseCode: string,
): Promise<FreePredTestResponse | null> {
  const normalizedCode = normalizeCourseCode(courseCode);

  const result = await postPhpApi<FreePredTestResponse>(
    "get-free-pred-test-by-code",
    { course_code: normalizedCode },
  );

  if (!result || result.status !== 200 || !result.isSuccess || !result.data) {
    return null;
  }

  if (!hasAnyFreePredTestContent(result)) {
    return null;
  }

  result.prediction_test_name = result.course_name ?? "";

  if (normalizedCode === "asvab") {
    result.prediction_test_name = `${result.course_name}/AFQT`;
  }

  return result;
}

export async function fetchFreePredTestCatalog(): Promise<FreePredTestCourse[]> {
  const courses = await fetchPublishableCourses();

  const entries = await Promise.all(
    courses.map(async (course) => {
      const predTest = await fetchFreePredTestByCode(course.course_code);
      const testData =
        getReadyFreePredTestVariants(predTest?.variants)[0]?.data ??
        predTest?.data;
      const categories = testData?.categories;
      const questions = testData?.questions;

      if (!isFreePredTestReady(categories, questions) || !categories) {
        return null;
      }

      const entry: FreePredTestCourse = {
        courseCode: course.course_code,
        courseName:
          predTest?.prediction_test_name ||
          predTest?.course_name ||
          course.name,
        fullForm: course.full_form || predTest?.full_form,
        imageSrc: course.image_src,
        sectionCount: categories.length,
        sectionNames: categories.map((category) => category.name),
      };

      return entry;
    }),
  );

  return entries.filter((entry): entry is FreePredTestCourse => entry !== null);
}

