"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "./topcourses.css";
import type { NavCourse } from "@/lib/php-api";

/**
 * Decode HTML entities (named + numeric) into their character equivalents.
 * Works on server & client without DOM.
 */
const decodeHtmlEntities = (input: string): string => {
  if (!input) return "";

  const namedMap: Record<string, string> = {
    nbsp: " ",
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
  };

  let s = input.replace(/&([a-zA-Z]+);/g, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(namedMap, name))
      return namedMap[name];
    return match;
  });

  s = s.replace(/&#(\d+);/g, (_match, dec) => {
    try {
      return String.fromCharCode(Number(dec));
    } catch {
      return "";
    }
  });

  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return "";
    }
  });

  return s;
};

const stripHtmlTags = (str: string): string =>
  str ? str.replace(/<[^>]*>/g, "") : "";

const cleanWhitespace = (str: string): string =>
  (str || "")
    .replace(/\r\n|\n|\r|\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getPlainTextPreview = (htmlString: string, maxLength = 100): string => {
  if (!htmlString) return "No description available";

  try {
    let s = htmlString;

    for (let i = 0; i < 3; i += 1) {
      s = decodeHtmlEntities(s);
      s = stripHtmlTags(s);
    }

    s = decodeHtmlEntities(s);
    s = cleanWhitespace(s);

    if (!s) return "No description available";

    if (s.length > maxLength) {
      const truncated = s.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(" ");
      if (lastSpace > Math.floor(maxLength * 0.6)) {
        s = truncated.substring(0, lastSpace) + "...";
      } else {
        s = truncated + "...";
      }
    }

    return s;
  } catch {
    return "Description unavailable";
  }
};

const resolveImageUrl = (path?: string): string => {
  if (!path) return "/images/asvab-courses-d.jpg";

  const cleaned = path.trim();

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  return `${process.env.NEXT_PUBLIC_RESOURCES_URL}/${encodeURI(cleaned)}`;
};

const CourseCard = ({ course }: { course: NavCourse }) => {
  const courseHref = `/courses/${encodeURIComponent(course.course_code)}`;

  return (
    <div className="card h-100 shadow-sm hover-lift mb-2 d-flex flex-column course-card">
      <Link
        href={courseHref}
        className="text-decoration-none text-dark d-flex flex-column flex-grow-1"
      >
        <img
          src={resolveImageUrl(course.image_src)}
          alt={course.name || "Course"}
          className="card-img-top course-card-img"
          width={300}
          height={210}
          loading="lazy"
          decoding="async"
        />
        <div className="card-body d-flex flex-column flex-grow-1 pb-2">
          <h5 className="card-title fw-semibold text-dark text-center">
            <span className="course-name">{course.name}</span>
            <br />
            <span className="course-full-form">{course.full_form}</span>
          </h5>
          <p className="card-text small text-dark flex-grow-1 mb-0">
            {getPlainTextPreview(course.details ?? "", 100)}
          </p>
        </div>
      </Link>
      <div className="text-center px-3 pb-3 course-card-footer">
        <Link
          href={courseHref}
          className="btn btn-secondary-custom btn-sm"
          style={{ minWidth: "7rem" }}
        >
          LEARN MORE
        </Link>
      </div>
    </div>
  );
};

type Props = {
  initialCourses?: NavCourse[];
};

export default function TopCourses({ initialCourses = [] }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section id="top-courses" className="text-white pt-5 pb-4 px-3">
      <div className="text-center mb-5 position-relative">
        <h2 className="fw-bold display-6 d-inline-block pb-3 position-relative">
          Our Courses
          <img
            src="/images/border_v1.png"
            alt="underline"
            width={160}
            height={8}
            className="position-absolute start-50 translate-middle-x bottom-0"
            style={{ objectFit: "cover" }}
            loading="lazy"
            decoding="async"
          />
        </h2>
      </div>

      <div className="container">
        {initialCourses.length === 0 ? (
          <p className="text-center">No courses available.</p>
        ) : (
          <>
            {/*
              Static cards stay in the HTML for crawlers. After mount, hide on
              desktop so the Swiper carousel can take over.
            */}
            <div className={mounted ? "d-block d-lg-none" : undefined}>
              <div className="row g-4 pb-3">
                {initialCourses.map((course) => (
                  <div className="col-12 col-lg-4" key={course.course_id}>
                    <CourseCard course={course} />
                  </div>
                ))}
              </div>
            </div>

            {mounted && (
              <div className="pb-3 position-relative slider-wrapper d-none d-lg-block">
                <Swiper
                  modules={[Navigation, Autoplay]}
                  spaceBetween={24}
                  slidesPerView={3}
                  loop={true}
                  navigation={true}
                  autoplay={{
                    delay: 3000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                  }}
                  breakpoints={{
                    992: { slidesPerView: 3 },
                    768: { slidesPerView: 3 },
                  }}
                  className="top-courses-swiper py-3"
                >
                  {initialCourses.map((course) => (
                    <SwiperSlide key={course.course_id} className="course-slide">
                      <CourseCard course={course} />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
