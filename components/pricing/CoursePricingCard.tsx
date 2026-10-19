"use client";

import Link from "next/link";
import styles from "./coursePricing.module.css";
import { isSubscriptionSession } from "./PricingCard";
import { decodeHtmlEntitiesDeep } from "@/lib/decode-html";
import { convertCourseCodeToId } from "@/lib/package-utils";
import { splitFeatureLines } from "@/lib/package-text";
import type { PackageSession } from "@/lib/package-types";

type CoursePricingCardProps = {
  session: PackageSession;
  packageId: string | number;
  courseCode: string;
  limitedTime?: boolean;
  checkoutHref?: string;
};

export default function CoursePricingCard({
  session,
  packageId,
  courseCode,
  limitedTime = false,
  checkoutHref,
}: CoursePricingCardProps) {
  const isSub = isSubscriptionSession(session);
  const buttonLabel = isSub ? "Subscribe" : "Enroll Now";
  const isPopular = session.is_most_popular === "1";
  const features = splitFeatureLines(session.feature ?? "");

  const query = new URLSearchParams({
    course_id: convertCourseCodeToId(courseCode),
    package_id: String(packageId),
    session_id: String(session.session_id),
    amount: String(Math.round(Number(session.price) * 100)),
    mode: isSub ? "subscription" : "one_time",
    product: String(session.product ?? ""),
    cadence: String(session.cadence ?? ""),
  }).toString();

  const href = checkoutHref ?? `/checkout?${query}`;

  return (
    <div
      className={`${styles.planCard} ${limitedTime ? styles.planCardLimited : ""} ${
        isPopular ? styles.planCardPopular : ""
      }`}
    >
      {limitedTime && (
        <span className={styles.planTagLimited}>Limited time offer</span>
      )}
      {isPopular && <span className={styles.planTag}>Most Popular</span>}

      <div className={styles.planHead}>
        <h4 className={styles.planName}>
          {decodeHtmlEntitiesDeep(session.title ?? "")}
        </h4>
        <div className={styles.planPrice}>
          <span className={styles.planCurrency}>$</span>
          {decodeHtmlEntitiesDeep(String(session.price ?? ""))}
        </div>
      </div>

      {features.length > 0 && (
        <ul className={styles.planFeatures}>
          {features.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ul>
      )}

      <Link
        href={href}
        className={`text-decoration-none ${styles.planBtn} ${
          limitedTime ? styles.planBtnLimited : ""
        }`}
      >
        {buttonLabel}
      </Link>
    </div>
  );
}
