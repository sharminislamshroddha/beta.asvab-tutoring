import {
  COURSE_CODES,
  KNOWN_ROUTES_FALLBACK_PATHS,
  SERVICE_TYPES,
} from "@/lib/known-routes-fallback.generated";

export function isKnownCourseCode(courseCode: string): boolean {
  const normalized = courseCode.toLowerCase().replace(/-tutor$/, "");
  return COURSE_CODES.includes(normalized as (typeof COURSE_CODES)[number]);
}

export function isKnownServiceType(serviceType: string): boolean {
  return SERVICE_TYPES.includes(serviceType as (typeof SERVICE_TYPES)[number]);
}

export function isKnownBlogId(blogId: string): boolean {
  const prefix = `/blog-detail/${blogId}/`;
  return KNOWN_ROUTES_FALLBACK_PATHS.some((path) => path.startsWith(prefix));
}
