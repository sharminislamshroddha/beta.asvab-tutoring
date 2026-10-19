/**
 * Browser-safe PHP calls via same-origin `/api/php` BFF.
 * Use this instead of fetching NEXT_PUBLIC_PHP_API_URL from client components.
 * Temporary solution until we fix nginx/imunity 415 error.
 */
import { parsePhpJsonText } from "@/lib/php-json";

export async function postPhpBrowser(
  body: Record<string, string>,
): Promise<unknown> {
  const res = await fetch("/api/php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  const parsed = parsePhpJsonText(text);
  if (parsed == null) {
    throw new Error("Invalid server response (not JSON).");
  }
  return parsed;
}
