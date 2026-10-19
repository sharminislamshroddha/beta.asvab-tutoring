/**
 * Converts any YouTube watch/share URL (including m.youtube.com) into an
 * embeddable www.youtube.com/embed URL. Returns "" when conversion fails.
 */
export function getYouTubeEmbedUrl(url: string): string {
  const trimmed = url?.trim();
  if (!trimmed) return "";

  if (
    trimmed.includes("youtube.com/embed/") ||
    trimmed.includes("youtube-nocookie.com/embed/")
  ) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.slice(1).split("/")[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    const vParam = parsed.searchParams.get("v");
    if (vParam) return `https://www.youtube.com/embed/${vParam}`;

    const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?]+)/);
    if (shortsMatch?.[1]) {
      return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    }

    const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch?.[1]) {
      return `https://www.youtube.com/embed/${embedMatch[1]}`;
    }
  } catch {
    // Fall through to regex below.
  }

  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|\/shorts\/)([^#&?/]*).*/;
  const match = trimmed.match(regExp);
  if (match?.[2]) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }

  return "";
}
