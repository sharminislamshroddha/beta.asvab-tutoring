/**
 * Sanitizes mobile input to digits only (max 10).
 * Returns null when the change should be ignored — e.g. typing another digit
 * while already at max length — so the controlled input keeps cursor position.
 */
export function sanitizeMobileInput(
  rawValue: string,
  previousValue: string,
): string | null {
  const cleaned = rawValue.replace(/\D/g, "");
  const prev = previousValue.replace(/\D/g, "");

  if (prev.length >= 10 && cleaned.length > prev.length) {
    return null;
  }

  return cleaned.slice(0, 10);
}
