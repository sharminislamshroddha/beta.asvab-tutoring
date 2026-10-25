import { NextRequest, NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth-session";
import { callStudyAction, STUDY_ACTIONS } from "@/lib/study-api";
import { asRecord, STUDY_LAST_TEST_COOKIE } from "@/lib/study-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Open tests must not reveal the correct answer to the browser. */
const OPEN_TEST_ACTIONS: Record<string, string> = {
  "student-practice-questions": "practicetest",
  "student-prediction-questions": "question_test",
};

function stripAnswers(list: unknown): unknown {
  if (Array.isArray(list)) {
    return list.map((row) => {
      const rest = { ...asRecord(row) };
      delete rest.answer;
      return rest;
    });
  }
  // Section-keyed dictionary (SHSAT ELA)
  const rec = asRecord(list);
  return Object.fromEntries(
    Object.entries(rec).map(([key, value]) => [key, stripAnswers(value)]),
  );
}

/**
 * Same-origin BFF for the /study area: the browser never sees the auth token,
 * it is read from the signed session cookie here.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_token",
        message: "Please log in to continue.",
      },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = asRecord(await req.json());
  } catch {
    return NextResponse.json(
      { ok: false, code: "unknown", message: "Invalid request." },
      { status: 400 },
    );
  }

  const action = String(body.action ?? "").trim();
  if (!STUDY_ACTIONS.has(action)) {
    return NextResponse.json(
      { ok: false, code: "unknown", message: "Action not allowed." },
      { status: 403 },
    );
  }

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "action" || key === "auth_token" || value == null) continue;
    if (typeof value === "object") continue;
    params[key] = String(value);
  }

  // Error reports end up in an HTML email and the admin panel
  if (action === "student-report-error") {
    for (const key of ["message", "from_page"]) {
      params[key] = (params[key] ?? "")
        .slice(0, 2000)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
    if (!params.message.trim()) {
      return NextResponse.json(
        { ok: false, code: "unknown", message: "Please describe the problem." },
        { status: 400 },
      );
    }
  }

  const result = await callStudyAction(action, params, session.auth_token);

  if (!result.ok) {
    if (result.code === "invalid_token") await clearSession();
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: result.status },
    );
  }

  let data = result.data;
  const questionKey = OPEN_TEST_ACTIONS[action];
  if (questionKey && questionKey in data) {
    data = { ...data, [questionKey]: stripAnswers(data[questionKey]) };
  }

  const response = NextResponse.json(
    { ok: true, data },
    { headers: { "Cache-Control": "no-store" } },
  );

  // Remember the test answered last, for the dashboard's Continue button
  const lastTest =
    action === "student-practice-answer" && Number(params.lesson_id) > 0
      ? `practice:${Number(params.lesson_id)}`
      : action === "student-prediction-answer" &&
          Number(params.pred_test_id) > 0
        ? `prediction:${Number(params.pred_test_id)}`
        : "";
  if (lastTest) {
    response.cookies.set(STUDY_LAST_TEST_COOKIE, lastTest, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return response;
}
