const FALLBACK_PORTAL =
  process.env.NEXT_PUBLIC_RESOURCES_URL?.replace(/\/$/, "") ||
  "https://test-prep.asvab-tutoring.com";

/** Logged-in student study area (app/study). The old PHP portal hand-off is /api/auth/study-portal. */
export const STUDY_PORTAL_HREF = "/study";

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
