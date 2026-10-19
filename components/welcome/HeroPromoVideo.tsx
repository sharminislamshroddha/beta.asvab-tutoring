"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Click-to-play hero video: only the poster loads initially so the 11MB MP4
 * does not compete with LCP. The <source> mounts after the user presses play.
 */
export default function HeroPromoVideo() {
  const [playing, setPlaying] = useState(false);

  if (!playing) {
    return (
      <div className="mt-4 bg-white rounded shadow p-2 overflow-hidden">
        <button
          type="button"
          className="hero-video-poster-btn position-relative w-100 border-0 p-0 bg-transparent rounded overflow-hidden"
          onClick={() => setPlaying(true)}
          aria-label="Play ASVAB Tutoring promo video"
        >
          <Image
            src="/images/asvab-video-poster.webp"
            alt="ASVAB Tutoring promotional video"
            width={620}
            height={370}
            priority
            fetchPriority="high"
            sizes="(max-width: 991.98px) 100vw, 540px"
            className="w-100 rounded d-block"
            style={{ objectFit: "cover", height: "auto", maxWidth: "100%" }}
          />
          <span className="hero-video-play-icon" aria-hidden>
            <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
              <circle cx="34" cy="34" r="34" fill="rgba(0,0,0,0.55)" />
              <path d="M28 22v24l20-12-20-12z" fill="#fff" />
            </svg>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-white rounded shadow p-2 overflow-hidden">
      <video
        controls
        autoPlay
        playsInline
        preload="none"
        poster="/images/asvab-video-poster.webp"
        className="w-100 rounded d-block"
        style={{ objectFit: "cover" }}
      >
        <source src="/videos/ASVAB-Promo-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
