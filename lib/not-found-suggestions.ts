import {
  COURSE_CODES,
  SERVICE_TYPES,
} from "@/lib/known-routes-fallback.generated";
import {
  normalizePathname,
  type SerializableRouteIndex,
} from "@/lib/known-routes";

export type NotFoundTemplate =
  | "default"
  | "course"
  | "service"
  | "pricing"
  | "package"
  | "blog";

export interface NotFoundSuggestion {
  href: string;
  label: string;
  description?: string;
  isPrimary?: boolean;
}

export interface NotFoundResult {
  template: NotFoundTemplate;
  title: string;
  intro: string;
  suggestions: NotFoundSuggestion[];
}

const ROOT_ALIASES: Record<string, string> = {
  course: "courses",
  courses: "courses",
  service: "services",
  services: "services",
  price: "pricing",
  pricing: "pricing",
  blogs: "blog",
  blog: "blog",
  tutor: "our-tutors",
  tutors: "our-tutors",
  contact: "contact-us",
};

interface RouteIndex {
  pathSet: Set<string>;
  labelByPath: Map<string, string>;
  courses: string[];
  services: string[];
  pricingServices: string[];
  packagePaths: string[];
  blogById: Map<string, { id: string; slug: string; path: string }>;
  blogSlugs: Array<{ id: string; slug: string; path: string }>;
}

export function buildRouteIndex(data: SerializableRouteIndex): RouteIndex {
  const pathSet = new Set(data.paths);
  const labelByPath = new Map(data.links.map((link) => [link.path, link.label]));

  const courses = [
    ...new Set(
      data.paths
        .filter((path) => path.startsWith("/courses/"))
        .map((path) => path.split("/")[2]!)
        .filter(Boolean),
    ),
  ];

  const services = [
    ...new Set(
      data.paths
        .filter((path) => path.startsWith("/services/"))
        .map((path) => path.split("/")[2]!)
        .filter(Boolean),
    ),
  ];

  const pricingServices = [
    ...new Set(
      data.paths
        .filter((path) => path.startsWith("/pricing/"))
        .map((path) => path.split("/")[2]!)
        .filter(Boolean),
    ),
  ];

  const packagePaths = data.paths.filter((path) =>
    path.startsWith("/package-details/"),
  );

  const blogById = new Map<string, { id: string; slug: string; path: string }>();
  const blogSlugs: Array<{ id: string; slug: string; path: string }> = [];
  for (const path of data.paths) {
    if (!path.startsWith("/blog-detail/")) continue;
    const [, , id, slug] = path.split("/");
    if (!id || !slug) continue;
    const entry = { id, slug, path };
    blogById.set(id, entry);
    blogSlugs.push(entry);
  }

  return {
    pathSet,
    labelByPath,
    courses: courses.length ? courses : [...COURSE_CODES],
    services: services.length ? services : [...SERVICE_TYPES],
    pricingServices: pricingServices.length ? pricingServices : [...SERVICE_TYPES],
    packagePaths,
    blogById,
    blogSlugs,
  };
}

function resolveRootSegment(segment: string): string {
  const lower = segment.toLowerCase();
  return ROOT_ALIASES[lower] ?? lower;
}

function normalizeSegments(pathname: string): string[] {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") return [];
  const segments = normalized
    .slice(1)
    .split("/")
    .filter(Boolean)
    .map((segment, index) => (index === 0 ? resolveRootSegment(segment) : segment.toLowerCase()));

  if (segments.length > 0) {
    const root = segments[0]!;
    if (!KNOWN_ROOTS.includes(root)) {
      const fuzzyRoot = fuzzyBestMatch(root, KNOWN_ROOTS);
      if (fuzzyRoot) {
        segments[0] = fuzzyRoot;
      }
    }
  }

  return segments;
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) matrix[i]![0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }
  return matrix[a.length]![b.length]!;
}

function maxDistance(value: string): number {
  if (value.length <= 4) return 2;
  if (value.length <= 8) return 3;
  return 4;
}

function fuzzyBestMatch(input: string, candidates: string[]): string | null {
  const needle = input.toLowerCase();
  const exact = candidates.find((candidate) => candidate.toLowerCase() === needle);
  if (exact) return exact;

  let best: { value: string; distance: number } | null = null;
  for (const candidate of candidates) {
    const distance = levenshtein(needle, candidate.toLowerCase());
    if (distance > maxDistance(needle)) continue;
    if (!best || distance < best.distance) {
      best = { value: candidate, distance };
    }
  }
  return best?.value ?? null;
}

function pathToSuggestion(path: string, index: RouteIndex, isPrimary = false): NotFoundSuggestion {
  return {
    href: path,
    label: index.labelByPath.get(path) ?? path.replace(/\//g, " ").trim(),
    isPrimary,
  };
}

function templateForRoot(root: string | undefined): NotFoundTemplate {
  switch (root) {
    case "courses":
      return "course";
    case "services":
      return "service";
    case "pricing":
      return "pricing";
    case "package-details":
      return "package";
    case "blog":
    case "blog-detail":
      return "blog";
    default:
      return "default";
  }
}

function templateMeta(template: NotFoundTemplate): { title: string; intro: string } {
  switch (template) {
    case "course":
      return {
        title: "Looking for a course?",
        intro: "We could not find that course page, but these exam prep courses may be what you need.",
      };
    case "service":
      return {
        title: "Looking for tutoring services?",
        intro: "That service page was not found. Try one of our tutoring services below.",
      };
    case "pricing":
      return {
        title: "Looking for pricing?",
        intro: "That pricing page was not found. Compare our tutoring plans here.",
      };
    case "package":
      return {
        title: "Looking for package details?",
        intro: "That package page was not found. Browse available tutoring packages below.",
      };
    case "blog":
      return {
        title: "Looking for a blog article?",
        intro: "That article was not found. Browse related posts or our blog index.",
      };
    default:
      return {
        title: "Find what you are looking for",
        intro: "Sorry, we could not find the page you wanted. Here are some helpful places to start.",
      };
  }
}

function isKnownPath(path: string, index: RouteIndex): boolean {
  return index.pathSet.has(normalizePathname(path));
}

function isSegmentRecognized(
  segments: string[],
  segmentIndex: number,
  index: RouteIndex,
): boolean {
  const segment = segments[segmentIndex];
  if (!segment) return false;

  const root = segments[0];
  const path = `/${segments.slice(0, segmentIndex + 1).join("/")}`;

  if (isKnownPath(path, index)) return true;

  if (segmentIndex === 0) {
    return [
      "courses",
      "services",
      "pricing",
      "package-details",
      "blog",
      "blog-detail",
      ...STATIC_ROOTS,
    ].includes(segment);
  }

  if (root === "courses" && segmentIndex === 1) {
    return index.courses.includes(segment.replace(/-tutor$/, ""));
  }

  if (root === "services" && segmentIndex === 1) {
    return index.services.includes(segment);
  }

  if (root === "pricing" && segmentIndex === 1) {
    return index.pricingServices.includes(segment);
  }

  if (root === "package-details") {
    if (segmentIndex === 1) return index.services.includes(segment);
    if (segmentIndex === 2) {
      return index.courses.includes(segment.replace(/-tutor$/, ""));
    }
  }

  if (root === "blog-detail") {
    if (segmentIndex === 1) return index.blogById.has(segment);
    if (segmentIndex === 2) {
      const id = segments[1];
      const blog = id ? index.blogById.get(id) : undefined;
      return blog?.slug === segment;
    }
  }

  if (segmentIndex === segments.length - 1) {
    const courseCode = segment.replace(/-tutor$/, "");
    if (index.courses.includes(courseCode)) return true;
    if (index.services.includes(segment)) return true;
  }

  return false;
}

function isPrefixRecognized(prefixSegments: string[], index: RouteIndex): boolean {
  if (prefixSegments.length === 0) return true;

  const root = prefixSegments[0];
  if (!root) return false;

  const fullPath = `/${prefixSegments.join("/")}`;
  if (isKnownPath(fullPath, index)) return true;

  if (prefixSegments.length === 1) {
    return [
      "courses",
      "services",
      "pricing",
      "package-details",
      "blog",
      "blog-detail",
      ...STATIC_ROOTS,
    ].includes(root);
  }

  if (root === "blog-detail" && prefixSegments.length === 2) {
    return index.blogById.has(prefixSegments[1]!);
  }

  if (root === "package-details" && prefixSegments.length === 2) {
    return index.services.includes(prefixSegments[1]!);
  }

  return prefixSegments.every((_, idx) => isSegmentRecognized(prefixSegments, idx, index));
}

const STATIC_ROOTS = [
  "about-us",
  "how-it-works",
  "faq",
  "sitemap",
  "our-mobile-apps",
  "our-tutors",
  "privacy-policy",
  "terms-of-service",
  "blog",
  "contact-us",
];

const KNOWN_ROOTS = [
  "courses",
  "services",
  "pricing",
  "package-details",
  "blog",
  "blog-detail",
  ...STATIC_ROOTS,
];

function buildPathFromPrefix(prefixSegments: string[], leaf: string): string {
  return `/${[...prefixSegments, leaf].join("/")}`;
}

function getCandidateValues(prefixSegments: string[], index: RouteIndex): string[] {
  const root = prefixSegments[0];
  if (!root) {
    return STATIC_ROOTS;
  }

  if (root === "courses" && prefixSegments.length === 1) {
    return index.courses;
  }

  if (root === "services" && prefixSegments.length === 1) {
    return index.services;
  }

  if (root === "pricing" && prefixSegments.length === 1) {
    return index.pricingServices;
  }

  if (root === "package-details") {
    if (prefixSegments.length === 1) return index.services;
    if (prefixSegments.length === 2) return index.courses;
  }

  if (root === "blog-detail") {
    if (prefixSegments.length === 1) {
      return index.blogSlugs.map((entry) => entry.slug);
    }
    if (prefixSegments.length === 2) {
      const id = prefixSegments[1];
      const blog = id ? index.blogById.get(id) : undefined;
      return blog ? [blog.slug] : index.blogSlugs.map((entry) => entry.slug);
    }
  }

  return [];
}

function suggestionsFromPaths(
  paths: string[],
  index: RouteIndex,
  primaryPath?: string,
): NotFoundSuggestion[] {
  const unique = [...new Set(paths.filter((path) => isKnownPath(path, index)))];
  const ordered = primaryPath
    ? [primaryPath, ...unique.filter((path) => path !== primaryPath)]
    : unique;

  return ordered.slice(0, 6).map((path, idx) => pathToSuggestion(path, index, idx === 0 && Boolean(primaryPath)));
}

function suggestionsForPrefix(prefixSegments: string[], index: RouteIndex): NotFoundSuggestion[] {
  const root = prefixSegments[0];

  if (!root || prefixSegments.length === 0) {
    return defaultSuggestions(index);
  }

  if (root === "courses" && prefixSegments.length === 1) {
    return suggestionsFromPaths(
      index.courses.map((code) => `/courses/${code}`),
      index,
    );
  }

  if (root === "services" && prefixSegments.length === 1) {
    return suggestionsFromPaths(
      index.services.map((service) => `/services/${service}`),
      index,
    );
  }

  if (root === "pricing" && prefixSegments.length === 1) {
    return suggestionsFromPaths(
      index.pricingServices.map((service) => `/pricing/${service}`),
      index,
    );
  }

  if (root === "package-details" && prefixSegments.length === 1) {
    return suggestionsFromPaths(index.packagePaths, index);
  }

  if (root === "package-details" && prefixSegments.length === 2) {
    const service = prefixSegments[1]!;
    return suggestionsFromPaths(
      index.courses.map((course) => `/package-details/${service}/${course}`),
      index,
    );
  }

  if (root === "blog-detail") {
    if (prefixSegments.length === 2) {
      const id = prefixSegments[1]!;
      const blog = index.blogById.get(id);
      if (blog) {
        return suggestionsFromPaths([blog.path, "/blog"], index, blog.path);
      }
    }
    return suggestionsFromPaths(
      ["/blog", ...index.blogSlugs.slice(0, 4).map((entry) => entry.path)],
      index,
      "/blog",
    );
  }

  return defaultSuggestions(index);
}

function defaultSuggestions(index: RouteIndex): NotFoundSuggestion[] {
  const defaults = [
    "/",
    "/courses/asvab",
    "/services/1-on-1-tutoring",
    "/pricing/1-on-1-tutoring",
    "/blog",
    "/contact-us",
    "/faq",
    "/sitemap",
  ];
  return suggestionsFromPaths(defaults, index);
}

function resolveFuzzyLeaf(
  prefixSegments: string[],
  fuzzyLeaf: string,
  index: RouteIndex,
): NotFoundResult {
  const root = prefixSegments[0];
  const template = templateForRoot(root);
  const meta = templateMeta(template);
  const candidates = getCandidateValues(prefixSegments, index);

  if (root === "blog-detail" && prefixSegments.length === 1) {
    const match = fuzzyBestMatch(
      fuzzyLeaf,
      index.blogSlugs.map((entry) => entry.slug),
    );
    const blog = match
      ? index.blogSlugs.find((entry) => entry.slug === match)
      : index.blogSlugs.find((entry) => levenshtein(entry.slug, fuzzyLeaf.toLowerCase()) <= maxDistance(fuzzyLeaf));
    if (blog) {
      return {
        template,
        ...meta,
        suggestions: suggestionsFromPaths([blog.path, "/blog"], index, blog.path),
      };
    }
  }

  const matched = fuzzyBestMatch(fuzzyLeaf.replace(/-tutor$/, ""), candidates);
  if (matched) {
    let primaryPath = buildPathFromPrefix(prefixSegments, matched);
    if (root === "blog-detail" && prefixSegments.length === 2) {
      const id = prefixSegments[1]!;
      primaryPath = `/blog-detail/${id}/${matched}`;
    }

    if (isKnownPath(primaryPath, index)) {
      return {
        template,
        ...meta,
        suggestions: suggestionsFromPaths(
          [primaryPath, ...suggestionsForPrefix(prefixSegments, index).map((s) => s.href)],
          index,
          primaryPath,
        ),
      };
    }
  }

  return {
    template,
    ...meta,
    suggestions: suggestionsForPrefix(prefixSegments, index),
  };
}

function caseFuzzyEndpoint(segments: string[], index: RouteIndex): NotFoundResult {
  for (let fuzzyIndex = segments.length - 1; fuzzyIndex >= 0; fuzzyIndex--) {
    const fuzzyLeaf = segments[fuzzyIndex]!;
    if (isSegmentRecognized(segments, fuzzyIndex, index)) {
      continue;
    }

    const prefixSegments = segments.slice(0, fuzzyIndex);
    if (isPrefixRecognized(prefixSegments, index)) {
      return resolveFuzzyLeaf(prefixSegments, fuzzyLeaf, index);
    }
  }

  return {
    template: "default",
    ...templateMeta("default"),
    suggestions: defaultSuggestions(index),
  };
}

function caseExactEndpointWithFuzzyParent(segments: string[], index: RouteIndex): NotFoundResult {
  const root = segments[0];
  const template = templateForRoot(root);
  const meta = templateMeta(template);
  const leaf = segments[segments.length - 1]!;

  const corrected = [...segments];
  let hasFuzzyParent = false;

  for (let i = 0; i < segments.length - 1; i++) {
    if (isSegmentRecognized(segments, i, index)) continue;
    hasFuzzyParent = true;
    const prefix = segments.slice(0, i);
    const candidates = getCandidateValues(prefix, index);
    const matched = fuzzyBestMatch(segments[i]!, candidates);
    if (matched) {
      corrected[i] = matched;
    }
  }

  if (!hasFuzzyParent) {
    return {
      template: "default",
      ...templateMeta("default"),
      suggestions: defaultSuggestions(index),
    };
  }

  const rebuilt = `/${corrected.join("/")}`;
  if (isKnownPath(rebuilt, index)) {
    return {
      template,
      ...meta,
      suggestions: suggestionsFromPaths(
        [rebuilt, ...suggestionsForPrefix(corrected.slice(0, -1), index).map((s) => s.href)],
        index,
        rebuilt,
      ),
    };
  }

  if (root === "package-details" && corrected.length === 3) {
    const course = corrected[2]!.replace(/-tutor$/, "");
    const paths = index.services
      .map((service) => `/package-details/${service}/${course}`)
      .filter((path) => isKnownPath(path, index));
    if (paths.length) {
      return {
        template,
        ...meta,
        suggestions: suggestionsFromPaths(paths, index, paths[0]),
      };
    }
  }

  return {
    template,
    ...meta,
    suggestions: suggestionsForPrefix(corrected.slice(0, -1), index),
  };
}

export function getNotFoundSuggestions(
  pathname: string,
  data: SerializableRouteIndex,
): NotFoundResult {
  const index = buildRouteIndex(data);
  const segments = normalizeSegments(pathname);

  if (segments.length === 0) {
    return {
      template: "default",
      ...templateMeta("default"),
      suggestions: defaultSuggestions(index),
    };
  }

  const leafIndex = segments.length - 1;
  const leafRecognized = isSegmentRecognized(segments, leafIndex, index);

  if (!leafRecognized) {
    return caseFuzzyEndpoint(segments, index);
  }

  const parentHasFuzzy = segments
    .slice(0, -1)
    .some((_, idx) => !isSegmentRecognized(segments, idx, index));

  if (parentHasFuzzy) {
    return caseExactEndpointWithFuzzyParent(segments, index);
  }

  const fullPath = `/${segments.join("/")}`;
  if (isKnownPath(fullPath, index)) {
    const template = templateForRoot(segments[0]);
    const meta = templateMeta(template);
    const normalizedInput = normalizePathname(pathname);

    if (normalizedInput !== fullPath) {
      return {
        template,
        ...meta,
        suggestions: suggestionsFromPaths(
          [fullPath, ...suggestionsForPrefix(segments.slice(0, -1), index).map((s) => s.href)],
          index,
          fullPath,
        ),
      };
    }

    return {
      template,
      ...meta,
      suggestions: suggestionsForPrefix(segments.slice(0, -1), index),
    };
  }

  return {
    template: templateForRoot(segments[0]),
    ...templateMeta(templateForRoot(segments[0])),
    suggestions: suggestionsForPrefix(segments, index),
  };
}
