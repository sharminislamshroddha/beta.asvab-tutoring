/**
 * SEO keyword groups per course and per page type.
 * Each page pulls only the groups assigned to that route (see PAGE_KEYWORD_GROUPS).
 */

export type KeywordGroupName =
  | "main"
  | "longTail"
  | "local"
  | "app"
  | "questionBased"
  | "buyerIntent"
  | "practiceTest"
  | "predictionTest";

export type KeywordGroups = Record<KeywordGroupName, readonly string[]>;

export type CourseCode =
  | "asvab"
  | "afoqt"
  | "sift"
  | "astb"
  | "oar"
  | "hesi-a2"
  | "ati-teas"
  | "cna"
  | "shsat"
  | "state-math-test-prep";

export const COURSE_CODES: readonly CourseCode[] = [
  "asvab",
  "afoqt",
  "sift",
  "astb",
  "oar",
  "hesi-a2",
  "ati-teas",
  "cna",
  "shsat",
  "state-math-test-prep",
] as const;

/** Keyword groups for each exam (provided keyword list only). */
export const COURSE_KEYWORDS: Record<CourseCode, KeywordGroups> = {
  asvab: {
    main: ["ASVAB tutoring", "ASVAB tutor", "ASVAB prep"],
    longTail: ["ASVAB math tutor", "ASVAB tutoring", "ASVAB GT score"],
    local: ["ASVAB tutor in {city}", "ASVAB tutoring in {city}"],
    app: ["ASVAB practice test", "ASVAB/AFQT prediction test"],
    questionBased: ["ASVAB tutoring", "ASVAB GT score"],
    buyerIntent: [
      "ASVAB tutor online",
      "best ASVAB tutoring program",
      "ASVAB math help online",
    ],
    practiceTest: [
      "free ASVAB practice test",
      "ASVAB practice test online",
      "Army ASVAB practice test",
      "Marine Corps ASVAB practice test",
    ],
    predictionTest: [
      "free ASVAB prediction test",
      "ASVAB/AFQT prediction test",
      "ASVAB score prediction",
    ],
  },
  afoqt: {
    main: ["AFOQT tutoring"],
    longTail: ["Air Force AFOQT prep"],
    local: ["AFOQT tutoring in {city}", "AFOQT tutor in {city}"],
    app: ["AFOQT practice test"],
    questionBased: ["Air Force AFOQT prep"],
    buyerIntent: [],
    practiceTest: [
      "free AFOQT practice test",
      "AFOQT practice test online",
      "Air Force AFOQT practice test",
    ],
    predictionTest: [
      "free AFOQT prediction test",
      "AFOQT score prediction",
      "Air Force AFOQT prediction test",
    ],
  },
  sift: {
    main: ["SIFT tutoring"],
    longTail: ["Army SIFT test prep"],
    local: ["SIFT tutoring in {city}", "SIFT tutor in {city}"],
    app: [],
    questionBased: ["Army SIFT test prep"],
    buyerIntent: [],
    practiceTest: [
      "free SIFT practice test",
      "SIFT practice test online",
      "Army SIFT practice test",
    ],
    predictionTest: ["free SIFT prediction test"],
  },
  astb: {
    main: ["ASTB tutoring"],
    longTail: [],
    local: ["ASTB tutoring in {city}", "ASTB tutor in {city}"],
    app: [],
    questionBased: [],
    buyerIntent: [],
    practiceTest: [
      "free ASTB practice test",
      "ASTB practice test online",
      "Navy ASTB practice test",
    ],
    predictionTest: ["free ASTB prediction test"],
  },
  oar: {
    main: ["OAR tutoring"],
    longTail: ["Navy OAR prep"],
    local: ["OAR tutoring in {city}", "OAR tutor in {city}"],
    app: [],
    questionBased: ["Navy OAR prep"],
    buyerIntent: [],
    practiceTest: [
      "free OAR practice test",
      "OAR practice test online",
      "Navy OAR practice test",
    ],
    predictionTest: ["free OAR prediction test"],
  },
  "hesi-a2": {
    main: ["HESI A2 tutoring", "HESI A2 tutor", "HESI A2 prep"],
    longTail: ["HESI A2 math prep", "HESI A2 test prep"],
    local: ["HESI A2 tutor in {city}", "HESI A2 tutoring in {city}"],
    app: [],
    questionBased: ["HESI A2 exam prep"],
    buyerIntent: ["HESI A2 tutor online", "best HESI A2 tutoring program"],
    practiceTest: [
      "free HESI A2 practice test",
      "HESI A2 practice test online",
    ],
    predictionTest: ["free HESI A2 prediction test"],
  },
  "ati-teas": {
    main: ["ATI TEAS tutoring", "TEAS tutor", "ATI TEAS prep"],
    longTail: ["ATI TEAS math prep", "TEAS exam prep"],
    local: ["ATI TEAS tutor in {city}", "TEAS tutoring in {city}"],
    app: [],
    questionBased: ["ATI TEAS exam prep"],
    buyerIntent: ["ATI TEAS tutor online", "best TEAS tutoring program"],
    practiceTest: [
      "free ATI TEAS practice test",
      "TEAS practice test online",
    ],
    predictionTest: ["free ATI TEAS prediction test"],
  },
  cna: {
    main: ["CNA tutoring", "CNA tutor", "CNA prep"],
    longTail: ["CNA exam prep", "CNA test prep"],
    local: ["CNA tutor in {city}", "CNA tutoring in {city}"],
    app: [],
    questionBased: ["CNA certification prep"],
    buyerIntent: ["CNA tutor online", "best CNA tutoring program"],
    practiceTest: ["free CNA practice test", "CNA practice test online"],
    predictionTest: ["free CNA prediction test"],
  },
  shsat: {
    main: ["SHSAT tutoring", "SHSAT tutor", "SHSAT prep"],
    longTail: ["SHSAT exam prep", "SHSAT test prep"],
    local: ["SHSAT tutor in {city}", "SHSAT tutoring in {city}"],
    app: [],
    questionBased: ["SHSAT exam prep"],
    buyerIntent: ["SHSAT tutor online", "best SHSAT tutoring program"],
    practiceTest: ["free SHSAT practice test", "SHSAT practice test online"],
    predictionTest: ["free SHSAT prediction test"],
  },
  "state-math-test-prep": {
    main: ["State Math Test Prep tutoring", "State Math Test Prep tutor", "State Math Test Prep prep"],
    longTail: ["State Math Test Prep exam prep", "State Math Test Prep test prep"],
    local: ["State Math Test Prep tutor in {city}", "State Math Test Prep tutoring in {city}"],
    app: [],
    questionBased: ["State Math Test Prep exam prep"],
    buyerIntent: ["State Math Test Prep tutor online", "best State Math Test Prep tutoring program"],
    practiceTest: ["free State Math Test Prep practice test", "State Math Test Prep practice test online"],
    predictionTest: ["free State Math Test Prep prediction test"],
  },
};

/** Which keyword groups each page type uses. */
export const PAGE_KEYWORD_GROUPS = {
  home: ["main"],
  course: ["main", "longTail"],
  "service-1-on-1": ["main", "buyerIntent"],
  "package-1-on-1": ["main", "buyerIntent"],
  "package-group": ["main"],
  pricing: ["buyerIntent", "main"],
  "mobile-apps": ["app"],
  "free-practice-tests": ["practiceTest"],
  "free-practice-test": ["practiceTest"],
  "free-prediction-tests": ["predictionTest"],
  "free-prediction-test": ["predictionTest"],
  faq: ["questionBased", "longTail"],
  blog: ["longTail", "questionBased"],
} as const satisfies Record<string, readonly KeywordGroupName[]>;

/** Index page: branch-agnostic practice-test terms. */
const SHARED_FREE_PRACTICE_TESTS_KEYWORDS = [
  "free online practice tests",
  "free military practice test",
  "military entrance exam practice test",
  "free healthcare practice test",
  "nursing school practice test",
  "free academic practice test",
  "state math practice test",
] as const;

const SHARED_FREE_PREDICTION_TESTS_KEYWORDS = [
  "free online prediction tests",
  "free military prediction test",
  "military entrance exam prediction test",
  "free healthcare prediction test",
  "nursing school prediction test",
  "free academic prediction test",
  "state math prediction test",
] as const;

export type PageKeywordTarget = keyof typeof PAGE_KEYWORD_GROUPS;

function normalizeCourseCode(code?: string): CourseCode | undefined {
  if (!code) return undefined;
  const lower = code.toLowerCase().replace(/-tutor$/, "");
  return COURSE_CODES.includes(lower as CourseCode)
    ? (lower as CourseCode)
    : undefined;
}

function applyCity(keywords: readonly string[], city?: string): string[] {
  if (!city) return [...keywords];
  const formatted = city.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return keywords.map((k) => k.replace(/\{city\}/g, formatted));
}

/** Flatten selected groups for one exam. */
export function getCourseKeywords(
  courseCode: string,
  page: PageKeywordTarget,
  city?: string,
): string[] {
  const code = normalizeCourseCode(courseCode);
  if (!code) return [];

  const groupNames = PAGE_KEYWORD_GROUPS[page];
  const groups = COURSE_KEYWORDS[code];
  const result: string[] = [];

  for (const name of groupNames) {
    result.push(...groups[name]);
  }

  return [...new Set(applyCity(result, city))];
}

/** Homepage: main keywords from every exam. */
export function getHomeKeywords(): string[] {
  return [
    ...new Set(
      COURSE_CODES.flatMap((code) => [...COURSE_KEYWORDS[code].main]),
    ),
  ];
}

/** Mobile apps page: all app-group keywords across exams. */
export function getMobileAppsKeywords(): string[] {
  return [
    ...new Set(
      COURSE_CODES.flatMap((code) => [...COURSE_KEYWORDS[code].app]),
    ),
  ];
}

/** Free practice tests index: shared + per-exam practice-test keywords. */
export function getFreePracticeTestsKeywords(): string[] {
  return [
    ...new Set([
      ...SHARED_FREE_PRACTICE_TESTS_KEYWORDS,
      ...COURSE_CODES.flatMap((code) =>
        getCourseKeywords(code, "free-practice-tests"),
      ),
    ]),
  ];
}

/** Free prediction tests index: shared + per-exam prediction-test keywords. */
export function getFreePredictionTestsKeywords(): string[] {
  return [
    ...new Set([
      ...SHARED_FREE_PREDICTION_TESTS_KEYWORDS,
      ...COURSE_CODES.flatMap((code) =>
        getCourseKeywords(code, "free-prediction-tests"),
      ),
    ]),
  ];
}

/** FAQ: question-based + long-tail topics across exams. */
export function getFaqKeywords(): string[] {
  return [
    ...new Set(
      COURSE_CODES.flatMap((code) => [
        ...COURSE_KEYWORDS[code].questionBased,
        ...COURSE_KEYWORDS[code].longTail,
      ]),
    ),
  ];
}

/** Blog index: long-tail + question topics across exams. */
export function getBlogKeywords(): string[] {
  return [
    ...new Set(
      COURSE_CODES.flatMap((code) => [
        ...COURSE_KEYWORDS[code].longTail,
        ...COURSE_KEYWORDS[code].questionBased,
      ]),
    ),
  ];
}

/** Pricing routes (all exams: main + buyer-intent per course). */
export function getPricingKeywords(): string[] {
  return [
    ...new Set(
      COURSE_CODES.flatMap((code) => getCourseKeywords(code, "pricing")),
    ),
  ];
}

/** Service pages (all exams combined for that service type). */
export function getServiceKeywords(serviceType: string): string[] {
  const page: PageKeywordTarget =
    serviceType === "1-on-1-tutoring" ? "service-1-on-1" : "course";

  return [
    ...new Set(
      COURSE_CODES.flatMap((code) => getCourseKeywords(code, page)),
    ),
  ];
}

/**
 * Resolve meta keywords for a public route.
 * Pass courseCode and/or city when the URL includes them.
 */
export function getPageKeywords(options: {
  page: PageKeywordTarget;
  courseCode?: string;
  city?: string;
  serviceType?: string;
}): string[] {
  const { page, courseCode, city, serviceType } = options;

  switch (page) {
    case "home":
      return getHomeKeywords();
    case "mobile-apps":
      return getMobileAppsKeywords();
    case "free-practice-tests":
      return getFreePracticeTestsKeywords();
    case "free-prediction-tests":
      return getFreePredictionTestsKeywords();
    case "faq":
      return getFaqKeywords();
    case "blog":
      return getBlogKeywords();
    case "course":
    case "free-practice-test":
    case "free-prediction-test":
    case "package-1-on-1":
    case "package-group":
    case "pricing":
      return courseCode
        ? getCourseKeywords(courseCode, page, city)
        : [];
    case "service-1-on-1":
      return serviceType
        ? getServiceKeywords(serviceType)
        : getServiceKeywords("1-on-1-tutoring");
    default:
      return courseCode ? getCourseKeywords(courseCode, page, city) : [];
  }
}

/** Map package slug to keyword page target. */
export function packagePageTarget(
  serviceType: string,
): "package-1-on-1" | "package-group" {
  return serviceType === "1-on-1-tutoring"
    ? "package-1-on-1"
    : "package-group";
}
