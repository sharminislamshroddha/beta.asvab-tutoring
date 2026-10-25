"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "@/components/study/study.module.css";

/** Shown instead of a blank "Application error" when a study page crashes. */
export default function StudyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.notice} role="alert">
      <div className={styles.noticeIcon} aria-hidden="true">
        <i className="bi bi-exclamation-triangle" />
      </div>
      <div>
        <p className={styles.noticeTitle}>This page couldn&apos;t be loaded</p>
        <p className={`${styles.muted} mb-2`}>Something went wrong while showing this page. Please try again.</p>
        <p className="small mb-3" style={{ color: "#8a97a6", wordBreak: "break-word" }}>
          Error details: {error.message || "Unknown error"}
          {error.digest ? ` (ref ${error.digest})` : ""}
        </p>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className={styles.btnPrimary} onClick={reset}>
            Try again
          </button>
          <Link href="/study" className={styles.btnGhost}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
