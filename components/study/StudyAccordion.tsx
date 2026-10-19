"use client";

import { useId, useRef, useState } from "react";
import QuestionHtml from "@/components/free-test/QuestionHtml";
import type { StudyStudyItem } from "@/lib/study-types";
import styles from "./study.module.css";
import { useMathTypeset } from "./useMathTypeset";

/** Lesson study notes; the first item starts open (as on the web portal). */
export default function StudyAccordion({ items }: { items: StudyStudyItem[] }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set(items.length ? [items[0].study_id] : []));
  const ref = useRef<HTMLDivElement>(null);
  const baseId = useId();
  useMathTypeset(ref, [open]);

  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div ref={ref}>
      {items.map((item, i) => {
        const isOpen = open.has(item.study_id);
        const panelId = `${baseId}-panel-${i}`;
        return (
          <div key={item.study_id} className={styles.accordionItem}>
            <h2 className="m-0" style={{ fontSize: "1rem" }}>
              <button
                type="button"
                className={styles.accordionButton}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.study_id)}
              >
                <span>
                  <span className={styles.muted} style={{ fontWeight: 600, marginRight: "0.5rem" }}>
                    {i + 1}.
                  </span>
                  {item.title || `Part ${i + 1}`}
                </span>
                <i className={`bi ${isOpen ? "bi-chevron-up" : "bi-chevron-down"}`} aria-hidden="true" />
              </button>
            </h2>
            {isOpen && (
              <div id={panelId} className={styles.accordionBody}>
                <QuestionHtml html={item.content} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
