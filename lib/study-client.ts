"use client";

import type { StudyErrorCode, StudyResult } from "@/lib/study-types";

/** Browser -> /api/study (same-origin BFF for the student-* PHP actions). */
export async function studyRequest(
  action: string,
  params: Record<string, string | number> = {},
): Promise<StudyResult<Record<string, unknown>>> {
  try {
    const res = await fetch("/api/study", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);

    if (res.ok && json?.ok) {
      return { ok: true, data: (json.data ?? {}) as Record<string, unknown> };
    }

    const code = (json?.code as StudyErrorCode) || "unknown";
    if (code === "invalid_token" && typeof window !== "undefined") {
      window.location.href = "/user-login";
    }
    return {
      ok: false,
      status: res.status,
      code,
      message: String(json?.message || "Something went wrong. Please try again."),
    };
  } catch {
    return {
      ok: false,
      status: 0,
      code: "unknown",
      message: "You appear to be offline. Check your connection and try again.",
    };
  }
}
