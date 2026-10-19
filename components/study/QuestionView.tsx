"use client";

import QuestionHtml from "@/components/free-test/QuestionHtml";
import { OPTION_LETTERS, type StudyOption } from "@/lib/study-types";
import styles from "./study.module.css";

type Props = {
  number: number;
  total?: number;
  story?: string;
  question: string;
  options: StudyOption[];
  /** Option the student chose (0 = none) */
  selected: number;
  /** Show correct / wrong marks (homework reveal, review) */
  correctNumber?: number;
  onSelect?: (optionNumber: number) => void;
  disabled?: boolean;
  label?: string;
};

/** One multiple-choice question: story, prompt and A-E options. */
export default function QuestionView({
  number,
  total,
  story,
  question,
  options,
  selected,
  correctNumber,
  onSelect,
  disabled,
  label,
}: Props) {
  const reveal = Boolean(correctNumber);
  const groupLabel = `Answer choices for question ${number}`;

  return (
    <div>
      {story && story.trim() && (
        <div className={styles.story} aria-label="Reading passage">
          <QuestionHtml html={story} />
        </div>
      )}
      <div className={styles.questionNumber}>
        {label ?? `Question ${number}${total ? ` of ${total}` : ""}`}
      </div>
      <div className={styles.questionText}>
        <QuestionHtml html={question} />
      </div>

      <ul className={styles.options} role={onSelect ? "radiogroup" : "list"} aria-label={groupLabel}>
        {options.map((option) => {
          const isSelected = selected === option.number;
          const isCorrect = reveal && option.number === correctNumber;
          const isWrong = reveal && isSelected && !isCorrect;
          const stateClass = isCorrect
            ? styles.optionCorrect
            : isWrong
              ? styles.optionWrong
              : isSelected
                ? styles.optionSelected
                : "";
          const letter = OPTION_LETTERS[option.number - 1];
          const tag = isCorrect ? (isSelected ? "Your answer · Correct" : "Correct answer") : isWrong ? "Your answer" : "";

          const content = (
            <>
              <span className={styles.optionLetter} aria-hidden="true">
                {isCorrect ? <i className="bi bi-check-lg" /> : isWrong ? <i className="bi bi-x-lg" /> : letter}
              </span>
              <span className={styles.optionHtml}>
                <span className={styles.srOnly}>Option {letter}: </span>
                <QuestionHtml html={option.html} />
              </span>
              {tag && (
                <span
                  className={styles.optionTag}
                  style={{ color: isCorrect ? "var(--study-green)" : "var(--study-red)" }}
                >
                  {tag}
                </span>
              )}
            </>
          );

          return (
            <li key={option.key}>
              {onSelect ? (
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`${styles.option} ${stateClass}`}
                  onClick={() => onSelect(option.number)}
                  disabled={disabled}
                >
                  {content}
                </button>
              ) : (
                <div className={`${styles.option} ${stateClass}`}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Explanation({ html }: { html: string }) {
  if (!html || !html.trim()) return null;
  return (
    <div className={styles.explanation}>
      <div className={styles.explanationTitle}>
        <i className="bi bi-lightbulb" aria-hidden="true" /> Explanation
      </div>
      <QuestionHtml html={html} />
    </div>
  );
}
