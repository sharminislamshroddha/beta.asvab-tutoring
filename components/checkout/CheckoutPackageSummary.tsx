import { extractPackageIncludesHtml } from "@/lib/checkout-package-info";
import type { ServiceType } from "@/types/Services";
import styles from "./CheckoutPackageSummary.module.css";

type CheckoutPackageSummaryProps = {
  descriptionHtml: string;
  serviceType: ServiceType;
};

export default function CheckoutPackageSummary({
  descriptionHtml,
  serviceType,
}: CheckoutPackageSummaryProps) {
  const includesHtml = extractPackageIncludesHtml(descriptionHtml);
  const isSubscribe = serviceType === "self-study";

  return (
    <section className={styles.wrap} aria-label="Package details">
      {includesHtml ? (
        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: includesHtml }}
        />
      ) : null}

      <div className={styles.notes}>
        {isSubscribe ? (
          <p>
            <span className={styles.noteLabel}>NOTE:</span> Your subscription
            will automatically renew at the end of each billing cycle (as
            disclosed at the time of purchase). You may cancel your subscription
            at any time. Upon cancellation, you will retain access to the
            service until the end of your current billing period.
          </p>
        ) : (
          <>
            <p>
              <span className={styles.noteLabel}>NOTE:</span> No session will be
              scheduled without payment information on file. Students are
              required to submit homework before each session.
            </p>
            <p>
              <span className={styles.policyLabel}>Cancellation Policy:</span>{" "}
              If you want to cancel a session or reschedule, 24 hrs. advance
              notice is required. You can cancel the entire service within 7
              days.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
