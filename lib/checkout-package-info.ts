import { decodeHtmlEntitiesDeep } from "@/lib/decode-html";
import {
  fetchAllPackageDetailsForCourse,
  fetchPackageDetails,
} from "@/lib/php-api";
import type { PackageData, PackageDetailsData } from "@/lib/package-types";
import { convertCourseIdToCode } from "@/lib/package-utils";
import type { ServiceType } from "@/types/Services";

export type CheckoutPackageSummaryData = {
  descriptionHtml: string;
  serviceType: ServiceType;
};

const ONE_ON_ONE_PACKAGE_IDS = new Set([
  "12",
  "14",
  "16",
  "18",
  "23",
  "28",
  "30",
]);

const GROUP_PACKAGE_IDS = new Set(["15", "19", "24", "29", "31"]);

const SELF_STUDY_PACKAGE_IDS = new Set([
  "34",
  "35",
  "36",
  "37",
  "38",
  "41",
  "42",
  "43",
]);

function findPackage(
  data: PackageDetailsData | PackageDetailsData["data"] | null | undefined,
  packageId: string,
): PackageData | undefined {
  const packages = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : [];

  return packages.find((pkg) => String(pkg.package_id) === String(packageId));
}

export function inferCheckoutServiceType(args: {
  packageId?: string;
  mode?: string;
  tutoringType?: string;
}): ServiceType | null {
  const packageId = String(args.packageId ?? "");
  if (ONE_ON_ONE_PACKAGE_IDS.has(packageId)) return "1-on-1-tutoring";
  if (GROUP_PACKAGE_IDS.has(packageId)) return "group-tutoring";
  if (SELF_STUDY_PACKAGE_IDS.has(packageId)) return "self-study";

  const tutoringType = (args.tutoringType ?? "").toLowerCase();
  if (
    tutoringType.includes("1-on-1") ||
    tutoringType.includes("1 on 1") ||
    tutoringType.includes("one-on-one")
  ) {
    return "1-on-1-tutoring";
  }
  if (tutoringType.includes("group")) return "group-tutoring";
  if (
    tutoringType.includes("subscription") ||
    tutoringType.includes("self-study") ||
    tutoringType.includes("self study")
  ) {
    return "self-study";
  }

  if (String(args.mode ?? "").toLowerCase() === "subscription") {
    return "self-study";
  }

  return null;
}

/** Prefer the Package Includes section when present; otherwise use the full description. */
export function extractPackageIncludesHtml(description: string): string {
  const decoded = decodeHtmlEntitiesDeep(description ?? "").trim();
  if (!decoded) return "";

  // Prod CMS content uses <h3>; older/dev content used <h2>.
  const match = decoded.match(
    /<h([1-6])[^>]*>\s*Package\s+Includes\s*<\/h\1>[\s\S]*/i,
  );
  return (match?.[0] ?? decoded).trim();
}

export async function resolveCheckoutPackageSummary(args: {
  courseId: string;
  packageId: string;
  mode?: string;
  tutoringType?: string;
}): Promise<CheckoutPackageSummaryData | null> {
  const courseCode = convertCourseIdToCode(args.courseId);
  const packageId = String(args.packageId ?? "");
  if (!courseCode || !packageId) return null;

  const preferred = inferCheckoutServiceType(args);

  if (preferred) {
    const data = await fetchPackageDetails(preferred, courseCode);
    const pkg = findPackage(data as PackageDetailsData | null, packageId);
    if (pkg?.description?.trim()) {
      return {
        descriptionHtml: pkg.description,
        serviceType: preferred,
      };
    }
  }

  const all = await fetchAllPackageDetailsForCourse(courseCode);
  for (const serviceType of [
    "self-study",
    "1-on-1-tutoring",
    "group-tutoring",
  ] as const) {
    const pkg = findPackage(all[serviceType], packageId);
    if (pkg?.description?.trim()) {
      return {
        descriptionHtml: pkg.description,
        serviceType,
      };
    }
  }

  // Still show NOTE / cancellation policy when service is known but description is empty.
  if (preferred) {
    return { descriptionHtml: "", serviceType: preferred };
  }

  return null;
}
