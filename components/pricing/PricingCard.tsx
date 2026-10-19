"use client";

import Button from "@/components/button/Button";
import { decodeHtmlEntitiesDeep } from "@/lib/decode-html";
import { convertCourseCodeToId } from "@/lib/package-utils";
import { cleanFeatureText } from "@/lib/package-text";
import type { PackageSession } from "@/lib/package-types";

type PricingStyles = Record<string, string>;

function renderTextWithLineBreaks(text: string) {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, idx) => (
      <p key={idx} style={{ marginBottom: "0.6em", whiteSpace: "pre-wrap" }}>
        {line}
      </p>
    ));
}

export function isSubscriptionSession(session: { mode?: string }): boolean {
  return String(session?.mode ?? "").toLowerCase() === "subscription";
}

type PricingCardProps = {
  session: PackageSession;
  packageId: string | number;
  courseCode: string;
  styles: PricingStyles;
};

export default function PricingCard({
  session,
  packageId,
  courseCode,
  styles,
}: PricingCardProps) {
  const isSub = isSubscriptionSession(session);
  const buttonLabel = isSub ? "Subscribe" : "Enroll Now";
  const query = {
    course_id: convertCourseCodeToId(courseCode),
    package_id: String(packageId),
    session_id: String(session.session_id),
    amount: String(Math.round(Number(session.price) * 100)),
    mode: isSub ? "subscription" : "one_time",
    product: String(session.product ?? ""),
    cadence: String(session.cadence ?? ""),
  };

  return (
    <div
      className={`${styles.pricingCard} ${
        session.is_most_popular === "1" ? styles.mostPopularWrap : ""
      }`}
    >
      {session.is_most_popular === "1" && (
        <div className={styles.mostPopularBadge}>Most Popular</div>
      )}

      <div className={styles.cardInner}>
        <div className={styles.cardTitleWrap}>
          <h4 className={styles.cardTitle}>
            {decodeHtmlEntitiesDeep(session.title ?? "")}
          </h4>
        </div>
        <div className={styles.priceWrap}>
          <div className={styles.price}>
            ${decodeHtmlEntitiesDeep(String(session.price ?? ""))}
          </div>
        </div>
        <div className={styles.featureWrap}>
          <div className={styles.featureBox}>
            {renderTextWithLineBreaks(cleanFeatureText(session.feature ?? ""))}
          </div>
        </div>
        <div className={styles.cardFooter}>
          <Button
            pathname={"/checkout"}
            queryObj={query}
            className={`btn btn-primary-custom ${styles.cardBtn}`}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
