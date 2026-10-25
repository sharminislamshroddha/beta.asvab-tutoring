"use client";

import { useState } from "react";
import type { StudyVideo } from "@/lib/study-types";
import styles from "./study.module.css";

/** Lesson videos laid out like a YouTube watch page: player, title, playlist. */
export default function LessonVideos({ videos }: { videos: StudyVideo[] }) {
  const [current, setCurrent] = useState(0);
  // Only start playing on its own once the student picked a video
  const [picked, setPicked] = useState(false);
  const video = videos[current];
  if (!video) return null;

  const open = (i: number) => {
    setCurrent(Math.max(0, Math.min(i, videos.length - 1)));
    setPicked(true);
  };
  const title = (v: StudyVideo, i: number) => v.title || `Video ${i + 1}`;
  const watchUrl = video.youtubeId
    ? `https://www.youtube.com/watch?v=${video.youtubeId}`
    : video.url;

  return (
    <div
      className={`${styles.watch} ${videos.length > 1 ? styles.watchWithList : ""}`}
    >
      <div className={styles.watchMain}>
        <div className={styles.videoFrame}>
          {video.youtubeId ? (
            <iframe
              key={video.youtubeId}
              src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&modestbranding=1${
                picked ? "&autoplay=1" : ""
              }`}
              title={title(video, current)}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              // YouTube refuses to play without knowing the embedding site
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div
              className="h-100 d-grid text-white"
              style={{ placeItems: "center" }}
            >
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnPrimary}
              >
                Open video
              </a>
            </div>
          )}
        </div>

        <h2 className={styles.watchTitle}>{title(video, current)}</h2>
        <div className={styles.watchMeta}>
          <span className={styles.watchCount}>
            {videos.length > 1
              ? `Video ${current + 1} of ${videos.length}`
              : "Lesson video"}
          </span>
          <div className={styles.watchActions}>
            {videos.length > 1 && (
              <>
                <button
                  type="button"
                  className={styles.watchButton}
                  onClick={() => open(current - 1)}
                  disabled={current === 0}
                >
                  <i className="bi bi-skip-start-fill" aria-hidden="true" />{" "}
                  Previous
                </button>
                <button
                  type="button"
                  className={styles.watchButton}
                  onClick={() => open(current + 1)}
                  disabled={current === videos.length - 1}
                >
                  Next <i className="bi bi-skip-end-fill" aria-hidden="true" />
                </button>
              </>
            )}
            {watchUrl && (
              <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.watchButton}
              >
                <i className="bi bi-youtube" aria-hidden="true" /> Watch on
                YouTube
              </a>
            )}
          </div>
        </div>
      </div>

      {videos.length > 1 && (
        <aside className={styles.playlist} aria-label="Lesson videos">
          <div className={styles.playlistHead}>
            <span className={styles.playlistTitle}>Lesson videos</span>
            <span className={styles.playlistCount}>
              {current + 1} / {videos.length}
            </span>
          </div>
          <ol className={styles.playlistItems}>
            {videos.map((v, i) => (
              <li key={`${v.url}-${i}`}>
                <button
                  type="button"
                  className={`${styles.playlistItem} ${i === current ? styles.playlistItemActive : ""}`}
                  aria-current={i === current ? "true" : undefined}
                  onClick={() => open(i)}
                >
                  <span className={styles.playlistIndex} aria-hidden="true">
                    {i === current ? <i className="bi bi-play-fill" /> : i + 1}
                  </span>
                  <span className={styles.playlistThumb}>
                    {v.youtubeId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <i className="bi bi-play-circle" aria-hidden="true" />
                    )}
                    {i === current && (
                      <span className={styles.playlistNow}>Now playing</span>
                    )}
                  </span>
                  <span className={styles.playlistText}>
                    <span className={styles.playlistName}>{title(v, i)}</span>
                    <span className={styles.playlistMeta}>Video {i + 1}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  );
}
