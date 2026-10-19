import { convertCourseCodeToId } from "@/lib/package-utils";
import type { PackageSession, PackagesByService } from "@/lib/package-types";

export const ALL_FREE_PREDICTION_TESTS_HREF = "/free-prediction-tests";

export function getCourseFreePredictionTestHref(courseCode: string): string {
  return `/courses/${encodeURIComponent(courseCode)}/free-prediction-test`;
}

function isSubscriptionSession(session: { mode?: string }): boolean {
  return String(session?.mode ?? "").toLowerCase() === "subscription";
}

function findMonthlySubscriptionSession(
  packagesByService?: PackagesByService,
): { packageId: string | number; session: PackageSession } | null {
  const packages = packagesByService?.["self-study"]?.data ?? [];
  let fallback: { packageId: string | number; session: PackageSession } | null =
    null;

  for (const pkg of packages) {
    for (const session of pkg.sessions ?? []) {
      if (!isSubscriptionSession(session)) continue;
      if (String(session.cadence ?? "").toUpperCase() !== "1M") continue;

      const entry = { packageId: pkg.package_id, session };
      if (Number(session.price) === 15) return entry;
      if (!fallback) fallback = entry;
    }
  }

  return fallback;
}

export function buildSubscriptionCheckoutHref(args: {
  courseId: string;
  packageId: string | number;
  session: PackageSession;
  mainCourseId?: string | number;
}): string {
  const { courseId, packageId, session, mainCourseId } = args;
  const query = new URLSearchParams({
    course_id: courseId,
    package_id: String(packageId),
    session_id: String(session.session_id),
    amount: String(Math.round(Number(session.price) * 100)),
    mode: "subscription",
    product: String(session.product ?? ""),
    cadence: String(session.cadence ?? ""),
  });
  if (mainCourseId != null && String(mainCourseId).trim() !== "") {
    query.set("main_course_id", String(mainCourseId));
  }
  return `/checkout?${query.toString()}`;
}

/** Self-study monthly subscription checkout for the full prediction test. */
export function getFullPredictionTestCheckoutHref(args: {
  courseCode: string;
  courseId?: number | string;
  mainCourseId?: number | string;
  packagesByService?: PackagesByService;
}): string | null {
  const match = findMonthlySubscriptionSession(args.packagesByService);
  if (!match) return null;

  const courseId =
    args.courseId != null
      ? String(args.courseId)
      : convertCourseCodeToId(args.courseCode);

  return buildSubscriptionCheckoutHref({
    courseId,
    packageId: match.packageId,
    session: match.session,
    mainCourseId: args.mainCourseId,
  });
}
