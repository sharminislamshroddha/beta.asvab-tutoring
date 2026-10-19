"use client";

import { useEffect, type DependencyList, type RefObject } from "react";
import { typesetMathJax } from "@/utils/mathjax";

/**
 * Typeset MathJax inside `ref` whenever `deps` change.
 * MathJax is loaded once by StudyShell; if it is not ready yet,
 * typesetMathJax waits for its startup hook.
 */
export function useMathTypeset(ref: RefObject<HTMLElement | null>, deps: DependencyList) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = window.setTimeout(() => void typesetMathJax(el), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
