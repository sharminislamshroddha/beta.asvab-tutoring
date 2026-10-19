import type React from "react";

declare global {
  interface Window {
    MathJax?: {
      Hub: {
        Queue: (callback: unknown, ...rest: unknown[]) => void;
        Register: {
          StartupHook: (name: string, callback: () => void) => void;
        };
      };
    };
  }
}

/** Queue MathJax 2.x typesetting once the Hub is fully initialized. */
export function typesetMathJax(element?: HTMLElement | null): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    const hub = window.MathJax?.Hub;
    if (!hub) {
      resolve();
      return;
    }

    const runTypeset = () => {
      try {
        const job = element
          ? (["Typeset", hub, element] as const)
          : (["Typeset", hub] as const);
        hub.Queue(job, () => resolve());
      } catch {
        resolve();
      }
    };

    // Runs immediately if startup already finished
    hub.Register.StartupHook("End", runTypeset);
  });
}

/** Hide inactive categories without display:none — MathJax output breaks when toggled back from d-none. */
export const INACTIVE_CATEGORY_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  visibility: "hidden",
  pointerEvents: "none",
  overflow: "hidden",
};

export const ACTIVE_CATEGORY_STYLE: React.CSSProperties = {
  position: "relative",
  visibility: "visible",
  pointerEvents: "auto",
};
