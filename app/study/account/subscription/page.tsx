import Link from "next/link";
import AccountTabs from "@/components/study/account/AccountTabs";
import SubscriptionActions from "@/components/study/account/SubscriptionActions";
import { StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import { getStudyAccount } from "@/lib/study-api";
import { formatStudyDate } from "@/lib/study-types";

export const metadata = { title: "Subscription" };

const DAY = 24 * 60 * 60 * 1000;

function toDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value) || value.startsWith("0000"))
    return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function money(amount: number, currency: string) {
  if (!amount) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export default async function StudySubscriptionPage() {
  const account = await getStudyAccount();
  const crumbs = [
    { label: "Dashboard", href: "/study" },
    { label: "My account" },
  ];
  const header = (
    <>
      <StudyPageHeader
        title="My account"
        subtitle="Keep your details up to date."
        crumbs={crumbs}
      />
      <AccountTabs active="subscription" />
    </>
  );

  if (!account.ok) {
    return (
      <>
        {header}
        <StudyNotice code={account.code} message={account.message} />
      </>
    );
  }

  const sub = account.data.subscription;
  const start = toDate(sub.start_date);
  const expire = toDate(sub.expire_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = expire
    ? Math.round((expire.getTime() - today.getTime()) / DAY)
    : null;
  const totalDays =
    start && expire
      ? Math.max(1, Math.round((expire.getTime() - start.getTime()) / DAY))
      : null;
  const usedPercent =
    totalDays && daysLeft !== null
      ? Math.min(
          100,
          Math.max(0, Math.round(((totalDays - daysLeft) / totalDays) * 100)),
        )
      : null;

  const square = sub.square;
  const squareStatus = (square?.status || "").toUpperCase();
  const cancelPending =
    !!square && /PENDING|REQUESTED/i.test(square.cancel_status || "");
  const squareEnded = ["CANCELED", "CANCELLED", "ENDED", "EXPIRED"].includes(
    squareStatus,
  );

  const details: { label: string; value: string }[] = [
    { label: "Course", value: sub.course_name || "—" },
    { label: "Started", value: start ? formatStudyDate(sub.start_date) : "—" },
    {
      label: sub.is_active ? "Access until" : "Expired on",
      value: expire ? formatStudyDate(sub.expire_date) : "—",
    },
  ];
  if (sub.payment_mode)
    details.push({ label: "Payment method", value: sub.payment_mode });
  const paid = money(sub.amount, sub.currency);
  if (paid) details.push({ label: "Amount paid", value: paid });

  return (
    <>
      {header}

      <section
        className={`${styles.card} ${styles.accountCard}`}
        aria-labelledby="plan-title"
      >
        <div className={styles.planHead}>
          <span className={styles.planIcon} aria-hidden="true">
            <i className="bi bi-mortarboard" />
          </span>
          <div className={styles.planHeadText}>
            <h2 id="plan-title" className={styles.planTitle}>
              {sub.course_name || "Your course"}
            </h2>
            <span
              className={`${styles.statusPill} ${sub.is_active ? styles.statusPassed : styles.statusNeedsWork}`}
            >
              <i
                className={`bi ${sub.is_active ? "bi-check-circle-fill" : "bi-exclamation-circle"}`}
                aria-hidden="true"
              />{" "}
              {sub.is_active ? "Active" : "Expired"}
            </span>
          </div>
        </div>

        {expire && sub.is_active && daysLeft !== null && (
          <div className={styles.planTime}>
            <div className={styles.planTimeLabel}>
              <strong>
                {daysLeft <= 0
                  ? "Ends today"
                  : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}
              </strong>
              <span>Access until {formatStudyDate(sub.expire_date)}</span>
            </div>
            {usedPercent !== null && (
              <span className={styles.planMeter} aria-hidden="true">
                <span style={{ width: `${usedPercent}%` }} />
              </span>
            )}
          </div>
        )}

        <dl className={styles.planDetails}>
          {details.map((d) => (
            <div key={d.label}>
              <dt>{d.label}</dt>
              <dd>{d.value}</dd>
            </div>
          ))}
        </dl>

        {!sub.is_active && (
          <div
            className={`${styles.inlineAlert} ${styles.inlineAlertWarn} mb-0`}
          >
            <i className="bi bi-info-circle" aria-hidden="true" />
            <span>
              Your access has ended. Renew to unlock every lesson, flashcards
              and unlimited prediction tests.
            </span>
          </div>
        )}
      </section>

      {square && (
        <section
          className={`${styles.card} ${styles.accountCard}`}
          aria-labelledby="renewal-title"
        >
          <h2 id="renewal-title" className={styles.formSectionTitle}>
            Auto-renewal
          </h2>
          {cancelPending ? (
            <p className={styles.renewalText}>
              <i className="bi bi-hourglass-split" aria-hidden="true" /> Your
              plan is set to cancel
              {square.cancel_effective_date
                ? ` on ${formatStudyDate(square.cancel_effective_date)}`
                : ""}
              . You keep access until then.
            </p>
          ) : squareEnded ? (
            <p className={styles.renewalText}>
              <i className="bi bi-pause-circle" aria-hidden="true" />{" "}
              Auto-renewal is off.
            </p>
          ) : (
            <p className={styles.renewalText}>
              <i className="bi bi-arrow-repeat" aria-hidden="true" /> Your plan
              renews
              {square.next_billing_date
                ? ` on ${formatStudyDate(square.next_billing_date)}`
                : " automatically"}
              {money(square.amount, square.currency)
                ? ` for ${money(square.amount, square.currency)}`
                : ""}
              .
            </p>
          )}
          {!squareEnded && (
            <div className={styles.renewalActions}>
              <SubscriptionActions
                mode={cancelPending ? "resume" : "cancel"}
                accessUntil={
                  square.next_billing_date
                    ? formatStudyDate(square.next_billing_date)
                    : expire
                      ? formatStudyDate(sub.expire_date)
                      : ""
                }
              />
            </div>
          )}
        </section>
      )}

      {sub.from_app && (
        <div className={`${styles.inlineAlert} ${styles.inlineAlertInfo}`}>
          <i className="bi bi-phone" aria-hidden="true" />
          <span>
            You subscribed in our mobile app. Manage billing in the App Store or
            Google Play.
          </span>
        </div>
      )}

      <div className={styles.accountActions}>
        {!sub.is_active && (
          <Link href="/subscribe-again" className={styles.btnPrimary}>
            <i className="bi bi-arrow-repeat" aria-hidden="true" /> Renew
            subscription
          </Link>
        )}
        <Link href="/contact-us" className={styles.btnGhost}>
          <i className="bi bi-question-circle" aria-hidden="true" /> Questions
          about billing? Contact us
        </Link>
      </div>
    </>
  );
}
