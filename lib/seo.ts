import type { Metadata } from "next";
import { getHomeKeywords } from "@/lib/keywords";

export const SITE_URL = "https://www.asvab-tutoring.com";
export const SITE_NAME = "ASVAB Tutoring";
export const DEFAULT_OG_IMAGE = "/images/asvab-tutoring-logo.webp";

export const DEFAULT_DESCRIPTION =
  "Online one-on-one tutoring, group tutoring, and self-study courses for ASVAB, AFOQT, ASTB, OAR, and SIFT test preparation.";

export const DEFAULT_TITLE =
  "ASVAB Tutoring: ASVAB Tutor, ASTB, OAR, AFOQT, SIFT Tutoring";

/** Homepage main-keyword groups (see lib/keywords.ts). */
export const DEFAULT_KEYWORDS = getHomeKeywords();

export const NOINDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
};

export function canonicalPath(path: string): string {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function absoluteUrl(path: string): string {
  return new URL(canonicalPath(path), SITE_URL).toString();
}

type BuildMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: readonly string[];
  openGraph?: Metadata["openGraph"];
  robots?: Metadata["robots"];
} & Omit<
  Metadata,
  "title" | "description" | "alternates" | "openGraph" | "robots" | "keywords"
>;

export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
  openGraph,
  robots,
  ...rest
}: BuildMetadataOptions): Metadata {
  const canonical = canonicalPath(path);

  return {
    title,
    description,
    ...(keywords?.length ? { keywords: [...keywords] } : {}),
    alternates: { canonical },
    robots: robots ?? { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          alt: SITE_NAME,
        },
      ],
      ...openGraph,
    },
    ...rest,
  };
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl(DEFAULT_OG_IMAGE),
  email: "info@asvab-tutoring.com",
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
};

export function buildCourseJsonLd(
  courseCode: string,
  meta: { title: string; description: string },
) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: meta.title,
    description: meta.description,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    url: absoluteUrl(`/courses/${courseCode.toLowerCase()}`),
  };
}

export function buildArticleJsonLd(blog: {
  blog_id: string;
  blog_title: string;
  written_by: string;
  created_at: string;
  blog_content?: string;
  blogTitleSlug: string;
}) {
  const description =
    blog.blog_content?.replace(/<[^>]*>/g, "").slice(0, 160).trim() ?? "";

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.blog_title,
    description,
    author: {
      "@type": "Person",
      name: blog.written_by,
    },
    datePublished: blog.created_at,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(DEFAULT_OG_IMAGE),
      },
    },
    mainEntityOfPage: absoluteUrl(
      `/blog-detail/${blog.blog_id}/${blog.blogTitleSlug}`,
    ),
  };
}
