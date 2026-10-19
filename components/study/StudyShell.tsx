"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { StudyDashboard } from "@/lib/study-types";
import { typesetMathJax } from "@/utils/mathjax";
import styles from "./study.module.css";

type NavItem = { href: string; label: string; icon: string; match: (path: string) => boolean };

function categoryHref(cat: StudyDashboard["categories"][number]) {
  return cat.is_flashcard ? `/study/flashcards/${cat.cat_id}` : `/study/category/${cat.cat_id}`;
}

export default function StudyShell({
  dashboard,
  children,
}: {
  dashboard: StudyDashboard | null;
  children: ReactNode;
}) {
  const pathname = usePathname() || "/study";

  const items: NavItem[] = [
    { href: "/study", label: "Dashboard", icon: "bi-grid-1x2", match: (p) => p === "/study" },
  ];
  const categoryItems: NavItem[] = (dashboard?.categories ?? []).map((cat) => {
    const href = categoryHref(cat);
    return {
      href,
      label: cat.name,
      icon: cat.is_flashcard ? "bi-stack" : "bi-journal-text",
      match: (p) =>
        p.startsWith(href) ||
        p.startsWith(`/study/lesson/${cat.cat_id}/`) ||
        p.startsWith(`/study/practice/${cat.cat_id}/`),
    };
  });
  const toolItems: NavItem[] = [];
  if ((dashboard?.prediction_tests.length ?? 0) > 0) {
    toolItems.push({
      href: "/study/prediction",
      label: "Prediction Tests",
      icon: "bi-bullseye",
      match: (p) => p.startsWith("/study/prediction"),
    });
  }
  toolItems.push({
    href: "/study/progress",
    label: "Progress Report",
    icon: "bi-graph-up-arrow",
    match: (p) => p.startsWith("/study/progress"),
  });

  const renderItem = (item: NavItem) => {
    const active = item.match(pathname);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
          aria-current={active ? "page" : undefined}
        >
          <i className={`bi ${item.icon}`} aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      </li>
    );
  };

  const user = dashboard?.user;

  return (
    <div className={styles.shell}>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/latest.js?config=TeX-MML-AM_CHTML"
        strategy="afterInteractive"
        onLoad={() => void typesetMathJax()}
      />
      <div className="container">
        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label="Study navigation">
            {dashboard?.course && (
              <div className={styles.sidebarCourse}>
                <div className={styles.courseIcon} aria-hidden="true">
                  <i className="bi bi-mortarboard" />
                </div>
                <div className={styles.sidebarCourseText}>
                  <p className={styles.sidebarCourseName}>{dashboard.course.name}</p>
                  {user && (
                    <p
                      className={styles.sidebarUser}
                      title={`${user.first_name} ${user.last_name}`.trim() || user.email}
                    >
                      {`${user.first_name} ${user.last_name}`.trim() || user.email}
                    </p>
                  )}
                  {user && (
                    <span className={`${styles.planBadge} ${user.is_paid ? styles.planActive : styles.planExpired}`}>
                      <i className={`bi ${user.is_paid ? "bi-patch-check" : "bi-exclamation-circle"}`} aria-hidden="true" />
                      {user.is_paid ? "Full access" : "Limited access"}
                    </span>
                  )}
                </div>
              </div>
            )}
            <ul className={styles.navList}>
              {items.map(renderItem)}
              {categoryItems.length > 0 && (
                <li className={styles.navGroupLabel} aria-hidden="true">
                  Course content
                </li>
              )}
              {categoryItems.map(renderItem)}
              <li className={styles.navGroupLabel} aria-hidden="true">
                Tests &amp; results
              </li>
              {toolItems.map(renderItem)}
            </ul>
          </aside>
          <main className={styles.main} id="study-main">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
