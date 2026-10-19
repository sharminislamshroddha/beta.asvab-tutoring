import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { StudyErrorCode } from "@/lib/study-types";
import styles from "./study.module.css";

export type Crumb = { label: string; href?: string };

export function StudyPageHeader({
  title,
  subtitle,
  crumbs = [],
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className={styles.crumbs}>
            {crumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`}>
                {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
                {i < crumbs.length - 1 && <span aria-hidden="true"> / </span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const NOTICE_CONTENT: Record<
  StudyErrorCode,
  { icon: string; title: string; action?: { label: string; href: string } }
> = {
  invalid_token: {
    icon: "bi-person-lock",
    title: "Please log in again",
    action: { label: "Log in", href: "/user-login" },
  },
  no_course: {
    icon: "bi-journal-x",
    title: "No course on your account yet",
    action: { label: "Browse courses", href: "/pricing/self-study" },
  },
  subscription_required: {
    icon: "bi-lock",
    title: "Part of the full course",
    action: { label: "Renew subscription", href: "/subscribe-again" },
  },
  final_locked: {
    icon: "bi-flag",
    title: "Final lesson not unlocked yet",
    action: { label: "Contact us", href: "/contact-us" },
  },
  prediction_locked: {
    icon: "bi-shield-lock",
    title: "Prediction tests are not enabled",
    action: { label: "Contact your instructor", href: "/contact-us" },
  },
  not_found: {
    icon: "bi-search",
    title: "We couldn't find that",
    action: { label: "Back to dashboard", href: "/study" },
  },
  unknown: {
    icon: "bi-exclamation-triangle",
    title: "Something went wrong",
  },
};

export function StudyNotice({
  code,
  message,
  children,
}: {
  code: StudyErrorCode;
  message: string;
  children?: ReactNode;
}) {
  const content = NOTICE_CONTENT[code] ?? NOTICE_CONTENT.unknown;
  return (
    <div className={styles.notice} role="status">
      <div className={styles.noticeIcon} aria-hidden="true">
        <i className={`bi ${content.icon}`} />
      </div>
      <div>
        <p className={styles.noticeTitle}>{content.title}</p>
        <p className={`${styles.muted} mb-3`}>{message}</p>
        <div className="d-flex flex-wrap gap-2">
          {content.action && (
            <Link href={content.action.href} className={styles.btnPrimary}>
              {content.action.label}
            </Link>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function scoreColor(score: number): string {
  if (score >= 70) return "#1f8a4c";
  if (score >= 50) return "#e58a34";
  return "#c0392b";
}

export function ScoreRing({
  value,
  label,
  unit = "%",
  max = 100,
}: {
  value: number;
  label: string;
  unit?: string;
  max?: number;
}) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const style = {
    "--value": percent,
    "--ring-color": unit === "%" ? scoreColor(value) : "#e58a34",
  } as CSSProperties;
  return (
    <div className={styles.scoreRing} style={style} role="img" aria-label={`${label}: ${value}${unit}`}>
      <div className={styles.scoreRingInner}>
        <div>
          <div className={styles.scoreValue}>
            {value}
            {unit === "%" ? <small style={{ fontSize: "1.1rem" }}>%</small> : null}
          </div>
          <div className={styles.scoreUnit}>{label}</div>
        </div>
      </div>
    </div>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

export function ScoreBar({ score }: { score: number }) {
  return (
    <div className={styles.scoreBar}>
      <div className={styles.scoreBarTrack} aria-hidden="true">
        <div
          className={styles.scoreBarFill}
          style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: scoreColor(score) }}
        />
      </div>
      <strong>{score}%</strong>
    </div>
  );
}
