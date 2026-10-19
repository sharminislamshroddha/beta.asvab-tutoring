"use client";

import { useEffect, useRef, useState } from "react";
import QuestionHtml from "@/components/free-test/QuestionHtml";
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

export default function FlashcardDeck({ cards: initial }: { cards: Flashcard[] }) {
  const [cards, setCards] = useState(initial);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useMathTypeset(ref, [index, cards]);

  const card = cards[index];
  const go = (next: number) => {
    setFlipped(false);
    setIndex((next + cards.length) % cards.length);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === " " && (e.target as HTMLElement)?.tagName !== "BUTTON") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!card) return null;

  return (
    <div ref={ref} style={{ maxWidth: 760 }}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className={styles.muted} aria-live="polite">
          Card {index + 1} of {cards.length}
        </span>
        <button
          type="button"
          className={styles.btnGhost}
          style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
          onClick={() => {
            setCards(shuffle(cards));
            setIndex(0);
            setFlipped(false);
          }}
        >
          <i className="bi bi-shuffle" aria-hidden="true" /> Shuffle
        </button>
      </div>

      <button
        type="button"
        className={`${styles.flashcard} ${flipped ? styles.flashcardFlipped : ""}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Showing answer. Select to show the question." : "Showing question. Select to reveal the answer."}
      >
        <span className={styles.flashcardInner}>
          <span className={styles.flashcardFace} aria-hidden={flipped}>
            <span className={styles.flashcardHint}>Tap to flip</span>
            <QuestionHtml html={card.front} />
          </span>
          <span className={`${styles.flashcardFace} ${styles.flashcardBack}`} aria-hidden={!flipped}>
            <span className={styles.flashcardHint}>Answer</span>
            <QuestionHtml html={card.back || "<p>No explanation for this card.</p>"} />
          </span>
        </span>
      </button>

      <div className="d-flex justify-content-between mt-3">
        <button type="button" className={styles.btnGhost} onClick={() => go(index - 1)}>
          <i className="bi bi-arrow-left" aria-hidden="true" /> Previous
        </button>
        <button type="button" className={styles.btnSecondary} onClick={() => setFlipped((f) => !f)}>
          <i className="bi bi-arrow-repeat" aria-hidden="true" /> Flip
        </button>
        <button type="button" className={styles.btnGhost} onClick={() => go(index + 1)}>
          Next <i className="bi bi-arrow-right" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
