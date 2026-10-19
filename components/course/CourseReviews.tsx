"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Carousel } from "react-bootstrap";
import type { UserFeedback } from "@/lib/course-types";
import { shuffleArray } from "@/lib/course-types";
import styles from "./CourseReviews.module.css";

const COURSE_REVIEW_LIMIT = 10;

type CourseReviewsProps = {
  reviews: UserFeedback[];
  courseName?: string;
  /** Show each review's course name (for mixed/homepage review carousels). */
  showCourseName?: boolean;
  /**
   * Cap displayed reviews (default 10). When over the limit, a random subset
   * is chosen on each client mount / page reload.
   */
  maxReviews?: number;
};

function parseRating(rating: string | number | undefined): number {
  if (rating == null || rating === "") return 0;
  const value = typeof rating === "number" ? rating : Number(rating);
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(5, Math.round(value)));
}

function formatReviewDate(value?: string): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function filterValidReviews(reviews: readonly UserFeedback[]): UserFeedback[] {
  return reviews.filter(
    (review) => review.feedback?.trim() && review.user_name?.trim(),
  );
}

/** Deterministic pick for SSR/hydration — always present in initial HTML. */
function pickReviewsStable(
  reviews: readonly UserFeedback[],
  maxReviews: number,
): UserFeedback[] {
  return filterValidReviews(reviews).slice(0, maxReviews);
}

function pickReviewsShuffled(
  reviews: readonly UserFeedback[],
  maxReviews: number,
): UserFeedback[] {
  const valid = filterValidReviews(reviews);
  if (valid.length <= maxReviews) return valid;
  return shuffleArray(valid).slice(0, maxReviews);
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className={styles.stars}
      aria-label={`${rating} out of 5 stars`}
      title={`${rating} out of 5`}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < rating;
        return (
          <i
            key={index}
            className={`bi ${filled ? "bi-star-fill" : "bi-star"} ${styles.star}`}
            aria-hidden
          />
        );
      })}
    </div>
  );
}

function ReviewText({ text, active }: { text: string; active: boolean }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const measure = () => {
      if (expanded || !active) return;
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded, active]);

  useEffect(() => {
    if (!active) setExpanded(false);
  }, [active]);

  return (
    <div className={styles.textBlock}>
      <p
        ref={textRef}
        className={`testimonial-text ${styles.text} ${
          expanded ? styles.textExpanded : styles.textClamped
        }`}
      >
        {text}
      </p>
      <div className={styles.textActions}>
        {overflows || expanded ? (
          <button
            type="button"
            className={styles.readMore}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Show less" : "read more..."}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function CourseReviews({
  reviews,
  courseName,
  showCourseName = false,
  maxReviews = COURSE_REVIEW_LIMIT,
}: CourseReviewsProps) {
  const [index, setIndex] = useState(0);
  const [visibleReviews, setVisibleReviews] = useState<UserFeedback[]>(() =>
    pickReviewsStable(reviews, maxReviews),
  );

  useEffect(() => {
    // Reshuffle after mount when over the limit; stable slice already SSR'd.
    setVisibleReviews(pickReviewsShuffled(reviews, maxReviews));
    setIndex(0);
  }, [reviews, maxReviews]);

  if (!visibleReviews.length) return null;

  const heading = courseName?.trim()
    ? `${courseName.trim()} Student Reviews`
    : "Student Reviews";

  const handleSelect = (selectedIndex: number) => {
    setIndex(selectedIndex);
  };

  const goToPrev = () => {
    setIndex(
      (current) =>
        (current - 1 + visibleReviews.length) % visibleReviews.length,
    );
  };

  const goToNext = () => {
    setIndex((current) => (current + 1) % visibleReviews.length);
  };

  const showNav = visibleReviews.length > 1;

  return (
    <section
      className="testimonial-section text-center py-5"
      aria-labelledby="course-reviews-heading"
    >
      <Image
        src="/images/review_bg-1.jpg"
        alt=""
        fill
        loading="lazy"
        sizes="100vw"
        className="testimonial-section-bg"
        quality={60}
      />
      <div className={`container ${styles.container}`}>
        <h2
          id="course-reviews-heading"
          className="display-6 fw-bold text-gray-800 d-inline-block pb-3 position-relative"
        >
          {heading}
          <img
            src="/images/border_v1.png"
            alt=""
            width={160}
            height={8}
            className="position-absolute bottom-0 start-50 translate-middle-x"
            style={{ objectFit: "cover" }}
            loading="lazy"
            decoding="async"
          />
        </h2>

        <div className={`position-relative mt-5 ${styles.sliderWrapper}`}>
          {showNav ? (
            <>
              <button
                type="button"
                className={`${styles.navButton} ${styles.navPrev}`}
                aria-label="Previous review"
                onClick={goToPrev}
              >
                <i className="bi bi-chevron-left" aria-hidden />
              </button>
              <button
                type="button"
                className={`${styles.navButton} ${styles.navNext}`}
                aria-label="Next review"
                onClick={goToNext}
              >
                <i className="bi bi-chevron-right" aria-hidden />
              </button>
            </>
          ) : null}

          <Carousel
            activeIndex={index}
            onSelect={handleSelect}
            interval={2000}
            pause="hover"
            slide
            controls={false}
            indicators={false}
            className={styles.carousel}
          >
            {visibleReviews.map((review, reviewIndex) => {
              const rating = parseRating(review.rating);
              const dateLabel = formatReviewDate(review.created_at);
              const name = review.user_name.trim();
              const text = review.feedback.trim();
              const reviewCourseName = review.course_name?.trim();

              return (
                <Carousel.Item key={review.feedback_id}>
                  <div className="p-4 px-md-5">
                    <i
                      className="bi bi-quote fs-1 primary-color-custom"
                      aria-hidden
                    />
                    {rating > 0 ? <StarRating rating={rating} /> : null}
                    <ReviewText text={text} active={reviewIndex === index} />
                    <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
                      <div className={styles.avatar} aria-hidden>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.author}>
                        <span className="fw-semibold">{name}</span>
                        {showCourseName && reviewCourseName ? (
                          <span className={styles.courseName}>
                            {reviewCourseName}
                          </span>
                        ) : null}
                        {dateLabel ? (
                          <time
                            className={styles.date}
                            dateTime={review.created_at}
                          >
                            {dateLabel}
                          </time>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Carousel.Item>
              );
            })}
          </Carousel>
        </div>

        {showNav ? (
          <div className="d-flex justify-content-center gap-2 mt-3">
            {visibleReviews.map((review, idx) => (
              <button
                key={review.feedback_id}
                type="button"
                aria-label={`Go to review ${idx + 1}`}
                aria-current={idx === index ? "true" : undefined}
                className={`rounded-circle border-0 ${
                  idx === index ? "bg-custom-primary" : "bg-secondary opacity-50"
                }`}
                style={{ width: "12px", height: "12px", cursor: "pointer" }}
                onClick={() => handleSelect(idx)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
