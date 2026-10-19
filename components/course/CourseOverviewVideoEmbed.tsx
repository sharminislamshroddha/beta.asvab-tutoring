"use client";

import { useEffect, useState } from "react";
import type { CourseOverviewVideo } from "@/lib/php-api";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import styles from "./CourseOverviewVideoEmbed.module.css";

type Props = {
  video: CourseOverviewVideo;
  fallbackImageSrc?: string;
  fallbackImageAlt?: string;
  className?: string;
};

function resolveEmbedUrl(
  video: CourseOverviewVideo,
  isMobile: boolean,
): string {
  const primaryLink = isMobile
    ? video.mobile_youtube_link
    : video.desktop_youtube_link;
  const fallbackLink = isMobile
    ? video.desktop_youtube_link
    : video.mobile_youtube_link;

  return getYouTubeEmbedUrl(primaryLink) || getYouTubeEmbedUrl(fallbackLink);
}

export default function CourseOverviewVideoEmbed({
  video,
  fallbackImageSrc,
  fallbackImageAlt = "Course overview",
  className = "mb-4 text-center",
}: Props) {
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    // Mount the iframe only after layout so YouTube measures a real-sized box
    // and picks a full-res thumbnail (SSR/hidden 0×0 boxes cause blurry posters).
    const frameId = requestAnimationFrame(() => setReady(true));
    window.addEventListener("resize", checkMobile);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const embedUrl = resolveEmbedUrl(video, isMobile);
  const posterSrc = video.thumbnail?.trim() || fallbackImageSrc;

  if (ready && embedUrl) {
    return (
      <div className={`${className} ${styles.wrapper}`}>
        <div className={styles.frame}>
          <iframe
            className={styles.iframe}
            src={embedUrl}
            title="Course Overview Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (posterSrc) {
    return (
      <div className={`${className} ${styles.wrapper}`}>
        <div className={styles.frame}>
          <img
            src={posterSrc}
            alt={fallbackImageAlt}
            className={styles.poster}
            width={800}
            height={450}
          />
        </div>
      </div>
    );
  }

  // Reserve layout space until the client iframe mounts.
  if (embedUrl) {
    return (
      <div className={`${className} ${styles.wrapper}`}>
        <div className={styles.frame} aria-hidden />
      </div>
    );
  }

  return null;
}
