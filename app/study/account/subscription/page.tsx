import Link from "next/link";
import AccountTabs from "@/components/study/account/AccountTabs";
import SubscriptionActions from "@/components/study/account/SubscriptionActions";
import { StudyNotice, StudyPageHeader } from "@/components/study/StudyUi";
import styles from "@/components/study/study.module.css";
import { fetchPricingPackages, type PricingPackageItem } from "@/lib/php-api";
import { getStudyAccount } from "@/lib/study-api";
import { formatStudyDate, type StudyAccount } from "@/lib/study-types";

export const metadata = { title: "Subscription" };

const DAY = 24 * 60 * 60 * 1000;

function toDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value) || value.startsWith("0000"))
    return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function money(amount: number, currency = "USD") {
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

/** The pricing list entry for the student's course (ASVAB when it can't be matched). */
function packageFor(
  list: PricingPackageItem[],
  sub: StudyAccount["subscription"],
) {
  const name = sub.course_name.trim().toLowerCase();
  return (
    list.find((p) => Number(p.course_id) === sub.course_id) ||
    list.find(
      (p) =>
        p.name.trim().toLowerCase() === name ||
        p.course_code.toLowerCase() === name,
    ) ||
    list.find((p) => p.course_code.toLowerCase() === "asvab") ||
    null
  );
}

/** "$15.00 - $45.00" -> "$15.00" */
function startingPrice(item: PricingPackageItem | null) {
  const match = item?.price_range?.match(/\$?\s*([\d,]+(?:\.\d+)?)/);
  return match ? money(Number(match[1].replace(/,/g, ""))) : "";
}

type Tone = "good" | "warn" | "bad" | "neutral";
type View = {
  status: string;
  tone: Tone;
  info?: string;
  /** "subscription" plans show their dates and auto-renewal */
  kind: "subscription" | "tutoring" | "free" | "app";
};

/** Status, message and buttons for each kind of student (see the spec in the task). */
function viewFor(sub: StudyAccount["subscription"]): View {
  if (sub.from_app) {
    return {
      kind: "app",
      status: sub.is_active ? "Active" : "Expired",
      tone: sub.is_active ? "good" : "bad",
    };
  }
  const square = sub.square;
  if (square) {
    const status = square.status.toUpperCase();
    const pending = /PENDING|REQUESTED/i.test(square.cancel_status || "");
    if (status === "ACTIVE" && sub.is_active) {
      return pending
        ? { kind: "subscription", status: "Cancel scheduled", tone: "warn" }
        : { kind: "subscription", status: "Active", tone: "good" };
    }
    if (status === "ACTIVE") {
      return {
        kind: "subscription",
        status: "Expired",
        tone: "bad",
        info: "Please pay for your subscription and continue studying.",
      };
    }
    if (status === "CANCELED" || status === "CANCELLED") {
      return { kind: "subscription", status: "Canceled", tone: "bad" };
    }
    return { kind: "subscription", status: "Expired", tone: "bad" };
  }
  if (sub.is_active) return { kind: "tutoring", status: "Free", tone: "good" };
  if (sub.has_tutoring_package)
    return { kind: "tutoring", status: "Expired", tone: "bad" };
  return {
    kind: "free",
    status:
      sub.has_subscription && sub.course_id
        ? "Not activated"
        : "Not subscribed",
    tone: "neutral",
  };
}

export default async function StudySubscriptionPage() {
  const [account, selfStudy, tutoring] = await Promise.all([
    getStudyAccount(),
    fetchPricingPackages("subscribe").catch(() => []),
    fetchPricingPackages("one").catch(() => []),
  ]);
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
  const view = viewFor(sub);
  const square = sub.square;
  const cancelPending =
    !!square && /PENDING|REQUESTED/i.test(square.cancel_status || "");
  const squareStatus = (square?.status || "").toUpperCase();

  const selfStudyPkg = packageFor(selfStudy, sub);
  const tutoringPkg = packageFor(tutoring, sub);
  const courseCode = (selfStudyPkg || tutoringPkg)?.course_code || "asvab";
  const selfStudyFrom = startingPrice(selfStudyPkg) || "$15.00";
  const tutoringFrom = startingPrice(tutoringPkg);
  const selfStudyDetails = `/package-details/self-study/${courseCode}`;
  const tutoringDetails = `/package-details/1-on-1-tutoring/${courseCode}`;

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
  const showTimeLeft =
    view.kind !== "free" && sub.is_active && expire && daysLeft !== null;

  const details: { label: string; value: string }[] = [];
  if (view.kind !== "free") {
    details.push({ label: "Course", value: sub.course_name || "—" });
    if (start)
      details.push({
        label: "Started",
        value: formatStudyDate(sub.start_date),
      });
    if (expire)
      details.push({
        label: sub.is_active ? "Access until" : "Ended on",
        value: formatStudyDate(sub.expire_date),
      });
    if (square?.next_billing_date && view.status === "Active") {
      details.push({
        label: "Next billing date",
        value: formatStudyDate(square.next_billing_date),
      });
    }
    if (cancelPending && square?.cancel_effective_date) {
      details.push({
        label: "Cancels on",
        value: formatStudyDate(square.cancel_effective_date),
      });
    }
    if (sub.payment_mode)
      details.push({ label: "Payment method", value: sub.payment_mode });
    const paid = money(sub.amount, sub.currency);
    if (paid) details.push({ label: "Amount paid", value: paid });
  }

  const toneClass = {
    good: styles.statusPassed,
    warn: styles.statusNeedsWork,
    bad: styles.statusFailed,
    neutral: styles.statusNew,
  }[view.tone];
  const toneIcon = {
    good: "bi-check-circle-fill",
    warn: "bi-hourglass-split",
    bad: "bi-x-circle-fill",
    neutral: "bi-dash-circle",
  }[view.tone];
  const userType =
    view.kind === "tutoring"
      ? "Tutoring"
      : view.kind === "free"
        ? "Free account"
        : "Subscription";

  /** Button + "Start from" + package details link */
  const offer = (
    button: { href: string; label: string; icon: string },
    from: string,
    detailsHref: string,
  ) => (
    <div className={styles.offer}>
      <Link href={button.href} className={styles.btnPrimary}>
        <i className={`bi ${button.icon}`} aria-hidden="true" /> {button.label}
      </Link>
      <div className={styles.offerText}>
        {from && (
          <span>
            Start from <strong>{from}</strong>
          </span>
        )}
        <Link href={detailsHref} className={styles.offerLink}>
          See the package details{" "}
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {header}

      <section
        className={`${styles.card} ${styles.accountCard}`}
        aria-labelledby="plan-title"
      >
        <div className={styles.planHead}>
          <span className={styles.planIcon} aria-hidden="true">
            <i
              className={`bi ${view.kind === "tutoring" ? "bi-person-video3" : "bi-mortarboard"}`}
            />
          </span>
          <div className={styles.planHeadText}>
            <span className={styles.planType}>{userType}</span>
            <h2 id="plan-title" className={styles.planTitle}>
              {view.kind === "free"
                ? "No active plan"
                : sub.course_name || "Your course"}
            </h2>
          </div>
          <span
            className={`${styles.statusPill} ${styles.planStatus} ${toneClass}`}
          >
            <i className={`bi ${toneIcon}`} aria-hidden="true" /> {view.status}
          </span>
        </div>

        {showTimeLeft && (
          <div className={styles.planTime}>
            <div className={styles.planTimeLabel}>
              <strong>
                {daysLeft! <= 0
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

        {details.length > 0 && (
          <dl className={styles.planDetails}>
            {details.map((d) => (
              <div key={d.label}>
                <dt>{d.label}</dt>
                <dd>{d.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {view.info && (
          <div
            className={`${styles.inlineAlert} ${styles.inlineAlertWarn} ${styles.planInfo}`}
          >
            <i className="bi bi-info-circle" aria-hidden="true" />
            <span>{view.info}</span>
          </div>
        )}

        {/* ---- Actions per status ---- */}
        {view.kind === "subscription" && view.status === "Active" && (
          <div className={styles.renewalActions}>
            <SubscriptionActions
              mode="cancel"
              accessUntil={
                square?.next_billing_date
                  ? formatStudyDate(square.next_billing_date)
                  : expire
                    ? formatStudyDate(sub.expire_date)
                    : ""
              }
            />
          </div>
        )}
        {view.kind === "subscription" && view.status === "Cancel scheduled" && (
          <div className={styles.renewalActions}>
            <SubscriptionActions mode="resume" accessUntil="" />
          </div>
        )}
        {view.kind === "subscription" &&
          view.status === "Expired" &&
          squareStatus !== "ACTIVE" && (
            <div className={styles.renewalActions}>
              {offer(
                {
                  href: "/subscribe-again",
                  label: "Subscribe again",
                  icon: "bi-arrow-repeat",
                },
                selfStudyFrom,
                selfStudyDetails,
              )}
            </div>
          )}
        {view.kind === "subscription" && view.status === "Canceled" && (
          <div className={styles.renewalActions}>
            {offer(
              {
                href: "/subscribe-again",
                label: "Subscribe again",
                icon: "bi-arrow-repeat",
              },
              "",
              selfStudyDetails,
            )}
          </div>
        )}
        {view.kind === "tutoring" && (
          <div className={styles.renewalActions}>
            {offer(
              {
                href: "/buy-more-sessions",
                label: "Buy more sessions",
                icon: "bi-cart-plus",
              },
              tutoringFrom,
              tutoringDetails,
            )}
          </div>
        )}
        {view.kind === "app" && (
          <div
            className={`${styles.inlineAlert} ${styles.inlineAlertInfo} ${styles.planInfo}`}
          >
            <i className="bi bi-phone" aria-hidden="true" />
            <span>
              You subscribed in our mobile app. Manage billing in the App Store
              or Google Play.
            </span>
          </div>
        )}
      </section>

      {view.kind === "free" && (
        <>
          <p className={styles.freeNotice}>
            If you already paid for a tutor, please wait for your account
            activation. If you need help, please{" "}
            <Link href="/contact-us">contact us</Link>.
          </p>
          <div className={styles.freeOptions}>
            <section
              className={`${styles.card} ${styles.freeOption}`}
              aria-labelledby="free-self-study"
            >
              <span className={styles.freeOptionIcon} aria-hidden="true">
                <i className="bi bi-laptop" />
              </span>
              <h3 id="free-self-study" className={styles.freeOptionTitle}>
                Self-study subscription
              </h3>
              <p className={styles.muted}>
                Lessons, homework, practice tests and prediction tests, at your
                own pace.
              </p>
              {offer(
                {
                  href: "/pricing/self-study",
                  label: "Subscribe now",
                  icon: "bi-bag-check",
                },
                selfStudyFrom,
                selfStudyDetails,
              )}
            </section>
            <section
              className={`${styles.card} ${styles.freeOption}`}
              aria-labelledby="free-tutoring"
            >
              <span className={styles.freeOptionIcon} aria-hidden="true">
                <i className="bi bi-person-video3" />
              </span>
              <h3 id="free-tutoring" className={styles.freeOptionTitle}>
                1-on-1 tutoring
              </h3>
              <p className={styles.muted}>
                Live sessions with an expert tutor, plus full access to the
                study area.
              </p>
              {offer(
                {
                  href: "/pricing/1-on-1-tutoring",
                  label: "Buy a tutor package",
                  icon: "bi-person-plus",
                },
                tutoringFrom,
                tutoringDetails,
              )}
            </section>
          </div>
        </>
      )}

      <div className={styles.accountActions}>
        <Link href="/contact-us" className={styles.btnGhost}>
          <i className="bi bi-question-circle" aria-hidden="true" /> Questions
          about billing? Contact us
        </Link>
      </div>
    </>
  );
}
