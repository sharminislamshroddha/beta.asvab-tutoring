"use client";

import Link from "next/link";
import type { FreePracticeTestCourse } from "@/lib/php-api";
import {
  CATEGORY_HUB_PRACTICE_INTRO,
  MIXED_HUB_PRACTICE_CLOSER,
  groupHubCoursesByCategory,
} from "@/lib/category-copy";
import styles from "./freePracticeTests.module.css";

function resolveImageUrl(path?: string): string {
  if (!path) return "/images/asvab-courses-d.jpg";

  const cleaned = path.trim();

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  return `${process.env.NEXT_PUBLIC_RESOURCES_URL}/${encodeURI(cleaned)}`;
}

function formatSectionNames(names: string[]): string {
  if (names.length <= 4) return names.join(", ");
  return `${names.slice(0, 4).join(", ")}, +${names.length - 4} more`;
}

type Props = {
  courses: FreePracticeTestCourse[];
};

export default function FreePracticeTestsContent({ courses }: Props) {
  if (courses.length === 0) {
    return (
      <div className={`text-center py-5 ${styles.emptyState}`}>
        <div className="alert alert-info border-0 shadow-sm">
          <h2 className="h5">No Free Practice Tests Available</h2>
          <p className="mb-3 small">
            We are updating our practice test questions. Please check back soon.
          </p>
          <Link href="/contact-us" className="btn btn-primary-custom">
            Contact Us
          </Link>
        </div>
      </div>
    );
  }

  const groupedCourses = groupHubCoursesByCategory(courses);

  return (
    <>
      <div className={styles.intro}>
        <p>
          At ASVAB Tutoring, we offer a free practice test for every course in our catalog. Each test uses real-style
          questions so you can gauge how prepared you are before test day.
        </p>
        <p>
          Choose a course below to begin a free practice test. The test is broken down into sections that match that course&apos;s subject
          areas. Select any section you want to test your skills on and answer each question at your own pace. Then submit when you are finished to know your score for that section.
        </p>
        <p>
          Your results are broken down by section, so you can see exactly where
          you scored well and where you need more work. Use that breakdown to
          target your weak areas and make your study time count.
        </p>
        <p>{MIXED_HUB_PRACTICE_CLOSER}</p>
      </div>

      <h1 className={`${styles.sectionHeading}`}>Available Free Practice Tests</h1>

      <div className="d-flex flex-column gap-4">
        {groupedCourses.map(({ category, label, items }) => (
          <section key={category} className={styles.categoryBlock}>
            <h2 className={styles.categoryHeading}>{label}</h2>
            <p className={styles.categoryIntro}>{CATEGORY_HUB_PRACTICE_INTRO[category]}</p>
            <div className="d-flex flex-column gap-4">
              {items.map((course) => {
                const testHref = `/courses/${encodeURIComponent(course.courseCode)}/free-practice-test`;
                const overviewHref = `/courses/${encodeURIComponent(course.courseCode)}`;

                return (
                  <article
                    key={course.courseCode}
                    id={course.courseCode}
                    className={`card border-0 shadow-sm overflow-hidden ${styles.courseCard}`}
                  >
                    <Link
                      href={testHref}
                      className={styles.courseCardLink}
                      aria-label={`Take ${course.courseName} free practice test`}
                    />
                    <div className="row g-0 align-items-stretch">
                      <div className="col-md-4">
                        <img
                          src={resolveImageUrl(course.imageSrc)}
                          alt={course.courseName}
                          className={`w-100 h-100 ${styles.courseCardImg}`}
                          width={300}
                          height={180}
                        />
                      </div>
                      <div className="col-md-8">
                        <div className="card-body d-flex flex-column h-100 p-4">
                          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                            <h3 className="h5 fw-bold mb-0" style={{ color: "#002341", fontSize: "1.25rem" }}>
                              Free {course.courseName} Practice Test
                            </h3>
                            <span
                              className={`badge rounded-pill px-3 py-1 ${styles.sectionBadge}`}
                            >
                              {course.sectionCount}{" "}
                              {course.sectionCount === 1 ? "section" : "sections"}
                            </span>
                          </div>
                          {course.fullForm && (
                            <p className="small text-muted mb-2">{course.fullForm}</p>
                          )}
                          <p className={`mb-3 ${styles.sectionNames}`}>
                            Sections: {formatSectionNames(course.sectionNames)}
                          </p>
                          <div
                            className={`mt-auto d-flex flex-wrap gap-2 ${styles.courseCardActions}`}
                          >
                            <Link
                              href={testHref}
                              className="btn btn-primary-custom px-4"
                            >
                              Take {course.courseName} Practice Test
                            </Link>
                            <Link
                              href={overviewHref}
                              className="btn btn-secondary-custom px-4"
                            >
                              Course Overview
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
