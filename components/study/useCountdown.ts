"use client";

import { useEffect, useState } from "react";

/** Seconds left from `minutes`, counting down once started (web portal: no auto-submit). */
export function useCountdown(minutes: number, running: boolean) {
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, Math.round(minutes * 60)));

  useEffect(() => {
    setSecondsLeft(Math.max(0, Math.round(minutes * 60)));
  }, [minutes]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  return { secondsLeft, label: `${mm}:${ss}`, expired: secondsLeft === 0 };
}
