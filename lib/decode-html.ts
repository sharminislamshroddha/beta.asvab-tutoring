import he from "he";
import { normalizeCKEditorMath } from "@/lib/normalize-math";

const RESOURCES_BASE =
  process.env.NEXT_PUBLIC_RESOURCES_URL?.replace(/\/$/, "") ||
  "https://test-prep.asvab-tutoring.com";

/** Turn root-relative upload paths into absolute test-prep URLs for img/link tags. */
export function rewriteRelativeUploadUrls(html: string): string {
  if (!html) return "";

  return html.replace(
    /(\s(?:src|href)=)(["'])(\/(?:practice-test\/)?uploads\/[^"']*)\2/gi,
    (_, attr, quote, path) => `${attr}${quote}${RESOURCES_BASE}${path}${quote}`,
  );
}

/** Decode HTML entities for safe use in dangerouslySetInnerHTML (server or client). */
export function decodeHtml(html: string): string {
  if (!html) return "";
  return he.decode(html);
}

/** Decode repeatedly until stable (handles double-encoded API content). */
export function decodeHtmlEntitiesDeep(input: string, maxPasses = 6): string {
  if (!input) return "";
  let prev = "";
  let cur = input;
  for (let i = 0; i < maxPasses && cur !== prev; i++) {
    prev = cur;
    cur = he.decode(cur);
  }
  return cur;
}

/** Strip HTML tags and collapse whitespace for excerpts. */
export function stripHtmlToText(html: string): string {
  const decoded = decodeHtmlEntitiesDeep(html || "");
  const text = decoded
    .replace(/<[^>]*>/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

/** Prepare API HTML for dangerouslySetInnerHTML. */
export function processHtmlContent(htmlString: string): string {
  if (!htmlString) return "";
  return decodeHtmlEntitiesDeep(htmlString);
}

/** Prepare question/option HTML for MathJax (entity decode + CKEditor math cleanup). */
export function processQuestionHtml(htmlString: string): string {
  if (!htmlString) return "";
  const decoded = decodeHtmlEntitiesDeep(htmlString);
  const withAbsoluteUrls = rewriteRelativeUploadUrls(decoded);
  return normalizeCKEditorMath(withAbsoluteUrls);
}
