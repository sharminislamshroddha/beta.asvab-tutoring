import { decodeHtmlEntitiesDeep } from "@/lib/decode-html";

export function cleanFeatureText(input: string): string {
  if (!input) return "";
  let decoded = decodeHtmlEntitiesDeep(input);

  decoded = decoded
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<h[1-6][^>]*>/gi, "")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "\t")
    .replace(/<\/th>/gi, "\t")
    .replace(/<[^>]*>/g, "")
    .replace(/\\\(|\\\)/g, "")
    .replace(/\^(\d+)\/_({?)(\d+)(}?)/g, "$1/$3");

  decoded = decodeHtmlEntitiesDeep(decoded);
  return decoded.trim();
}

export function splitFeatureLines(text: string): string[] {
  return cleanFeatureText(text)
    .split(/\r?\n/)
    .map((line) => line.replace(/^•\s*/, "").trim())
    .filter(Boolean);
}
