import {
  fetchSitemapSections,
  type SitemapLink,
} from "@/lib/sitemap-data";
import {
  KNOWN_ROUTES_FALLBACK_LINKS,
  KNOWN_ROUTES_FALLBACK_PATHS,
} from "@/lib/known-routes-fallback.generated";

export type { SitemapLink as KnownRouteLink };

/** Serializable route data passed from the server 404 page to the client matcher. */
export interface SerializableRouteIndex {
  paths: string[];
  links: SitemapLink[];
}

function toSitemapLink(link: { path: string; label: string }): SitemapLink {
  return {
    path: link.path,
    label: link.label,
    url: link.path,
  };
}

function mergeLinksByPath(...groups: SitemapLink[][]): SitemapLink[] {
  const byPath = new Map<string, SitemapLink>();
  for (const group of groups) {
    for (const link of group) {
      if (link.path) {
        byPath.set(link.path, link);
      }
    }
  }
  return [...byPath.values()];
}

const FALLBACK_LINKS: SitemapLink[] = KNOWN_ROUTES_FALLBACK_LINKS.map(toSitemapLink);

/**
 * Loads known indexable routes from the sitemap API, merged with the static
 * fallback reference list (package-details, blog posts, contact-us, etc.).
 */
export async function fetchKnownRouteIndex(): Promise<SerializableRouteIndex> {
  const sections = await fetchSitemapSections();
  const apiLinks = sections.flatMap((section) => section.links ?? []);

  const links =
    apiLinks.length > 0
      ? mergeLinksByPath(FALLBACK_LINKS, apiLinks)
      : [...FALLBACK_LINKS];

  const paths = [...new Set(links.map((link) => link.path))];

  for (const path of KNOWN_ROUTES_FALLBACK_PATHS) {
    if (!paths.includes(path)) {
      paths.push(path);
    }
  }

  return { paths, links };
}

export function isExcludedPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return (
    path.startsWith("/login") ||
    path.startsWith("/user-login") ||
    path.startsWith("/user-registration") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/checkout") ||
    path.startsWith("/admin")
  );
}

export function normalizePathname(pathname: string): string {
  const withoutQuery = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery || "/";
}
