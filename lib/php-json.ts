function tryParse<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

/**
 * PHP sometimes prepends debug SQL / notices before the JSON payload.
 * Accept a clean object or array first. If that fails, walk `{` / `[`
 * markers in order and keep the earliest value that parses.
 *
 * Top-level arrays (for example `get-state-list`) must stay arrays.
 * Slicing only `{...}` turns `[{...},{...}]` into invalid JSON and drops the list.
 */
export function parsePhpJsonText<T = unknown>(raw: string): T | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  const direct = tryParse<T>(text);
  if (direct !== undefined) return direct;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "{" && ch !== "[") continue;

    const fromHere = tryParse<T>(text.slice(i));
    if (fromHere !== undefined) return fromHere;

    const closer = ch === "{" ? "}" : "]";
    const end = text.lastIndexOf(closer);
    if (end > i) {
      const sliced = tryParse<T>(text.slice(i, end + 1));
      if (sliced !== undefined) return sliced;
    }
  }

  return null;
}
