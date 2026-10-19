"use client";

import Link from "next/link";
import styles from "./HotDealBanner.module.css";

interface HotDealBannerProps {
  /** If true the banner renders in its full hero style (group-tutoring pages).
   *  If false a compact strip is rendered instead. */
  featured?: boolean;
  courseName: string;
  packageType: string;
  amount: string;
  link: string;
}

export default function HotDealBanner({
  featured = false,
  courseName,
  packageType,
  amount,
  link,
}: HotDealBannerProps) {
  if (featured) {
    return (
      <div className={styles.heroWrap}>
        {/* Animated badge */}
        <span className={styles.badge}>🔥 Limited-Time Offer</span>

        <div className={styles.heroCard}>
          {/* Left: copy */}
          <div className={styles.copyCol}>
            <p className={styles.eyebrow}>
              Summer {courseName} {packageType} Course
              <span className={styles.date}>(June 20 – July 20)</span>
            </p>
            <h2 className={styles.headline}>
              Master your {courseName} Math &amp; English —{" "}
              <span className={styles.accent}>Together</span>
            </h2>

            <ul className={styles.featureList}>
              <li>
                <span className={styles.icon}>📅</span>
                <span>
                  <strong>4-Week Program</strong> – 3 Live Sessions per Week
                  <br />
                  <small>(Monday, Wednesday, Friday | 4:00–5:30 PM EST)</small>
                </span>
              </li>
              <li>
                <span className={styles.icon}>🎥</span>
                <span>
                  <strong>Missed a class?</strong> – Every session will be
                  recorded for you.
                </span>
              </li>
              <li>
                <span className={styles.icon}>👥</span>
                <span>
                  <strong>Small-group setting</strong> – Collaborative learning
                  with an expert ASVAB tutor
                </span>
              </li>
              <li>
                <span className={styles.icon}>📚</span>
                <span>
                  <strong>Focused on</strong> – AFQT (Math and English)
                </span>
              </li>
              <li>
                <span className={styles.icon}>🌐</span>
                <span>
                  <strong>Full web platform access</strong> – Lesson videos,
                  homework, practice tests, AFQT prediction tests, progress
                  tracker, and more
                </span>
              </li>
            </ul>

            <div className={styles.ctaRow}>
              <div className={styles.priceBlock}>
                <span className={styles.priceLabel}>
                  Full Package —
                  <br />
                  <br /> <span style={{ color: "white" }}>for just</span>
                </span>
                <span className={styles.price}>${amount}</span>
              </div>
              <Link href={link} className={styles.ctaBtn}>
                Sign up for The Deal!
              </Link>
            </div>
          </div>

          {/* Right: decorative */}
          <div className={styles.decorCol} aria-hidden="true">
            <div className={styles.circle1} />
            <div className={styles.circle2} />
            <div className={styles.decorText}>
              <p className={styles.decorPrice}>${amount}</p>
              <p className={styles.decorSub}>Full 4-Week Package</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Compact strip (other service pages) ──────────────────────────────── */
  return (
    <div className={styles.stripWrap}>
      <span className={styles.stripBadge}>🔥 Hot Deal</span>
      <p className={styles.stripText}>
        <strong>
          Summer {packageType} ({courseName}) — ${amount}
        </strong>{" "}
        for 4 weeks of live &amp; recorded sessions focusing on AFQT (Math and
        English).
      </p>
      <Link href={link} className={styles.stripBtn}>
        See Deal
      </Link>
    </div>
  );
}
