"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QuestionHtml from "@/components/free-test/QuestionHtml";
import { QuestionNumber } from "./QuestionView";
import type { Flashcard } from "@/lib/study-types";
import styles from "./study.module.css";
import { useMathTypeset } from "./useMathTypeset";

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Flashcards like the web portal: the card shows the question and
 * "See answer" reveals the explanation below it.
 */
export default function FlashcardDeck({
  cards: initial,
}: {
  cards: Flashcard[];
}) {
  const [cards, setCards] = useState(initial);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(() => new Set());
  const cardRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  useMathTypeset(cardRef, [index, cards, revealed]);

  const card = cards[index];

  const go = useCallback(
    (next: number) => {
      if (cards.length === 0) return;
      setRevealed(false);
      setIndex((next + cards.length) % cards.length);
    },
    [cards.length],
  );

  const reveal = useCallback(() => {
    setRevealed((r) => !r);
    if (card) setSeen((prev) => new Set(prev).add(card.id));
  }, [card]);

  useEffect(() => {
    if (revealed) answerRef.current?.focus({ preventScroll: true });
  }, [revealed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName)
      )
        return;
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        reveal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, reveal]);

  if (!card) return null;

  const percent = Math.round(((index + 1) / cards.length) * 100);

  return (
    <div style={{ maxWidth: 820 }}>
      <div className={styles.testTopbar} style={{ position: "static" }}>
        <div className={styles.progressWrap}>
          <div className={styles.progressLabel}>
            <span aria-live="polite">
              Card {index + 1} of {cards.length}
            </span>
            <span>{seen.size} answers checked</span>
          </div>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={index + 1}
            aria-valuemin={1}
            aria-valuemax={cards.length}
            aria-label="Card position"
          >
            <div
              className={styles.progressFill}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={() => {
            setCards(shuffle(cards));
            setIndex(0);
            setRevealed(false);
          }}
        >
          <i className="bi bi-shuffle" aria-hidden="true" /> Shuffle
        </button>
      </div>

      <article
        className={`${styles.card} ${styles.flashcardCard}`}
        ref={cardRef}
        aria-label={`Flashcard ${index + 1}`}
      >
        <QuestionNumber text={`Card ${index + 1}`} qid={card.id} />
        <div className={styles.flashcardFront}>
          <QuestionHtml key={`q-${card.id}`} html={card.front} />
        </div>

        <div className="text-center my-3">
          <button
            type="button"
            className={revealed ? styles.btnGhost : styles.btnPrimary}
            onClick={reveal}
            aria-expanded={revealed}
            aria-controls="flashcard-answer"
          >
            <i
              className={`bi ${revealed ? "bi-eye-slash" : "bi-eye"}`}
              aria-hidden="true"
            />
            {revealed ? "Hide answer" : "See answer"}
          </button>
        </div>

        <div
          id="flashcard-answer"
          ref={answerRef}
          tabIndex={-1}
          className={styles.explanation}
          hidden={!revealed}
          style={{ outline: "none" }}
        >
          <div className={styles.explanationTitle}>
            <i className="bi bi-lightbulb" aria-hidden="true" /> Answer
          </div>
          {card.back.trim() ? (
            <QuestionHtml key={`a-${card.id}`} html={card.back} />
          ) : (
            <p className="mb-0">There is no explanation for this card.</p>
          )}
        </div>
      </article>

      <div className="d-flex justify-content-between gap-2 mt-3">
        <button
          type="button"
          className={styles.btnGhost}
          onClick={() => go(index - 1)}
          disabled={cards.length < 2}
        >
          <i className="bi bi-arrow-left" aria-hidden="true" /> Previous
        </button>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => go(index + 1)}
          disabled={cards.length < 2}
        >
          Next <i className="bi bi-arrow-right" aria-hidden="true" />
        </button>
      </div>
      <p className={`${styles.muted} small mt-3 d-none d-md-block`}>
        Tip: press Space to show the answer and ← → to move between cards.
      </p>
    </div>
  );
}
