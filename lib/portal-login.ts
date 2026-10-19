const FALLBACK_PORTAL =
  process.env.NEXT_PUBLIC_RESOURCES_URL?.replace(/\/$/, "") ||
  "https://test-prep.asvab-tutoring.com";

/** Same-origin path that 302s into the study portal with a login session. */
export const STUDY_PORTAL_HREF = "/api/auth/study-portal";

export function resolvePortalLoginUrl(phpUrl: string | undefined | null): string {
  const raw = String(phpUrl || "").trim();
  if (!raw) return FALLBACK_PORTAL;

  try {
    const portal = new URL(raw);
    const base = new URL(FALLBACK_PORTAL);
    portal.protocol = base.protocol;
    portal.host = base.host;
    return portal.toString();
  } catch {
    return raw;
  }
}
