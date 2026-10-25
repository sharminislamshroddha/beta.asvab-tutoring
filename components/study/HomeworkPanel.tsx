"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { studyRequest } from "@/lib/study-client";
import {
  asRecord,
  normalizeHomework,
  type HomeworkQuestion,
} from "@/lib/study-types";
import QuestionView, { Explanation } from "./QuestionView";
import styles from "./study.module.css";
import { useMathTypeset } from "./useMathTypeset";

type Filter = "all" | "bookmarked";

function numberSet(value: unknown): Set<number> {
  return new Set(
    (Array.isArray(value) ? value : []).map((v) => Number(v)).filter(Boolean),
  );
}

/**
 * Homework = self-check practice: pick an answer to see the correct one and
 * the explanation. Viewed questions and bookmarks are saved like the web portal.
 */
export default function HomeworkPanel({
  catId,
  lessonId,
}: {
  catId: number;
  lessonId: number;
}) {
  const [questions, setQuestions] = useState<HomeworkQuestion[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [viewed, setViewed] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const contentRef = useRef<HTMLDivElement>(null);
  // "Jump to question" grid opened from the pager between Previous and Next
  const [jumpOpen, setJumpOpen] = useState(false);
  const jumpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = { cat_id: catId, lesson_id: lessonId };
      const [hw, state] = await Promise.all([
        studyRequest("student-lesson-homework", params),
        studyRequest("student-homework-state", params),
      ]);
      if (cancelled) return;
      if (!hw.ok) {
        setLoadError(hw.message);
        setQuestions([]);
        return;
      }
      setQuestions(normalizeHomework(hw.data));
      if (state.ok) {
        const data = asRecord(state.data.data);
        setBookmarked(numberSet(data.bookmarked_question_ids));
        setViewed(numberSet(data.viewed_question_ids));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catId, lessonId]);

  const visible = useMemo(
    () =>
      (questions ?? []).filter(
        (q) => filter === "all" || bookmarked.has(q.qid),
      ),
    [questions, filter, bookmarked],
  );
  const current = visible[Math.min(index, Math.max(visible.length - 1, 0))];

  useMathTypeset(contentRef, [current?.qid, revealed]);

  // Jump grid: Escape closes it; the current question gets the focus
  useEffect(() => {
    if (!jumpOpen) return;
    jumpRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setJumpOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jumpOpen]);

  // Record the view once per question (homework_view)
  useEffect(() => {
    if (!current || viewed.has(current.qid)) return;
    setViewed((prev) => new Set(prev).add(current.qid));
    void studyRequest("student-homework-view", {
      cat_id: catId,
      lesson_id: lessonId,
      question_id: current.qid,
      ord: current.serial,
    });
  }, [current, viewed, catId, lessonId]);

  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(next, visible.length - 1)));
    },
    [visible.length],
  );

  const toggleBookmark = async (q: HomeworkQuestion) => {
    const nextValue = !bookmarked.has(q.qid);
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (nextValue) next.add(q.qid);
      else next.delete(q.qid);
      return next;
    });
    const result = await studyRequest("student-homework-bookmark", {
      cat_id: catId,
      lesson_id: lessonId,
      question_id: q.qid,
      ord: q.serial,
      bookmarked: nextValue ? 1 : 0,
    });
    if (!result.ok) {
      // roll back
      setBookmarked((prev) => {
        const next = new Set(prev);
        if (nextValue) next.delete(q.qid);
        else next.add(q.qid);
        return next;
      });
    }
  };

  if (questions === null) {
    return (
      <div className={styles.card} aria-busy="true">
        <div
          className={styles.skeleton}
          style={{ height: 22, width: "40%", marginBottom: 16 }}
        />
        <div
          className={styles.skeleton}
          style={{ height: 60, marginBottom: 12 }}
        />
        <div className={styles.skeleton} style={{ height: 160 }} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className={`${styles.inlineAlert} ${styles.inlineAlertError}`}
        role="alert"
      >
        <i className="bi bi-exclamation-triangle" aria-hidden="true" />{" "}
        {loadError}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className={`${styles.card} ${styles.emptyState}`}>
        <i className="bi bi-pencil-square" aria-hidden="true" />
        There is no homework for this lesson.
      </div>
    );
  }

  const viewedCount = questions.filter((q) => viewed.has(q.qid)).length;
  const position = current ? visible.indexOf(current) : 0;
  const isRevealed = current ? revealed.has(current.qid) : false;

  return (
    <div className={styles.testLayout}>
      <section
        className={styles.card}
        aria-label="Homework question"
        ref={contentRef}
      >
        <div className={styles.hwToolbar}>
          <div
            className={styles.hwFilters}
            role="group"
            aria-label="Show questions"
          >
            <button
              type="button"
              className={`${styles.sectionTab} ${filter === "all" ? styles.sectionTabActive : ""}`}
              aria-pressed={filter === "all"}
              onClick={() => {
                setFilter("all");
                setIndex(0);
              }}
            >
              All <span className={styles.hwCount}>({questions.length})</span>
            </button>
            <button
              type="button"
              className={`${styles.sectionTab} ${filter === "bookmarked" ? styles.sectionTabActive : ""}`}
              aria-pressed={filter === "bookmarked"}
              onClick={() => {
                setFilter("bookmarked");
                setIndex(0);
              }}
              disabled={bookmarked.size === 0}
            >
              <i className="bi bi-bookmark-fill" aria-hidden="true" />{" "}
              <span className={styles.hwFilterLabel}>Bookmarked </span>
              <span className={styles.hwCount}>({bookmarked.size})</span>
            </button>
          </div>
          <span className={styles.hwViewed}>
            Viewed {viewedCount}/{questions.length}
          </span>
          <div className={styles.jumpWrap}>
            <button
              type="button"
              className={`${styles.jumpButton} ${jumpOpen ? styles.jumpButtonOpen : ""}`}
              onClick={() => setJumpOpen((open) => !open)}
              aria-expanded={jumpOpen}
              aria-controls="homework-jump"
              aria-label={`Question ${position + 1} of ${visible.length}. Jump to a question`}
            >
              <i className="bi bi-grid-3x3-gap" aria-hidden="true" />
              <span>
                {position + 1} / {visible.length}
              </span>
              <i className="bi bi-chevron-up" aria-hidden="true" />
            </button>

            {jumpOpen && (
              <>
                <div
                  className={styles.jumpBackdrop}
                  onClick={() => setJumpOpen(false)}
                  aria-hidden="true"
                />
                <div
                  id="homework-jump"
                  ref={jumpRef}
                  className={styles.jumpPanel}
                  role="dialog"
                  aria-label="Jump to a question"
                >
                  <div className={styles.jumpHead}>
                    <span className={styles.jumpTitle}>Jump to question</span>
                    <button
                      type="button"
                      className={styles.paletteCloseAlways}
                      onClick={() => setJumpOpen(false)}
                      aria-label="Close"
                    >
                      <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                  </div>
                  <div className={styles.jumpGrid}>
                    {visible.map((q, i) => (
                      <button
                        key={q.qid}
                        type="button"
                        className={`${styles.jumpCell} ${viewed.has(q.qid) ? styles.jumpCellViewed : ""} ${
                          i === position ? styles.jumpCellCurrent : ""
                        }`}
                        onClick={() => {
                          go(i);
                          setJumpOpen(false);
                        }}
                        aria-current={i === position ? "true" : undefined}
                        aria-label={`Question ${q.serial || i + 1}${viewed.has(q.qid) ? ", viewed" : ""}${
                          bookmarked.has(q.qid) ? ", bookmarked" : ""
                        }`}
                      >
                        {q.serial || i + 1}
                        {bookmarked.has(q.qid) && (
                          <i
                            className={`bi bi-bookmark-fill ${styles.jumpCellMark}`}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className={styles.jumpLegend} aria-hidden="true">
                    <span>
                      <span
                        className={`${styles.jumpSwatch} ${styles.jumpCellViewed}`}
                      />{" "}
                      Viewed
                    </span>
                    <span>
                      <span
                        className={`${styles.jumpSwatch} ${styles.jumpCellCurrent}`}
                      />{" "}
                      Current
                    </span>
                    <span>
                      <i
                        className="bi bi-bookmark-fill"
                        style={{ color: "var(--study-orange)" }}
                      />{" "}
                      Bookmarked
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Phones / tablets: viewed progress as a bar under the toolbar */}
        <div className={styles.hwProgress} aria-hidden="true">
          <span>
            Viewed {viewedCount} of {questions.length}
          </span>
          <span className={styles.hwProgressBar}>
            <span
              style={{
                width: `${Math.round((viewedCount / questions.length) * 100)}%`,
              }}
            />
          </span>
        </div>

        {current ? (
          <>
            <QuestionView
              number={current.serial || position + 1}
              qid={current.qid}
              story={current.story}
              question={current.question}
              options={current.options}
              selected={answers[current.qid] ?? 0}
              correctNumber={isRevealed ? current.correctNumber : undefined}
              onSelect={(n) => {
                setAnswers((prev) => ({ ...prev, [current.qid]: n }));
                setRevealed((prev) => new Set(prev).add(current.qid));
              }}
              disabled={isRevealed}
              headerAction={
                <button
                  type="button"
                  className={`${styles.iconToggle} ${bookmarked.has(current.qid) ? styles.iconToggleOn : ""}`}
                  onClick={() => void toggleBookmark(current)}
                  aria-pressed={bookmarked.has(current.qid)}
                  aria-label={
                    bookmarked.has(current.qid)
                      ? "Remove bookmark"
                      : "Bookmark this question"
                  }
                  title={
                    bookmarked.has(current.qid)
                      ? "Remove bookmark"
                      : "Bookmark this question"
                  }
                >
                  <i
                    className={`bi ${bookmarked.has(current.qid) ? "bi-bookmark-fill" : "bi-bookmark"}`}
                    aria-hidden="true"
                  />
                </button>
              }
            />

            {isRevealed ? (
              <>
                {answers[current.qid] && (
                  <div
                    className={`${styles.inlineAlert} ${
                      answers[current.qid] === current.correctNumber
                        ? styles.inlineAlertInfo
                        : styles.inlineAlertWarn
                    } mt-3 mb-0`}
                    role="status"
                  >
                    {answers[current.qid] === current.correctNumber
                      ? "Correct, nice work!"
                      : "Not quite. Check the explanation."}
                  </div>
                )}
                <Explanation html={current.explanation} />
              </>
            ) : (
              <div className="text-center mt-3">
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() =>
                    setRevealed((prev) => new Set(prev).add(current.qid))
                  }
                >
                  <i className="bi bi-eye" aria-hidden="true" /> Show answer
                </button>
              </div>
            )}

            <div className={styles.questionFooter}>
              <div className={styles.questionNav}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => go(position - 1)}
                  disabled={position === 0}
                >
                  <i className="bi bi-arrow-left" aria-hidden="true" />{" "}
                  <span className={styles.navText}>Previous</span>
                </button>

                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => go(position + 1)}
                  disabled={position >= visible.length - 1}
                >
                  <span className={styles.navText}>Next</span>{" "}
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className={styles.muted}>No bookmarked questions yet.</p>
        )}
      </section>

      {/* Desktop (1200px+): question list beside the question. Smaller
          screens use the "3 / 21" jump menu in the pager instead. */}
      <aside
        className={`${styles.card} ${styles.homeworkSide}`}
        aria-label="Question list"
      >
        <h2 className={styles.cardTitle} style={{ fontSize: "0.95rem" }}>
          Questions
        </h2>
        <div className={styles.palette}>
          {visible.map((q, i) => (
            <button
              key={q.qid}
              type="button"
              className={`${styles.paletteCell} ${viewed.has(q.qid) ? styles.paletteAnswered : ""} ${
                i === position ? styles.paletteCurrent : ""
              }`}
              onClick={() => go(i)}
              aria-label={`Question ${q.serial || i + 1}${bookmarked.has(q.qid) ? ", bookmarked" : ""}${
                viewed.has(q.qid) ? ", viewed" : ""
              }`}
              aria-current={i === position ? "true" : undefined}
            >
              {q.serial || i + 1}
              {bookmarked.has(q.qid) && (
                <i
                  className={`bi bi-bookmark-fill ${styles.jumpCellMark}`}
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
        <div className={styles.legend}>
          <span>
            <span
              className={styles.legendSwatch}
              style={{ background: "#002341", borderColor: "#002341" }}
            />
            Viewed
          </span>
          <span>
            <span
              className={styles.legendSwatch}
              style={{ borderColor: "#e58a34" }}
            />
            Current
          </span>
          <span>
            <i
              className="bi bi-bookmark-fill"
              style={{ color: "var(--study-orange)" }}
              aria-hidden="true"
            />
            Bookmarked
          </span>
        </div>
      </aside>
    </div>
  );
}
