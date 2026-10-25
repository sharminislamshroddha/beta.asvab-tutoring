"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StudyCategory, StudyDashboard } from "@/lib/study-types";
import { typesetMathJax } from "@/utils/mathjax";
import styles from "./study.module.css";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  match: (path: string) => boolean;
};

function categoryHref(cat: StudyCategory) {
  return cat.is_flashcard
    ? `/study/flashcards/${cat.cat_id}`
    : `/study/category/${cat.cat_id}`;
}

function isCategoryPath(cat: StudyCategory, path: string) {
  return (
    path.startsWith(categoryHref(cat)) ||
    path.startsWith(`/study/lesson/${cat.cat_id}/`) ||
    path.startsWith(`/study/practice/${cat.cat_id}/`)
  );
}

/** Accordion key of the "Prediction Tests" group (category keys are cat_ids) */
const PREDICTION_GROUP = -1;

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
  const activeCategory = categories.find((cat) =>
    isCategoryPath(cat, pathname),
  );
  const currentLessonId = activeLessonId(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const activeGroup = activeCategory
    ? activeCategory.cat_id
    : pathname.startsWith("/study/prediction")
      ? PREDICTION_GROUP
      : null;
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(activeGroup !== null ? [activeGroup] : []),
  );

  // Follow navigation: open the current topic, close the phone menu
  useEffect(() => {
    setMenuOpen(false);
    if (activeGroup !== null) {
      setExpanded((prev) =>
        prev.has(activeGroup) ? prev : new Set(prev).add(activeGroup),
      );
    }
  }, [pathname, activeGroup]);

  // Phones / tablets: the menu is a bottom sheet. Escape closes it and the
  // page behind it does not scroll while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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

  // Desktop: the sidebar never runs past the bottom of the screen, also before it
  // sticks (when the site header is still above it); the menu scrolls inside
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const gap = 16;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Never above its sticky position (just below the fixed site header)
      const stickyTop = parseFloat(window.getComputedStyle(sidebar).top) || gap;
      const top = Math.max(sidebar.getBoundingClientRect().top, stickyTop);
      sidebar.style.setProperty(
        "--study-sidebar-max",
        `${Math.max(240, window.innerHeight - top - gap)}px`,
      );
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const toggleCategory = (catId: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });

  const predictionTests = dashboard?.prediction_tests ?? [];
  const toolItems: NavItem[] = [];
  // Several prediction tests get their own dropdown (renderPredictionGroup)
  if (predictionTests.length === 1) {
    toolItems.push({
      href: "/study/prediction",
      // The test's own name, as the admin set it
      label: predictionTests[0].name || "Prediction Test",
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
          <i
            className={`bi bi-chevron-down ${styles.topicChevron}`}
            aria-hidden="true"
          />
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
                    <i className="bi bi-list-ul" />
                  </span>
                  <span className={styles.lessonNavText}>
                    <span className={styles.lessonNavName}>All lessons</span>
                  </span>
                </Link>
              </li>
              {lessons.map((lesson, i) => {
                const active =
                  !lesson.locked &&
                  isCurrent &&
                  currentLessonId === lesson.lesson_id;
                return (
                  <li key={lesson.lesson_id}>
                    <Link
                      href={
                        lesson.locked
                          ? "/subscribe-again"
                          : `/study/lesson/${cat.cat_id}/${lesson.lesson_id}`
                      }
                      className={`${styles.lessonNavLink} ${active ? styles.lessonNavActive : ""} ${
                        lesson.locked ? styles.lessonNavLocked : ""
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <span
                        className={styles.lessonNavIndex}
                        aria-hidden="true"
                      >
                        {lesson.locked ? (
                          <i className="bi bi-lock-fill" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className={styles.lessonNavText}>
                        <span className={styles.lessonNavName}>
                          {lesson.name}
                          {lesson.locked && (
                            <span className={styles.srOnly}> (locked)</span>
                          )}
                        </span>
                        {lesson.description && (
                          <span className={styles.lessonNavDesc}>
                            {lesson.description}
                          </span>
                        )}
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

  const renderPredictionGroup = () => {
    const isOpen = expanded.has(PREDICTION_GROUP);
    const isCurrent = pathname.startsWith("/study/prediction");
    const panelId = "study-nav-prediction-tests";
    const listActive = pathname === "/study/prediction";

    return (
      <li
        className={`${styles.topic} ${isOpen ? styles.topicOpen : ""} ${isCurrent ? styles.topicCurrent : ""}`}
      >
        <button
          type="button"
          className={styles.topicHeader}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => toggleCategory(PREDICTION_GROUP)}
        >
          <span className={styles.topicBadge} aria-hidden="true">
            <i className="bi bi-bullseye" />
          </span>
          <span className={styles.topicText}>
            <span className={styles.topicName}>
              {`${dashboard?.course?.name ?? ""} Prediction Tests`.trim()}
            </span>
            <span className={styles.topicMeta}>
              {predictionTests.length} tests
            </span>
          </span>
          <i
            className={`bi bi-chevron-down ${styles.topicChevron}`}
            aria-hidden="true"
          />
        </button>

        <div id={panelId} className={styles.topicPanel} inert={!isOpen}>
          <div className={styles.topicPanelInner}>
            <ul className={styles.lessonNav} aria-label="Prediction tests">
              <li>
                <Link
                  href="/study/prediction"
                  className={`${styles.lessonNavLink} ${styles.topicOverview} ${listActive ? styles.lessonNavActive : ""}`}
                  aria-current={listActive ? "page" : undefined}
                >
                  <span className={styles.lessonNavIndex} aria-hidden="true">
                    <i className="bi bi-list-ul" />
                  </span>
                  <span className={styles.lessonNavText}>
                    <span className={styles.lessonNavName}>
                      All prediction tests
                    </span>
                  </span>
                </Link>
              </li>
              {predictionTests.map((test, i) => {
                const active = new RegExp(
                  `^/study/prediction/${test.pred_test_id}(/|$)`,
                ).test(pathname);
                return (
                  <li key={test.pred_test_id}>
                    <Link
                      href={`/study/prediction/${test.pred_test_id}`}
                      className={`${styles.lessonNavLink} ${active ? styles.lessonNavActive : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <span
                        className={styles.lessonNavIndex}
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      <span className={styles.lessonNavText}>
                        <span className={styles.lessonNavName}>
                          {test.name}
                        </span>
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

  const onTests = pathname.startsWith("/study/prediction");
  const onProgress = pathname.startsWith("/study/progress");
  const bottomItems: {
    label: string;
    href?: string;
    icon: string;
    activeIcon: string;
    active: boolean;
  }[] = [
    {
      label: "Home",
      href: "/study",
      icon: "bi-house-door",
      activeIcon: "bi-house-door-fill",
      active: pathname === "/study" && !menuOpen,
    },
    {
      label: "Lessons",
      icon: "bi-journal-text",
      activeIcon: "bi-journal-text",
      active: menuOpen || (!!activeCategory && !onTests && !onProgress),
    },
    ...(predictionTests.length > 0
      ? [
          {
            label: "Tests",
            href: "/study/prediction",
            icon: "bi-bullseye",
            activeIcon: "bi-bullseye",
            active: onTests && !menuOpen,
          },
        ]
      : []),
    {
      label: "Progress",
      href: "/study/progress",
      icon: "bi-bar-chart",
      activeIcon: "bi-bar-chart-fill",
      active: onProgress && !menuOpen,
    },
  ];

  return (
    <div className={styles.shell}>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.4/latest.js?config=TeX-MML-AM_CHTML"
        strategy="afterInteractive"
        onLoad={() => void typesetMathJax()}
      />
      <div className="container">
        <div className={styles.layout}>
          <div
            className={`${styles.sheetBackdrop} ${menuOpen ? styles.sheetBackdropOpen : ""}`}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside
            ref={sidebarRef}
            id="study-nav-sheet"
            className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}
            aria-label="Study navigation"
          >
            <span className={styles.sheetHandle} aria-hidden="true" />
            {dashboard?.course && (
              <div className={styles.sidebarCourse}>
                <div className={styles.courseIcon} aria-hidden="true">
                  <i className="bi bi-mortarboard" />
                </div>
                <div className={styles.sidebarCourseText}>
                  <p className={styles.sidebarCourseName}>
                    {dashboard.course.name}
                  </p>
                  {user && (
                    <p
                      className={styles.sidebarUser}
                      title={
                        `${user.first_name} ${user.last_name}`.trim() ||
                        user.email
                      }
                    >
                      {`${user.first_name} ${user.last_name}`.trim() ||
                        user.email}
                    </p>
                  )}
                  {user && (
                    <span
                      className={`${styles.planBadge} ${user.is_paid ? styles.planActive : styles.planExpired}`}
                    >
                      <i
                        className={`bi ${user.is_paid ? "bi-patch-check" : "bi-exclamation-circle"}`}
                        aria-hidden="true"
                      />
                      {user.is_paid ? "Full access" : "Limited access"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.sheetClose}
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
            )}

            <nav ref={navRef} id="study-nav-panel" className={styles.navPanel}>
              <ul className={styles.navList}>
                <li>
                  {renderLink({
                    href: "/study",
                    label: "Dashboard",
                    icon: "bi-grid-1x2",
                    match: (p) => p === "/study",
                  })}
                </li>
                {categories.length > 0 && (
                  <li className={styles.navGroupLabel} aria-hidden="true">
                    Course content
                  </li>
                )}
                {categories.map(renderCategory)}
                <li className={styles.navGroupLabel} aria-hidden="true">
                  Tests &amp; results
                </li>
                {predictionTests.length > 1 && renderPredictionGroup()}
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

      {/* Phones / tablets: app-style tab bar (hidden while a test is running) */}
      <nav className={styles.bottomNav} aria-label="Study sections">
        {bottomItems.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className={`${styles.bottomNavItem} ${item.active ? styles.bottomNavActive : ""}`}
              aria-current={item.active ? "page" : undefined}
            >
              <i
                className={`bi ${item.active ? item.activeIcon : item.icon}`}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              className={`${styles.bottomNavItem} ${item.active ? styles.bottomNavActive : ""}`}
              aria-expanded={menuOpen}
              aria-controls="study-nav-sheet"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <i
                className={`bi ${item.active ? item.activeIcon : item.icon}`}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </button>
          ),
        )}
      </nav>
    </div>
  );
}
