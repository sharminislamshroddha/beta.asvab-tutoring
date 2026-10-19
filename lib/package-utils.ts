import type { ServiceType } from "@/types/Services";

const serviceTypeToSubmenuMap: Record<string, string> = {
  "one-on-1-tutoring": "one",
  "one-on-one-tutoring": "one",
  "1-on-1-tutoring": "one",
  "group-tutoring": "group",
  "self-study": "subscribe",
};

const courseCodeToIdMap: Record<string, string> = {
  asvab: "40",
  afoqt: "49",
  sift: "50",
  astb: "51",
  oar: "52",
  "hesi-a2": "56",
  "ati-teas": "57",
  cna: "58",
  shsat: "59",
  "state-math-test-prep": "60",
};

export const MILITARY_COURSE_CODES = [
  "asvab",
  "afoqt",
  "sift",
  "astb",
  "oar",
] as const;

export const MEDICAL_COURSE_CODES = ["hesi-a2", "ati-teas", "cna"] as const;

export const ACADEMIC_COURSE_CODES = ["state-math-test-prep", "shsat"] as const;


export type CourseCategory =
  | "military test prep"
  | "healthcare test prep"
  | "academic test prep";

export const COURSE_CATEGORY_LABELS: Record<CourseCategory, string> = {
  "military test prep": "Military Test Prep",
  "healthcare test prep": "Healthcare Test Prep",
  "academic test prep": "Academic Test Prep",
};

export const COURSE_CATEGORY_ORDER: readonly CourseCategory[] = [
  "military test prep",
  "healthcare test prep",
  "academic test prep",
] as const;

export function getCourseCategory(courseCode: string): CourseCategory {
  const code = (courseCode ?? "").toLowerCase();
  if ((MILITARY_COURSE_CODES as readonly string[]).includes(code)) {
    return "military test prep";
  }
  if ((MEDICAL_COURSE_CODES as readonly string[]).includes(code)) {
    return "healthcare test prep";
  }
  if (code.includes("hesi") || code.includes("teas") || code.includes("cna")) {
    return "healthcare test prep";
  }
  return "academic test prep";
}

/** Low-score copy after a free practice section is submitted. */
export function getPracticeTestLowScoreMessage(courseCode: string): string {
  switch (getCourseCategory(courseCode)) {
    case "healthcare test prep":
      return "Don't worry, healthcare exams require targeted practice. We can help you master this section.";
    case "academic test prep":
      return "Don't worry, academic exams require targeted practice. We can help you master this section.";
    default:
      return "Don't worry, military exams require targeted practice. We can help you master this section.";
  }
}

export function getCourseCategorySelectPrompt(category: CourseCategory): string {
  return `Select a ${category} course`;
}

export function groupCoursesByCategory<T extends { course_code: string }>(
  courses: readonly T[],
): {
  militaryTestPrep: T[];
  healthcareTestPrep: T[];
  academicTestPrep: T[];
} {
  const militaryTestPrep: T[] = [];
  const healthcareTestPrep: T[] = [];
  const academicTestPrep: T[] = [];

  for (const course of courses) {
    const category = getCourseCategory(course.course_code);
    if (category === "military test prep") militaryTestPrep.push(course);
    else if (category === "healthcare test prep")
      healthcareTestPrep.push(course);
    else academicTestPrep.push(course);
  }

  return { militaryTestPrep, healthcareTestPrep, academicTestPrep };
}

export function getFriendlyCourseName(courseCode: string): string {
  const code = courseCode.toLowerCase();
  if (code.includes("asvab")) return "ASVAB";
  if (code.includes("afoqt")) return "AFOQT";
  if (code.includes("astb")) return "ASTB";
  if (code.includes("sift")) return "SIFT";
  if (code.includes("oar")) return "OAR";
  if (code.includes("hesi")) return "HESI A2";
  if (code.includes("teas")) return "ATI TEAS";
  if (code.includes("cna")) return "CNA";
  if (code.includes("shsat")) return "SHSAT";
  if (code.includes("state-math-test-prep")) return "State Math Test Prep";
  return "Unknown Course";
}

export function convertServiceTypeToSubmenu(serviceType: string): string {
  return serviceTypeToSubmenuMap[serviceType] ?? serviceType;
}

export function convertCourseCodeToId(courseCode: string): string {
  return courseCodeToIdMap[courseCode.toLowerCase()] ?? courseCode;
}

export function parseIsVariant(value: unknown): 0 | 1 {
  if (value === true || value === 1 || value === "1") return 1;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "true" || normalized === "yes") return 1;
  return 0;
}

export function parseHasVariants(value: unknown): 0 | 1 {
  return parseIsVariant(value);
}

export function convertCourseIdToCode(courseId: string): string {
  const entry = Object.entries(courseCodeToIdMap).find(
    ([, id]) => id === String(courseId),
  );
  return entry?.[0] ?? "";
}

export function convertCourseIdToProduct(courseId: string): string {
  const code = convertCourseIdToCode(courseId);
  return code ? getFriendlyCourseName(code) : "";
}

export type PricingSubmenu = "one" | "group" | "subscribe";

export function serviceTypeToSubmenu(serviceType: string): PricingSubmenu {
  switch (serviceType) {
    case "1-on-1-tutoring":
      return "one";
    case "group-tutoring":
      return "group";
    case "self-study":
      return "subscribe";
    default:
      return "one";
  }
}

export function submenuToServiceType(submenu: PricingSubmenu): ServiceType {
  switch (submenu) {
    case "one":
      return "1-on-1-tutoring";
    case "group":
      return "group-tutoring";
    case "subscribe":
      return "self-study";
  }
}
