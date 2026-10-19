"use client";

import { useEffect, useState } from "react";
import styles from "./study.module.css";

const MOBILE_QUERY = "(max-width: 768px)";

/** Desktop (landscape) or mobile (portrait) overview video, chosen once on load. */
export default function CourseOverviewVideo({
  desktopId,
  mobileId,
}: {
  desktopId: string | null;
  mobileId: string | null;
}) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const isMobile = window.matchMedia(MOBILE_QUERY).matches;
    const useMobile = isMobile && Boolean(mobileId);
    setVideoId(useMobile ? mobileId : desktopId || mobileId);
    setPortrait(useMobile);
  }, [desktopId, mobileId]);

  return (
    <div className={`${styles.videoFrame} ${portrait ? styles.videoFramePortrait : ""}`}>
      {videoId && (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
          title="Course overview video"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      )}
    </div>
  );
}
