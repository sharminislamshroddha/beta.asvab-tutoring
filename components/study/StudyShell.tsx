"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StudyCategory, StudyDashboard } from "@/lib/study-types";
import { typesetMathJax } from "@/utils/mathjax";
import styles from "./study.module.css";

type NavItem = { href: string; label: string; icon: string; match: (path: string) => boolean };

function categoryHref(cat: StudyCategory) {
  return cat.is_flashcard ? `/study/flashcards/${cat.cat_id}` : `/study/category/${cat.cat_id}`;
}

function isCategoryPath(cat: StudyCategory, path: string) {
  return (
    path.startsWith(categoryHref(cat)) ||
    path.startsWith(`/study/lesson/${cat.cat_id}/`) ||
    path.startsWith(`/study/practice/${cat.cat_id}/`)
  );
}

/** Lesson id in /study/lesson/:cat/:lesson or /study/practice/:cat/:lesson... */
function activeLessonId(path: string): number | null {
  const match = path.match(/^\/study\/(?:lesson|practice)\/\d+\/(\d+)/);
  return match ? Number(match[1]) : null;
}

export default function StudyShell({
  dashboard,
  children,
}: {
  dashboard: StudyDashboard | null;
  children: ReactNode;
}) {
  const pathname = usePathname() || "/study";
  const categories = dashboard?.categories ?? [];
  const activeCategory = categories.find((cat) => isCategoryPath(cat, pathname));
  const currentLessonId = activeLessonId(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(activeCategory ? [activeCategory.cat_id] : []),
  );

  // Follow navigation: open the current topic, close the phone menu
  useEffect(() => {
    setMenuOpen(false);
    if (activeCategory) {
      setExpanded((prev) => (prev.has(activeCategory.cat_id) ? prev : new Set(prev).add(activeCategory.cat_id)));
    }
  }, [pathname, activeCategory]);

  // Keep the current page in view inside the scrolling menu (after a topic finishes opening)
  useEffect(() => {
    const id = window.setTimeout(() => {
      const nav = navRef.current;
      const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!nav || !current) return;
      const navBox = nav.getBoundingClientRect();
      const itemBox = current.getBoundingClientRect();
      if (itemBox.top < navBox.top || itemBox.bottom > navBox.bottom) {
        nav.scrollTop += itemBox.top - navBox.top - navBox.height / 3;
      }
    }, 260);
    return () => window.clearTimeout(id);
  }, [pathname]);

  const toggleCategory = (catId: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
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

  const renderLink = (item: NavItem) => {
    const active = item.match(pathname);
    return (
      <Link
        href={item.href}
        className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
        aria-current={active ? "page" : undefined}
      >
        <i className={`bi ${item.icon}`} aria-hidden="true" />
        <span>{item.label}</span>
      </Link>
    );
  };

  const renderCategory = (cat: StudyCategory) => {
    const href = categoryHref(cat);
    const lessons = cat.lessons ?? [];

    if (cat.is_flashcard || lessons.length === 0) {
      return (
        <li key={cat.cat_id}>
          {renderLink({
            href,
            label: cat.name,
            icon: cat.is_flashcard ? "bi-stack" : "bi-journal-text",
            match: (p) => isCategoryPath(cat, p),
          })}
        </li>
      );
    }

    const isOpen = expanded.has(cat.cat_id);
    const isCurrent = isCategoryPath(cat, pathname);
    const panelId = `study-nav-topic-${cat.cat_id}`;
    const overviewActive = pathname.startsWith(href);

    return (
      <li
        key={cat.cat_id}
        className={`${styles.topic} ${isOpen ? styles.topicOpen : ""} ${isCurrent ? styles.topicCurrent : ""}`}
      >
        <button
          type="button"
          className={styles.topicHeader}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => toggleCategory(cat.cat_id)}
        >
          <span className={styles.topicBadge} aria-hidden="true">
            {(cat.shortcode || cat.name).slice(0, 3).toUpperCase()}
          </span>
          <span className={styles.topicText}>
            <span className={styles.topicName}>{cat.name}</span>
            <span className={styles.topicMeta}>
              {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
            </span>
          </span>
          <i className={`bi bi-chevron-down ${styles.topicChevron}`} aria-hidden="true" />
        </button>

        <div id={panelId} className={styles.topicPanel} inert={!isOpen}>
          <div className={styles.topicPanelInner}>
            <ul className={styles.lessonNav} aria-label={`${cat.name} lessons`}>
              <li>
                <Link
                  href={href}
                  className={`${styles.lessonNavLink} ${styles.topicOverview} ${overviewActive ? styles.lessonNavActive : ""}`}
                  aria-current={overviewActive ? "page" : undefined}
                >
                  <span className={styles.lessonNavIndex} aria-hidden="true">
                    <i className="bi bi-grid" />
                  </span>
                  <span className={styles.lessonNavText}>
                    <span className={styles.lessonNavName}>Topic overview</span>
                  </span>
                </Link>
              </li>
              {lessons.map((lesson, i) => {
                const active = !lesson.locked && isCurrent && currentLessonId === lesson.lesson_id;
                return (
                  <li key={lesson.lesson_id}>
                    <Link
                      href={lesson.locked ? "/subscribe-again" : `/study/lesson/${cat.cat_id}/${lesson.lesson_id}`}
                      className={`${styles.lessonNavLink} ${active ? styles.lessonNavActive : ""} ${
                        lesson.locked ? styles.lessonNavLocked : ""
                      }`}
                      aria-current={active ? "page" : undefined}
                      title={lesson.description ? `${lesson.name}: ${lesson.description}` : lesson.name}
                    >
                      <span className={styles.lessonNavIndex} aria-hidden="true">
                        {lesson.locked ? <i className="bi bi-lock-fill" /> : i + 1}
                      </span>
                      <span className={styles.lessonNavText}>
                        <span className={styles.lessonNavName}>
                          {lesson.name}
                          {lesson.locked && <span className={styles.srOnly}> (locked)</span>}
                        </span>
                        {lesson.description && <span className={styles.lessonNavDesc}>{lesson.description}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
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

            <button
              type="button"
              className={styles.menuToggle}
              aria-expanded={menuOpen}
              aria-controls="study-nav-panel"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span>
                <i className="bi bi-list me-2" aria-hidden="true" />
                Course menu
              </span>
              <i className={`bi ${menuOpen ? "bi-chevron-up" : "bi-chevron-down"}`} aria-hidden="true" />
            </button>

            <nav ref={navRef} id="study-nav-panel" className={`${styles.navPanel} ${menuOpen ? styles.navPanelOpen : ""}`}>
              <ul className={styles.navList}>
                <li>{renderLink({ href: "/study", label: "Dashboard", icon: "bi-grid-1x2", match: (p) => p === "/study" })}</li>
                {categories.length > 0 && (
                  <li className={styles.navGroupLabel} aria-hidden="true">
                    Course content
                  </li>
                )}
                {categories.map(renderCategory)}
                <li className={styles.navGroupLabel} aria-hidden="true">
                  Tests &amp; results
                </li>
                {toolItems.map((item) => (
                  <li key={item.href}>{renderLink(item)}</li>
                ))}
              </ul>
            </nav>
          </aside>
          <main className={styles.main} id="study-main">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
