/**
 * Cleans HTML and special characters from question text.
 */
export function cleanQuestionText(input: string, keepMathDelimiters = false): string {
  if (!input) return "";
  if (typeof window === "undefined") return input; // SSR fallback

  const txt = document.createElement("textarea");
  let decoded = input;
  let prev;
  do {
    prev = decoded;
    txt.innerHTML = decoded;
    decoded = txt.value;
  } while (decoded !== prev);

  decoded = decoded.replace(/<[^>]*>/g, "");
  if (!keepMathDelimiters) {
    decoded = decoded.replace(/\\\(|\\\)/g, "");
  }
  decoded = decoded.replace(/\^(\d+)\/_({?)(\d+)(}?)/g, "$1/$3");
  return decoded.trim();
}
