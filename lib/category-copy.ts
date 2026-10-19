import {
  COURSE_CATEGORY_LABELS,
  COURSE_CATEGORY_ORDER,
  getCourseCategory,
  groupCoursesByCategory,
  type CourseCategory,
} from "@/lib/package-utils";

type CategorySeo = {
  title: string;
  description: string;
};

export const CATEGORY_EXAM_NAMES: Record<CourseCategory, string> = {
  "military test prep": "ASVAB, AFOQT, SIFT, ASTB, and OAR",
  "healthcare test prep": "HESI A2, ATI TEAS, and CNA",
  "academic test prep": "State Math Test Prep and SHSAT",
};

export const MIXED_CATEGORY_PHRASE = "military, healthcare, and academic";

export const MIXED_EXAM_LIST =
  "ASVAB, AFOQT, SIFT, ASTB, OAR, HESI A2, ATI TEAS, CNA, SHSAT, and State Math Test Prep";

export const MIXED_HUB_PRACTICE_CLOSER =
  "Start with a free online practice test for military, healthcare, or academic exams — no signup required.";

export const MIXED_HUB_PREDICTION_CLOSER =
  "Start with a free online prediction test for military, healthcare, or academic exams — no signup required.";

export const CATEGORY_COURSE_FALLBACK_SEO: Record<CourseCategory, CategorySeo> = {
  "military test prep": {
    title: "Military Test Prep | ASVAB Tutoring",
    description:
      "Prepare for your military exam with ASVAB Tutoring's expert-led courses and practice tests.",
  },
  "healthcare test prep": {
    title: "Healthcare Test Prep | ASVAB Tutoring",
    description:
      "Prepare for your healthcare exam with ASVAB Tutoring's expert-led courses and practice tests.",
  },
  "academic test prep": {
    title: "Academic Test Prep | ASVAB Tutoring",
    description:
      "Prepare for your academic exam with ASVAB Tutoring's expert-led courses and practice tests.",
  },
};

export const CATEGORY_PACKAGE_FALLBACK_SEO: Record<CourseCategory, CategorySeo> = {
  "military test prep": {
    title: "Military Test Prep Packages | ASVAB Tutoring",
    description:
      "Browse tutoring packages and find the right plan for your military exam preparation.",
  },
  "healthcare test prep": {
    title: "Healthcare Test Prep Packages | ASVAB Tutoring",
    description:
      "Browse tutoring packages and find the right plan for your healthcare exam preparation.",
  },
  "academic test prep": {
    title: "Academic Test Prep Packages | ASVAB Tutoring",
    description:
      "Browse tutoring packages and find the right plan for your academic exam preparation.",
  },
};

export const CATEGORY_FREE_PRACTICE_TEST_FALLBACK_SEO: Record<
  CourseCategory,
  CategorySeo
> = {
  "military test prep": {
    title: "Free Military Practice Test | ASVAB Tutoring",
    description:
      "Take a free online military practice test. Realistic questions, scoring, and step-by-step reviews — no signup required.",
  },
  "healthcare test prep": {
    title: "Free Healthcare Practice Test | ASVAB Tutoring",
    description:
      "Take a free online healthcare practice test. Realistic questions, scoring, and step-by-step reviews — no signup required.",
  },
  "academic test prep": {
    title: "Free Academic Practice Test | ASVAB Tutoring",
    description:
      "Take a free online academic practice test. Realistic questions, scoring, and step-by-step reviews — no signup required.",
  },
};

export const CATEGORY_FREE_PREDICTION_TEST_FALLBACK_SEO: Record<
  CourseCategory,
  CategorySeo
> = {
  "military test prep": {
    title: "Free Military Prediction Test | ASVAB Tutoring",
    description:
      "Take a free online military prediction test. Complete all sections to receive your predicted exam score.",
  },
  "healthcare test prep": {
    title: "Free Healthcare Prediction Test | ASVAB Tutoring",
    description:
      "Take a free online healthcare prediction test. Complete all sections to receive your predicted exam score.",
  },
  "academic test prep": {
    title: "Free Academic Prediction Test | ASVAB Tutoring",
    description:
      "Take a free online academic prediction test. Complete all sections to receive your predicted exam score.",
  },
};

export const CATEGORY_HUB_PRACTICE_INTRO: Record<CourseCategory, string> = {
  "military test prep":
    "Free practice tests for military entrance and officer exams. Work through real-style questions at your own pace and see where you stand before test day.",
  "healthcare test prep":
    "Free practice tests for healthcare admissions and certification exams. Check your readiness for nursing and allied-health programs.",
  "academic test prep":
    "Free practice tests for school and academic placement exams. Identify strengths and gaps so you can focus your study time.",
};

export const CATEGORY_HUB_PREDICTION_INTRO: Record<CourseCategory, string> = {
  "military test prep":
    "Free prediction tests for military entrance and officer exams. Complete every section in a test to receive an estimated score before test day.",
  "healthcare test prep":
    "Free prediction tests for healthcare admissions and certification exams. Complete every section in a test to receive an estimated score before test day.",
  "academic test prep":
    "Free prediction tests for school and academic placement exams. Complete every section in a test to receive an estimated score before test day.",
};

export function getCourseFallbackSeo(courseCode: string): CategorySeo {
  return CATEGORY_COURSE_FALLBACK_SEO[getCourseCategory(courseCode)];
}

export function getPackageFallbackSeo(courseCode: string): CategorySeo {
  return CATEGORY_PACKAGE_FALLBACK_SEO[getCourseCategory(courseCode)];
}

export function getFreePracticeTestFallbackSeo(courseCode: string): CategorySeo {
  return CATEGORY_FREE_PRACTICE_TEST_FALLBACK_SEO[getCourseCategory(courseCode)];
}

export function getFreePredictionTestFallbackSeo(
  courseCode: string,
): CategorySeo {
  return CATEGORY_FREE_PREDICTION_TEST_FALLBACK_SEO[
    getCourseCategory(courseCode)
  ];
}

export function groupHubCoursesByCategory<T extends { courseCode: string }>(
  courses: readonly T[],
): { category: CourseCategory; label: string; items: T[] }[] {
  const grouped = groupCoursesByCategory(
    courses.map((course) => ({ ...course, course_code: course.courseCode })),
  );
  const itemsByCategory: Record<CourseCategory, T[]> = {
    "military test prep": grouped.militaryTestPrep,
    "healthcare test prep": grouped.healthcareTestPrep,
    "academic test prep": grouped.academicTestPrep,
  };

  return COURSE_CATEGORY_ORDER.flatMap((category) => {
    const items = itemsByCategory[category];
    if (!items.length) return [];
    return [
      {
        category,
        label: COURSE_CATEGORY_LABELS[category],
        items,
      },
    ];
  });
}
