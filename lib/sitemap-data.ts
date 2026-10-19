import {
  fetchFreePracticeTestCatalog,
  fetchFreePredTestCatalog,
} from "@/lib/php-api";

export const SITEMAP_REVALIDATE_SECONDS = 3600;

export interface SitemapLink {
  url: string;
  path: string;
  label: string;
}

export interface SitemapSection {
  category: string;
  links: SitemapLink[];
}

/** Core indexable routes used when the API is unavailable. */
export const CORE_SITEMAP_PATHS: string[] = [
  "/",
  "/about-us",
  "/how-it-works",
  "/faq",
  "/sitemap",
  "/free-practice-tests",
  "/free-prediction-tests",
  "/our-mobile-apps",
  "/courses/asvab",
  "/courses/afoqt",
  "/courses/sift",
  "/courses/astb",
  "/courses/oar",
  "/courses/hesi-a2",
  "/courses/ati-teas",
  "/courses/cna",
  "/courses/shsat",
  "/courses/state-math-test-prep",
  "/package-details/1-on-1-tutoring/hesi-a2",
  "/package-details/1-on-1-tutoring/ati-teas",
  "/package-details/1-on-1-tutoring/cna",
  "/package-details/1-on-1-tutoring/shsat",
  "/package-details/1-on-1-tutoring/state-math-test-prep",
  "/package-details/group-tutoring/hesi-a2",
  "/package-details/group-tutoring/ati-teas",
  "/package-details/group-tutoring/cna",
  "/package-details/group-tutoring/shsat",
  "/package-details/group-tutoring/state-math-test-prep",
  "/package-details/self-study/hesi-a2",
  "/package-details/self-study/ati-teas",
  "/package-details/self-study/cna",
  "/package-details/self-study/shsat",
  "/package-details/self-study/state-math-test-prep",
  "/courses/asvab/free-practice-test",
  "/courses/afoqt/free-practice-test",
  "/courses/sift/free-practice-test",
  "/courses/astb/free-practice-test",
  "/courses/oar/free-practice-test",
  "/courses/shsat/free-practice-test",
  "/courses/state-math-test-prep/free-practice-test",
  "/courses/asvab/free-prediction-test",
  "/courses/afoqt/free-prediction-test",
  "/courses/sift/free-prediction-test",
  "/courses/astb/free-prediction-test",
  "/courses/oar/free-prediction-test",
  "/courses/shsat/free-prediction-test",
  "/courses/state-math-test-prep/free-prediction-test",
  "/services/1-on-1-tutoring",
  "/services/group-tutoring",
  "/services/self-study",
  "/pricing/1-on-1-tutoring",
  "/pricing/group-tutoring",
  "/pricing/self-study",
  "/our-tutors",
  "/privacy-policy",
  "/terms-of-service",
  "/blog",
  "/contact-us",
];

function getPhpApiUrl(): string | undefined {
  return process.env.PHP_API_URL || process.env.NEXT_PUBLIC_PHP_API_URL;
}

/** Legacy flat rows from PHP `get-sitemap` (course × city). */
interface LegacySitemapEntry {
  course_code: string;
  city: string;
  name?: string;
}

function isSitemapSection(item: unknown): item is SitemapSection {
  if (!item || typeof item !== "object") return false;
  const section = item as SitemapSection;
  return (
    typeof section.category === "string" && Array.isArray(section.links)
  );
}

function isLegacySitemapEntry(item: unknown): item is LegacySitemapEntry {
  if (!item || typeof item !== "object") return false;
  const entry = item as LegacySitemapEntry;
  return (
    typeof entry.course_code === "string" &&
    entry.course_code.length > 0 &&
    typeof entry.city === "string" &&
    entry.city.length > 0
  );
}

function isIndexableSitemapPath(path: string): boolean {
  return Boolean(path) && !path.startsWith("/online-courses/");
}

function legacyEntryToLink(entry: LegacySitemapEntry): SitemapLink {
  const courseCode = entry.course_code.toLowerCase().replace(/-tutor$/, "");
  const path = `/courses/${courseCode}`;
  return {
    url: path,
    path,
    label: entry.name ?? entry.course_code.toUpperCase(),
  };
}

/** Normalize API payload: sectioned sitemap or legacy course×city list. */
function normalizeSitemapData(data: unknown[]): SitemapSection[] {
  if (data.length === 0) return [];

  if (data.every(isSitemapSection)) {
    return data
      .map((section) => ({
        category: section.category,
        links: section.links.filter((link) => isIndexableSitemapPath(link?.path)),
      }))
      .filter((section) => section.links.length > 0);
  }

  if (data.every(isLegacySitemapEntry)) {
    return [
      {
        category: "Courses",
        links: data.map(legacyEntryToLink),
      },
    ];
  }

  console.error(
    "Sitemap: API data shape is unrecognized; expected sections with links or legacy course/city rows",
  );
  return [];
}

function mergeSectionsByCategory(sections: SitemapSection[]): SitemapSection[] {
  const byCategory = new Map<string, SitemapLink[]>();

  for (const section of sections) {
    const existing = byCategory.get(section.category) ?? [];
    const seenPaths = new Set(existing.map((link) => link.path));

    for (const link of section.links ?? []) {
      if (!link.path || seenPaths.has(link.path)) continue;
      existing.push(link);
      seenPaths.add(link.path);
    }

    byCategory.set(section.category, existing);
  }

  return [...byCategory.entries()].map(([category, links]) => ({
    category,
    links,
  }));
}

async function buildFreeTestsSitemapSection(): Promise<SitemapSection | null> {
  const [practiceCourses, predictionCourses] = await Promise.all([
    fetchFreePracticeTestCatalog(),
    fetchFreePredTestCatalog(),
  ]);

  const links: SitemapLink[] = [];

  if (practiceCourses.length > 0) {
    links.push({
      path: "/free-practice-tests",
      url: "/free-practice-tests",
      label: "Free Practice Tests",
    });
    links.push(
      ...practiceCourses.map((course) => ({
        path: `/courses/${course.courseCode}/free-practice-test`,
        url: `/courses/${course.courseCode}/free-practice-test`,
        label: `Free ${course.courseName} Practice Test`,
      })),
    );
  }

  if (predictionCourses.length > 0) {
    links.push({
      path: "/free-prediction-tests",
      url: "/free-prediction-tests",
      label: "Free Prediction Tests",
    });
    links.push(
      ...predictionCourses.map((course) => ({
        path: `/courses/${course.courseCode}/free-prediction-test`,
        url: `/courses/${course.courseCode}/free-prediction-test`,
        label: `Free ${course.courseName} Prediction Test`,
      })),
    );
  }

  if (links.length === 0) {
    return null;
  }

  return {
    category: "Free Tests",
    links,
  };
}

async function getReadyTestPaths(): Promise<string[]> {
  const [practiceCourses, predictionCourses] = await Promise.all([
    fetchFreePracticeTestCatalog(),
    fetchFreePredTestCatalog(),
  ]);

  return [
    ...practiceCourses.map(
      (course) => `/courses/${course.courseCode}/free-practice-test`,
    ),
    ...predictionCourses.map(
      (course) => `/courses/${course.courseCode}/free-prediction-test`,
    ),
  ];
}

/** Insert a section immediately before the first section with `beforeCategory`. */
function insertSectionBefore(
  sections: SitemapSection[],
  beforeCategory: string,
  section: SitemapSection,
): SitemapSection[] {
  const index = sections.findIndex((s) => s.category === beforeCategory);
  if (index === -1) {
    return [...sections, section];
  }

  return [
    ...sections.slice(0, index),
    section,
    ...sections.slice(index),
  ];
}

/** Sitemap sections for the HTML sitemap page, including live test links. */
export async function fetchSitemapPageSections(): Promise<SitemapSection[]> {
  const [apiSections, freeTestsSection] = await Promise.all([
    fetchSitemapSections(),
    buildFreeTestsSitemapSection(),
  ]);

  const sections = mergeSectionsByCategory(apiSections);

  if (!freeTestsSection) {
    return sections;
  }

  return insertSectionBefore(sections, "Blog Articles", freeTestsSection);
}

export async function fetchSitemapSections(): Promise<SitemapSection[]> {
  const apiUrl = getPhpApiUrl();
  if (!apiUrl) {
    console.error("Sitemap: PHP API URL is not configured");
    return [];
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "get-sitemap" }),
      next: { revalidate: SITEMAP_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      console.error("Sitemap: API returned", response.status);
      return [];
    }

    const result = await response.json();
    if (result?.isSuccess && Array.isArray(result.data)) {
      return normalizeSitemapData(result.data);
    }
  } catch (error) {
    console.error("Error fetching sitemap:", error);
  }

  return [];
}

export async function fetchSitemapPaths(): Promise<string[]> {
  const [sections, testPaths] = await Promise.all([
    fetchSitemapSections(),
    getReadyTestPaths(),
  ]);
  const paths = sections.flatMap((section) =>
    (section.links ?? []).map((link) => link.path).filter(Boolean),
  );

  if (paths.length === 0) {
    return [...new Set([...CORE_SITEMAP_PATHS, ...testPaths])];
  }

  return [...new Set([...CORE_SITEMAP_PATHS, ...paths, ...testPaths])];
}
