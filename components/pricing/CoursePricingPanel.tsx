"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./coursePricing.module.css";
import { isSubscriptionSession } from "./PricingCard";
import CoursePricingCard from "./CoursePricingCard";
import { convertCourseCodeToId, getFriendlyCourseName } from "@/lib/package-utils";
import type { ServiceType } from "@/types/Services";
import type {
  PackageData,
  PackageSession,
  PackagesByService,
} from "@/lib/package-types";

const SERVICE_ORDER: ServiceType[] = [
  "self-study",
  "1-on-1-tutoring",
  "group-tutoring",
];

const SERVICE_TAB_LABELS: Record<ServiceType, string> = {
  "1-on-1-tutoring": "1-on-1 Tutoring",
  "group-tutoring": "Group Tutoring",
  "self-study": "Self-Study",
};

const SERVICE_CTA_LABELS: Record<ServiceType, string> = {
  "1-on-1-tutoring": "View 1-on-1 Tutoring Package Details",
  "group-tutoring": "View Group Tutoring Package Details",
  "self-study": "View Self-Study Package Details",
};

const FRIENDLY_PACKAGE_TYPE: Record<ServiceType, string> = {
  "1-on-1-tutoring": "1-on-1 Tutoring",
  "group-tutoring": "Group Tutoring",
  "self-study": "Subscription",
};

type CourseOption = {
  courseCode: string;
  courseName: string;
};

function getDefaultCourseCode(courses: CourseOption[]): string {
  return (
    courses.find((c) => c.courseCode === "asvab")?.courseCode ??
    courses[0]?.courseCode ??
    ""
  );
}

function hasPackages(data: PackagesByService[ServiceType] | undefined): boolean {
  return Boolean(data?.data && data.data.length > 0);
}

type BaseProps = {
  embedded?: boolean;
};

type FixedCourseProps = BaseProps & {
  courseCode: string;
  packagesByService: PackagesByService;
  courseOptions?: never;
  packagesByCourse?: never;
};

type SelectableCourseProps = BaseProps & {
  courseOptions: CourseOption[];
  packagesByCourse: Record<string, PackagesByService>;
  courseCode?: never;
  packagesByService?: never;
};

type CoursePricingPanelProps = FixedCourseProps | SelectableCourseProps;

export default function CoursePricingPanel(props: CoursePricingPanelProps) {
  const { embedded = false } = props;
  const isCourseSelectable = "courseOptions" in props && props.courseOptions != null;

  const [selectedCourseCode, setSelectedCourseCode] = useState(() =>
    isCourseSelectable ? getDefaultCourseCode(props.courseOptions) : "",
  );

  const courseCode = isCourseSelectable
    ? selectedCourseCode
    : props.courseCode;
  const packagesByService = isCourseSelectable
    ? props.packagesByCourse[selectedCourseCode]
    : props.packagesByService;

  const availableServices = useMemo(
    () =>
      packagesByService
        ? SERVICE_ORDER.filter((s) => hasPackages(packagesByService[s]))
        : [],
    [packagesByService],
  );

  const [activeService, setActiveService] = useState<ServiceType | null>(
    availableServices[0] ?? null,
  );

  useEffect(() => {
    setActiveService((prev) =>
      prev && availableServices.includes(prev)
        ? prev
        : (availableServices[0] ?? null),
    );
  }, [availableServices, courseCode]);

  if (availableServices.length === 0 || !activeService || !packagesByService) {
    return null;
  }

  const currentService = availableServices.includes(activeService)
    ? activeService
    : availableServices[0];

  const packages = (packagesByService[currentService]?.data ??
    []) as PackageData[];
  const isSelfStudy = currentService === "self-study";

  return (
    <div
      className={`${styles.panel} ${embedded ? styles.panelEmbedded : ""}`}
    >
      <h3 className={styles.panelTitle}>
        Invest in Your Success <br /> - Find a Plan that Fits You
      </h3>

      {isCourseSelectable && (
        <div className={styles.selectedCourseContext}>
          <label
            htmlFor="pricing-course-select"
            className={styles.courseSelectLabel}
          >
            Course:
          </label>
          <select
            id="pricing-course-select"
            className={styles.courseSelect}
            value={selectedCourseCode}
            onChange={(e) => setSelectedCourseCode(e.target.value)}
          >
            {props.courseOptions.map((course) => (
              <option key={course.courseCode} value={course.courseCode}>
                {course.courseName}
              </option>
            ))}
          </select>
          <p className={styles.selectedCourseHint}>
            Plans and pricing below update when you choose a different course.
          </p>
        </div>
      )}

      <div className={styles.tabBar} role="tablist">
        {availableServices.map((service) => (
          <button
            key={service}
            type="button"
            role="tab"
            aria-selected={service === currentService}
            className={`${styles.tabBtn} ${
              service === currentService ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveService(service)}
          >
            {SERVICE_TAB_LABELS[service]}
          </button>
        ))}
      </div>

      <div className={styles.cardsList}>
        {packages.map((pkg) => {
          const sessions = (pkg.sessions ?? []) as PackageSession[];
          const isLimitedTime = pkg.limited_time === "1";

          return sessions.map((session) => {
            const isSub = isSubscriptionSession(session);
            const checkoutHref = isLimitedTime
              ? `/checkout/limited-time-offer?${new URLSearchParams({
                  course_id: convertCourseCodeToId(courseCode),
                  package_id: String(pkg.package_id),
                  session_id: String(session.session_id),
                  amount: String(Math.round(Number(session.price) * 100)),
                  mode: isSub ? "subscription" : "one_time",
                  title: `Summer ${getFriendlyCourseName(courseCode)} ${FRIENDLY_PACKAGE_TYPE[currentService]}`,
                  tutoring_type: FRIENDLY_PACKAGE_TYPE[currentService],
                }).toString()}`
              : undefined;

            return (
              <div key={session.session_id} className="my-1">
                <CoursePricingCard
                  session={session}
                  packageId={pkg.package_id}
                  courseCode={courseCode}
                  limitedTime={isLimitedTime}
                  checkoutHref={checkoutHref}
                />
              </div>
            );
          });
        })}
      </div>

      <p className={styles.noteText}>
        {isSelfStudy ? (
          <>
            <span className={styles.noteLabel}>NOTE:</span> Your subscription
            renews automatically each billing cycle. Cancel anytime.
          </>
        ) : (
          <>
            <span className={styles.noteLabel}>NOTE:</span> 24 hrs advance notice
            required to cancel or reschedule a session.
          </>
        )}
      </p>

      <Link
        href={`/package-details/${currentService}/${courseCode}`}
        className={`text-decoration-none ${styles.detailsBtn}`}
      >
        {SERVICE_CTA_LABELS[currentService]}
      </Link>
    </div>
  );
}
