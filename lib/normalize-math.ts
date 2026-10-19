/**
 * Normalize CKEditor / legacy math markup so MathJax can typeset question content.
 * Expects HTML that has already been entity-decoded (see processQuestionHtml).
 */
export function normalizeCKEditorMath(input: string): string {
  if (!input) return "";

  let result = input;

  // Unwrap CKEditor math plugin spans — delimiters work as plain text nodes.
  result = result.replace(
    /<span\s+class=['"]math-tex['"][^>]*>([\s\S]*?)<\/span>/gi,
    "$1",
  );

  // Non-breaking spaces inside or around math break delimiter detection.
  result = result.replace(/&nbsp;/gi, " ").replace(/\u00A0/g, " ");

  // Corrupted closing delimiter: \) became \l) in some legacy rows.
  result = result.replace(/\\l\)/g, "\\)");

  // Corrupted closing delimiter inside inline math: \(30l) → \(30\)
  result = result.replace(/(\\\([^\\]*?)([\d.,]+)l\)/g, "$1$2\\)");

  // Defensive: double-escaped delimiters after entity decode.
  result = result.replace(/\\\\\(/g, "\\(").replace(/\\\\\)/g, "\\)");

  // CKEditor fraction shorthand (see utils/textUtils.ts).
  result = result.replace(/\^(\d+)\/_({?)(\d+)(}?)/g, "$1/$3");

  return result;
}
