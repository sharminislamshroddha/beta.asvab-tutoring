"use client";

import React, { useEffect, useMemo, useState } from "react";
import embedStyles from "@/components/course/CourseOverviewVideoEmbed.module.css";
import styles from "./FreeLessonVideosTab.module.css";

export interface VideoObject {
  video_title?: string | string[];
  video_link?: string | string[];
  thumb_pic?: string | string[];
}

interface VideoTabProps {
  video?: VideoObject;
}

const INITIAL_VIDEO_COUNT = 5;
const LOAD_MORE_COUNT = 5;

function isValidVideoLink(link: string): boolean {
  const trimmed = link.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== "none";
}

export function parseVideoLinks(video?: VideoObject): string[] {
  if (!video) return [];

  if (typeof video.video_link === "string") {
    return video.video_link
      .split(",")
      .map((x) => x.trim())
      .filter(isValidVideoLink);
  }

  if (Array.isArray(video.video_link)) {
    return video.video_link
      .map((x) => String(x).trim())
      .filter(isValidVideoLink);
  }

  if (Array.isArray(video)) {
    return (video as string[])
      .map((x) => String(x).trim())
      .filter(isValidVideoLink);
  }

  return [];
}

export function hasFreeLessonVideos(video?: VideoObject): boolean {
  return parseVideoLinks(video).length > 0;
}

const FreeLessonVideosTab: React.FC<VideoTabProps> = ({ video }) => {
  const videoArray = useMemo(() => parseVideoLinks(video), [video]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VIDEO_COUNT);

  useEffect(() => {
    setVisibleCount(INITIAL_VIDEO_COUNT);
  }, [video]);

  if (videoArray.length === 0) {
    return (
      <div className="instructor-content">
        <div className="row">
          <div
            className="col-12 text-center"
            style={{
              padding: "40px 20px",
              color: "#6c757d",
              fontSize: "1.1rem",
            }}
          >
            <p>No video available to view at the moment.</p>
          </div>
        </div>
      </div>
    );
  }

  const visibleVideos = videoArray.slice(0, visibleCount);
  const allVideosVisible = visibleCount >= videoArray.length;
  const showToggleButton = videoArray.length > INITIAL_VIDEO_COUNT;

  const handleToggleVideos = () => {
    if (allVideosVisible) {
      setVisibleCount(INITIAL_VIDEO_COUNT);
      return;
    }

    setVisibleCount((count) =>
      Math.min(count + LOAD_MORE_COUNT, videoArray.length),
    );
  };

  return (
    <div className="instructor-content">
      <div className="row">
        {visibleVideos.map((url, index) => (
          <div key={`${url}-${index}`} className="col-12 mb-4">
            <div className={`${embedStyles.card} ${embedStyles.wrapper}`}>
              <div className={embedStyles.frame}>
                <iframe
                  className={embedStyles.iframe}
                  src={url}
                  title={`Free lesson video player ${index + 1}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {showToggleButton && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleToggleVideos}
          >
            {allVideosVisible ? (
              <>
                <i className="bi bi-chevron-up" aria-hidden />
                Show less videos
              </>
            ) : (
              <>
                <i className="bi bi-chevron-down" aria-hidden />
                Watch more videos
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default FreeLessonVideosTab;