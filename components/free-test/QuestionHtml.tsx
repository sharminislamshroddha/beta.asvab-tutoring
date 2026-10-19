"use client";

import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { processQuestionHtml } from "@/lib/decode-html";
import freeTestStyles from "./freeTest.module.css";

interface QuestionHtmlProps {
  html?: string | null;
  className?: string;
}

const IMAGE_WRAP_CLASS = "questionImageEnlargeWrap";
const IMAGE_BUTTON_CLASS = "questionImageEnlargeBtn";
const CONTENT_ATTR = "data-question-html";

function decorateQuestionImages(container: HTMLDivElement | null) {
  if (!container) {
    return;
  }

  container.querySelectorAll("img").forEach((img) => {
    if (img.closest(`.${IMAGE_WRAP_CLASS}`)) {
      return;
    }

    const wrapper = document.createElement("span");
    wrapper.className = IMAGE_WRAP_CLASS;

    img.parentNode?.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    const button = document.createElement("button");
    button.type = "button";
    button.className = IMAGE_BUTTON_CLASS;
    button.setAttribute("aria-label", "Enlarge image");
    button.innerHTML =
      '<i class="bi bi-arrows-fullscreen" aria-hidden="true"></i>';

    wrapper.appendChild(button);
  });
}

/**
 * Renders API question/option HTML (images, math spans, paragraphs).
 * Uses a ref for HTML injection so parent re-renders (e.g. option selection)
 * do not reset MathJax output via dangerouslySetInnerHTML reconciliation.
 */
function QuestionHtml({ html, className = "" }: QuestionHtmlProps) {
  const processed = useMemo(() => processQuestionHtml(html || ""), [html]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [enlargedImage, setEnlargedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (!processed.trim()) {
      container.innerHTML = "";
      container.removeAttribute(CONTENT_ATTR);
      return;
    }

    if (container.getAttribute(CONTENT_ATTR) !== processed) {
      container.innerHTML = processed;
      container.setAttribute(CONTENT_ATTR, processed);
    }
  }, [processed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !processed.trim()) {
      return;
    }

    const applyDecorations = () => {
      decorateQuestionImages(container);
    };

    applyDecorations();

    // MathJax re-typesets on category switch (see FreeTest) and replaces DOM nodes,
    // which strips dynamically added enlarge buttons — re-apply when subtree changes.
    const observer = new MutationObserver(() => {
      applyDecorations();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [processed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest(`.${IMAGE_BUTTON_CLASS}`);
      if (!button) {
        return;
      }

      const wrapper = button.closest(`.${IMAGE_WRAP_CLASS}`);
      const img = wrapper?.querySelector("img");
      if (!img?.src) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setEnlargedImage({
        src: img.currentSrc || img.src,
        alt: img.alt || "Question image",
      });
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [processed]);

  useEffect(() => {
    if (!enlargedImage) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEnlargedImage(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enlargedImage]);

  if (!processed.trim()) {
    return null;
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`${freeTestStyles.questionHtml} ${className}`.trim()}
      />

      {enlargedImage ? (
        <div
          className={freeTestStyles.imageLightboxBackdrop}
          onClick={() => setEnlargedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged question image"
        >
          <button
            type="button"
            className={freeTestStyles.imageLightboxClose}
            onClick={() => setEnlargedImage(null)}
            aria-label="Close enlarged image"
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
          <img
            src={enlargedImage.src}
            alt={enlargedImage.alt}
            className={freeTestStyles.imageLightboxImg}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}

export default memo(
  QuestionHtml,
  (prev, next) => prev.html === next.html && prev.className === next.className,
);
