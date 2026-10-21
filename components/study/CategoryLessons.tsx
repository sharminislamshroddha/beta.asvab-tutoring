"use client";

import Link from "next/link";
import { useState } from "react";
import { formatStudyDate, type LessonProgress } from "@/lib/study-types";
import { ScoreBar } from "./StudyUi";
import styles from "./study.module.css";

/** Practice test score that counts as passed (green in ScoreBar). */
const PASS_SCORE = 70;

export type CategoryLesson = {
  lesson_id: number;
  number: number;
  name: string;
  description: string;
  locked: boolean;
  progress: LessonProgress | null;
};

type Status = "locked" | "new" | "started" | "needs-work" | "passed";
type Filter = "all" | "new" | "needs-work" | "passed";

const STATUS: Record<Status, { label: string; icon: string; className: string }> = {
  locked: { label: "Locked", icon: "bi-lock", className: styles.statusLocked },
  new: { label: "Not started", icon: "bi-circle", className: styles.statusNew },
  started: { label: "In progress", icon: "bi-hourglass-split", className: styles.statusStarted },
  "needs-work": { label: "Needs practice", icon: "bi-arrow-repeat", className: styles.statusNeedsWork },
  passed: { label: "Passed", icon: "bi-check-circle-fill", className: styles.statusPassed },
};

function lessonStatus(lesson: CategoryLesson): Status {
  if (lesson.locked) return "locked";
  const p = lesson.progress;
  if (p?.latest) return p.latest.score >= PASS_SCORE ? "passed" : "needs-work";
  return p && p.homework_viewed > 0 ? "started" : "new";
}

function matchesFilter(status: Status, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "new") return status === "new" || status === "started";
  return status === filter;
}

function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Lesson to study next: the first one not tested yet, else the weakest score below passing. */
function pickNext(lessons: CategoryLesson[]) {
  const open = lessons.filter((l) => !l.locked);
  const untested = open.find((l) => !l.progress?.latest);
  if (untested) return { lesson: untested, reason: "new" as const };
  const weakest = open
    .filter((l) => (l.progress?.latest?.score ?? 100) < PASS_SCORE)
    .sort((a, b) => (a.progress?.latest?.score ?? 0) - (b.progress?.latest?.score ?? 0))[0];
  return weakest ? { lesson: weakest, reason: "improve" as const } : null;
}

export default function CategoryLessons({ catId, lessons }: { catId: number; lessons: CategoryLesson[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const statuses = new Map(lessons.map((l) => [l.lesson_id, lessonStatus(l)]));

  const tested = lessons.filter((l) => l.progress?.latest);
  const passed = tested.filter((l) => (l.progress?.latest?.score ?? 0) >= PASS_SCORE).length;
  const average = tested.length
    ? Math.round(tested.reduce((sum, l) => sum + (l.progress?.latest?.score ?? 0), 0) / tested.length)
    : null;
  const homeworkTotal = lessons.reduce((sum, l) => sum + (l.locked ? 0 : l.progress?.homework_total ?? 0), 0);
  const homeworkViewed = lessons.reduce(
    (sum, l) => sum + (l.locked ? 0 : Math.min(l.progress?.homework_viewed ?? 0, l.progress?.homework_total ?? 0)),
    0,
  );
  const next = pickNext(lessons);
  const lessonHref = (lesson: CategoryLesson, tab?: string) =>
    `/study/lesson/${catId}/${lesson.lesson_id}${tab ? `?tab=${tab}` : ""}`;

  const counts: Record<Filter, number> = { all: lessons.length, new: 0, "needs-work": 0, passed: 0 };
  for (const status of statuses.values()) {
    if (matchesFilter(status, "new")) counts.new++;
    if (status === "needs-work") counts["needs-work"]++;
    if (status === "passed") counts.passed++;
  }
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "new", label: "To do" },
    { id: "needs-work", label: "Needs practice" },
    { id: "passed", label: "Passed" },
  ];
  const visible = lessons.filter((l) => matchesFilter(statuses.get(l.lesson_id) ?? "new", filter));

  return (
    <>
      <section className={`${styles.card} ${styles.catSummary}`} aria-label="Topic progress">
        <div className={styles.catStats}>
          <div className={styles.catStat}>
            <span className={styles.catStatLabel}>Lessons passed</span>
            <span className={styles.catStatValue}>
              {passed}
              <small>/{lessons.length}</small>
            </span>
            <span className={styles.catMeter} aria-hidden="true">
              <span style={{ width: `${percent(passed, lessons.length)}%` }} />
            </span>
          </div>
          <div className={styles.catStat}>
            <span className={styles.catStatLabel}>Average score</span>
            <span className={styles.catStatValue}>{average === null ? "–" : `${average}%`}</span>
            <span className={styles.catStatHint}>
              {tested.length} of {lessons.length} tested
            </span>
          </div>
          <div className={styles.catStat}>
            <span className={styles.catStatLabel}>Homework reviewed</span>
            <span className={styles.catStatValue}>{homeworkTotal ? `${percent(homeworkViewed, homeworkTotal)}%` : "–"}</span>
            <span className={styles.catStatHint}>
              {homeworkViewed} of {homeworkTotal} questions
            </span>
          </div>
        </div>

        {next ? (
          <div className={styles.upNext}>
            <div className={styles.upNextIcon} aria-hidden="true">
              <i className={`bi ${next.reason === "new" ? "bi-play-fill" : "bi-bullseye"}`} />
            </div>
            <div className={styles.upNextText}>
              <span className={styles.upNextLabel}>{next.reason === "new" ? "Up next" : "Recommended review"}</span>
              <span className={styles.upNextName}>
                Lesson {next.lesson.number}: {next.lesson.name}
              </span>
              {next.reason === "improve" && (
                <span className={styles.catStatHint}>
                  Latest score {next.lesson.progress?.latest?.score}%. Practice and retake to reach {PASS_SCORE}%.
                </span>
              )}
            </div>
            <Link href={lessonHref(next.lesson)} className={styles.btnPrimary}>
              {next.reason === "new" ? "Start lesson" : "Review lesson"}
            </Link>
          </div>
        ) : tested.length > 0 ? (
          <div className={`${styles.upNext} ${styles.upNextDone}`}>
            <div className={styles.upNextIcon} aria-hidden="true">
              <i className="bi bi-trophy" />
            </div>
            <div className={styles.upNextText}>
              <span className={styles.upNextName}>Every lesson passed. Great work!</span>
              <span className={styles.catStatHint}>Retake any practice test to keep your skills sharp.</span>
            </div>
          </div>
        ) : null}
      </section>

      <div className={styles.filterBar} role="group" aria-label="Filter lessons">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`${styles.filterChip} ${filter === f.id ? styles.filterChipActive : ""}`}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className={styles.filterCount}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className={`${styles.card} ${styles.emptyState}`}>
          <i className="bi bi-funnel" aria-hidden="true" />
          No lessons match this filter.
        </div>
      ) : (
        <ol className={styles.lessonCards} aria-label="Lessons">
          {visible.map((lesson) => {
            const status = statuses.get(lesson.lesson_id) ?? "new";
            const badge = STATUS[status];
            const p = lesson.progress;
            const latest = p?.latest ?? null;
            const trend = latest && p?.previous_score !== null && p?.previous_score !== undefined
              ? latest.score - p.previous_score
              : null;
            const homeworkDone = p ? Math.min(p.homework_viewed, p.homework_total) : 0;

            return (
              <li key={lesson.lesson_id} className={`${styles.lessonCard} ${lesson.locked ? styles.lessonCardLocked : ""}`}>
                <div className={styles.lessonCardMain}>
                  <span className={styles.lessonNumber} aria-hidden="true">
                    {lesson.locked ? <i className="bi bi-lock" /> : status === "passed" ? <i className="bi bi-check-lg" /> : lesson.number}
                  </span>
                  <div className={styles.lessonCardBody}>
                    <div className={styles.lessonCardHead}>
                      <Link
                        href={lesson.locked ? "/subscribe-again" : lessonHref(lesson)}
                        className={styles.lessonCardTitle}
                      >
                        <span className={styles.srOnly}>Lesson {lesson.number}: </span>
                        {lesson.name}
                      </Link>
                      <span className={`${styles.statusPill} ${badge.className}`}>
                        <i className={`bi ${badge.icon}`} aria-hidden="true" />
                        {badge.label}
                      </span>
                    </div>
                    {lesson.description && <p className={styles.lessonCardDesc}>{lesson.description}</p>}

                    {!lesson.locked && p && (
                      <ul className={styles.lessonFacts} aria-label="Lesson progress">
                        {p.homework_total > 0 && (
                          <li title="Homework questions you have opened">
                            <i className="bi bi-pencil-square" aria-hidden="true" />
                            Homework {homeworkDone}/{p.homework_total}
                            <span className={styles.miniMeter} aria-hidden="true">
                              <span style={{ width: `${percent(homeworkDone, p.homework_total)}%` }} />
                            </span>
                          </li>
                        )}
                        {p.homework_bookmarked > 0 && (
                          <li>
                            <i className="bi bi-bookmark-fill" aria-hidden="true" />
                            {p.homework_bookmarked} saved
                          </li>
                        )}
                        {p.practice_total > 0 && (
                          <li>
                            <i className="bi bi-clipboard-check" aria-hidden="true" />
                            {p.practice_total}-question test
                          </li>
                        )}
                        {p.attempts > 0 && (
                          <li>
                            <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
                            {p.attempts} {p.attempts === 1 ? "attempt" : "attempts"}
                            {p.attempts > 1 && p.best_score !== null ? ` · best ${p.best_score}%` : ""}
                          </li>
                        )}
                        {latest?.date && (
                          <li>
                            <i className="bi bi-calendar3" aria-hidden="true" />
                            Last taken {formatStudyDate(latest.date)}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>

                  {latest && !lesson.locked && (
                    <div className={styles.lessonScore}>
                      <span className={styles.lessonScoreLabel}>Latest score</span>
                      <ScoreBar score={latest.score} />
                      <span className={styles.lessonScoreMeta}>
                        {latest.correct}/{latest.total} correct
                        {trend !== null && trend !== 0 && (
                          <span className={trend > 0 ? styles.trendUp : styles.trendDown}>
                            <i className={`bi ${trend > 0 ? "bi-arrow-up-short" : "bi-arrow-down-short"}`} aria-hidden="true" />
                            {Math.abs(trend)}
                            <span className={styles.srOnly}> points {trend > 0 ? "higher" : "lower"} than the previous attempt</span>
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.lessonActions}>
                  {lesson.locked ? (
                    <Link href="/subscribe-again" className={styles.btnGhost}>
                      <i className="bi bi-unlock" aria-hidden="true" /> Unlock with full course
                    </Link>
                  ) : (
                    <>
                      <Link href={lessonHref(lesson, "study")} className={styles.btnGhost}>
                        <i className="bi bi-book" aria-hidden="true" /> Study
                      </Link>
                      {(p?.homework_total ?? 0) > 0 && (
                        <Link href={lessonHref(lesson, "homework")} className={styles.btnGhost}>
                          <i className="bi bi-pencil-square" aria-hidden="true" /> Homework
                        </Link>
                      )}
                      <Link href={lessonHref(lesson, "practice")} className={styles.btnGhost}>
                        <i className="bi bi-clipboard-check" aria-hidden="true" /> {latest ? "Retake test" : "Practice test"}
                      </Link>
                      {latest && (
                        <Link
                          href={`/study/practice/${catId}/${lesson.lesson_id}/result/${latest.result_id}`}
                          className={styles.btnGhost}
                        >
                          <i className="bi bi-bar-chart" aria-hidden="true" /> Review results
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
