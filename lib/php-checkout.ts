import { parseIsVariant } from "@/lib/package-utils";
import { parsePhpJsonText } from "@/lib/php-json";

export type PhpCheckoutJson = {
  status?: number;
  isSuccess?: boolean;
  ok?: boolean;
  error?: string;
  message?: string;
  code?: string;
  course_id?: number | string;
  course_id_raw?: number | string;
  course_id_source?: string;
};

function getPhpCheckoutUrl(): string {
  return (
    process.env.NEXT_PUBLIC_PHP_API_URL ||
    process.env.PHP_API_URL ||
    ""
  ).trim();
}

export async function postPhpCheckout(
  action: string,
  params: Record<string, string>,
): Promise<{ httpOk: boolean; data: PhpCheckoutJson | null }> {
  const phpUrl = getPhpCheckoutUrl();
  const phpSecret = (process.env.INTERNAL_API_SECRET || "").trim();

  if (!phpUrl) {
    return { httpOk: false, data: null };
  }

  const form = new URLSearchParams({ action, ...params });
  const res = await fetch(phpUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/plain, */*",
      ...(phpSecret ? { "X-ASVAB-SECRET": phpSecret } : {}),
    },
    body: form.toString(),
    cache: "no-store",
  });

  const raw = await res.text();
  const data = parsePhpJsonText<PhpCheckoutJson>(raw);

  return { httpOk: res.ok, data };
}

export async function validateCheckoutCourseId(args: {
  course_id: string;
  session_id?: string;
  package_id?: string;
  is_variant?: unknown;
}): Promise<
  | { ok: true; course_id: number; source: string }
  | { ok: false; message: string }
> {
  const { httpOk, data } = await postPhpCheckout("validate-course-id", {
    course_id: String(args.course_id || "").trim(),
    session_id: String(args.session_id || "").trim(),
    package_id: String(args.package_id || "").trim(),
    is_variant: String(parseIsVariant(args.is_variant)),
  });

  const mapped = Number(data?.course_id || 0);
  if (httpOk && data?.isSuccess === true && mapped > 0) {
    return {
      ok: true,
      course_id: mapped,
      source: String(data.course_id_source || "posted"),
    };
  }

  return {
    ok: false,
    message:
      data?.error === "course_id"
        ? "Invalid course_id."
        : data?.message ||
          "Course ID is required. Please return to the course page and try again.",
  };
}

export async function checkoutEmailAlreadyRegistered(
  email: string,
): Promise<boolean | null> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return null;

  const { data } = await postPhpCheckout("check-email", { email: trimmed });
  if (!data) return null;

  if (data.code === "EMAIL_EXISTS" || data.status === 409) return true;
  if (data.isSuccess === true) return false;
  return null;
}
