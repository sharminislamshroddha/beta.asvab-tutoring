"use client";

import { useState } from "react";
import type { StudyVideo } from "@/lib/study-types";
import styles from "./study.module.css";

export default function LessonVideos({ videos }: { videos: StudyVideo[] }) {
  const [current, setCurrent] = useState(0);
  const video = videos[current];
  if (!video) return null;

  return (
    <div className="row g-3">
      <div className={videos.length > 1 ? "col-lg-8" : "col-12"}>
        <div className={styles.card}>
          <div className={styles.videoFrame}>
            {video.youtubeId ? (
              <iframe
                key={video.youtubeId}
                src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
                title={video.title || "Lesson video"}
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="h-100 d-grid text-white" style={{ placeItems: "center" }}>
                <a href={video.url} target="_blank" rel="noopener noreferrer" className={styles.btnPrimary}>
                  Open video
                </a>
              </div>
            )}
          </div>
          {video.title && <h2 className={`${styles.cardTitle} mt-3 mb-0`}>{video.title}</h2>}
        </div>
      </div>

      {videos.length > 1 && (
        <div className="col-lg-4">
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <i className="bi bi-collection-play" aria-hidden="true" /> {videos.length} videos
            </h2>
            <ul className={styles.lessonList}>
              {videos.map((v, i) => (
                <li key={`${v.url}-${i}`}>
                  <button
                    type="button"
                    className={`${styles.lessonRow} w-100 text-start`}
                    style={i === current ? { borderColor: "#e58a34", background: "#fff8f0" } : undefined}
                    aria-current={i === current ? "true" : undefined}
                    onClick={() => setCurrent(i)}
                  >
                    {v.youtubeId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                        alt=""
                        width={96}
                        height={54}
                        style={{ borderRadius: 6, objectFit: "cover", flex: "0 0 auto" }}
                        loading="lazy"
                      />
                    ) : (
                      <i className="bi bi-play-circle fs-3" aria-hidden="true" />
                    )}
                    <span className={styles.tileName} style={{ fontSize: "0.9rem" }}>
                      {v.title || `Video ${i + 1}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
