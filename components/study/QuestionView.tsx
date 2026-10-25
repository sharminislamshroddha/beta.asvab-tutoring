"use client";

import { useEffect, useState, type ReactNode } from "react";
import QuestionHtml from "@/components/free-test/QuestionHtml";
import { OPTION_LETTERS, type StudyOption } from "@/lib/study-types";
import styles from "./study.module.css";

type Props = {
  number: number;
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
  /** question.qid, shown on hover and copied on click (for developers) */
  qid?: number;
  /** Control shown at the right of the question number (e.g. a bookmark toggle) */
  headerAction?: ReactNode;
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / non-secure pages
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/**
 * "Question 3 of 15" label. For developers: hovering shows the question's
 * database id (question.qid) and clicking copies it.
 */
export function QuestionNumber({ text, qid }: { text: string; qid?: number }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  if (!qid) return <div className={styles.questionNumber}>{text}</div>;

  return (
    <button
      type="button"
      className={`${styles.questionNumber} ${styles.questionNumberCopy}`}
      title={`QID: ${qid}`}
      aria-label={`${text}. Question ID ${qid}, click to copy`}
      onClick={async () => setCopied(await copyText(String(qid)))}
    >
      {copied ? `Copied ID ${qid}` : text}
      <span className={styles.srOnly} aria-live="polite">
        {copied ? `Question ID ${qid} copied` : ""}
      </span>
    </button>
  );
}

/** One multiple-choice question: story, prompt and A-E options. */
export default function QuestionView({
  number,
  story,
  question,
  options,
  selected,
  correctNumber,
  onSelect,
  disabled,
  label,
  qid,
  headerAction,
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
      <div className={styles.questionHead}>
        <QuestionNumber text={label ?? `Question ${number}`} qid={qid} />
        {headerAction}
      </div>
      <div className={styles.questionText}>
        <QuestionHtml html={question} />
      </div>

      <ul
        className={styles.options}
        role={onSelect ? "radiogroup" : "list"}
        aria-label={groupLabel}
      >
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
          const tag = isCorrect
            ? isSelected
              ? "Your answer · Correct"
              : "Correct answer"
            : isWrong
              ? "Your answer"
              : "";

          const content = (
            <>
              <span className={styles.optionLetter} aria-hidden="true">
                {isCorrect ? (
                  <i className="bi bi-check-lg" />
                ) : isWrong ? (
                  <i className="bi bi-x-lg" />
                ) : (
                  letter
                )}
              </span>
              <span className={styles.optionHtml}>
                <span className={styles.srOnly}>Option {letter}: </span>
                <QuestionHtml html={option.html} />
              </span>
              {tag && (
                <span
                  className={styles.optionTag}
                  style={{
                    color: isCorrect
                      ? "var(--study-green)"
                      : "var(--study-red)",
                  }}
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
                <div className={`${styles.option} ${stateClass}`}>
                  {content}
                </div>
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
