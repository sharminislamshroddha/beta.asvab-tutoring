"use client";

import Link from "next/link";
import { useState } from "react";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import LessonPlanTab from "@/components/tabs/LessonPlanTab";
import FreeLessonVideosTab, {
  hasFreeLessonVideos,
} from "@/components/tabs/FreeLessonVideosTab";
import CoursePricingPanel from "@/components/pricing/CoursePricingPanel";
import CourseOverviewVideoEmbed from "@/components/course/CourseOverviewVideoEmbed";
import CourseReviews from "@/components/course/CourseReviews";
import PredictionTestLinkButton from "@/components/prediction-test/PredictionTestLinkButton";
import { getCourseFreePredictionTestHref } from "@/lib/prediction-test-links";
import { processHtmlContent } from "@/lib/decode-html";
import type { CourseData } from "@/lib/course-types";
import type { CourseOverviewVideo } from "@/lib/php-api";
import type { PackagesByService } from "@/lib/package-types";
import styles from "./courseDetail.module.css";

export type CourseDetailPageProps = {
  courseCode: string;
  courseData: CourseData | null;
  courseOverviewVideoData?: CourseOverviewVideo | null;
  packagesByService?: PackagesByService;
  breadcrumbSegments: string[];
  hasFreePredTest?: boolean;
  hasFreePracticeTest?: boolean;
  practiceTestCourseName?: string;
  predictionTestCourseName?: string;
};

export default function CourseDetailPage({
  courseCode,
  courseData,
  packagesByService,
  breadcrumbSegments,
  courseOverviewVideoData,
  hasFreePredTest = false,
  hasFreePracticeTest = false,
  practiceTestCourseName,
  predictionTestCourseName,
}: CourseDetailPageProps) {
  const [activeTab, setActiveTab] = useState<number>(0);

  if (!courseData) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          <h4>Failed to load course data</h4>
          <p>Please check the console or refresh the page.</p>
        </div>
      </div>
    );
  }

  const hasOverview = Boolean(courseData.overview?.trim());
  const hasCurriculum = Boolean(courseData.curriculum?.trim());
  const hasVideo = hasFreeLessonVideos(courseData.video);
  const hasSessions = (courseData.sessions?.length ?? 0) > 0;

  const showFreeTestLink = hasFreePracticeTest;
  const practiceName =
    practiceTestCourseName?.trim() || courseData.course_name?.trim() || "";
  const predictionName =
    predictionTestCourseName?.trim() || courseData.course_name?.trim() || "";

  return (
    <>
      <div className="page-title-area text-white py-5">
        <div className="container text-center">
          <h1 style={{fontSize: "2.1rem", fontWeight: "semibold"}}>{courseData.course_header?.toUpperCase() || "Course Title"}</h1>
          <h2 className="h4">
            {courseData.course_tagline || "Course Tagline"}
          </h2>
          <Breadcrumb
            segments={breadcrumbSegments}
            dynamicTitle={courseData.course_name}
          />
        </div>
      </div>

      <section className="single-course-area py-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              {courseOverviewVideoData ? (
                <CourseOverviewVideoEmbed
                  video={courseOverviewVideoData}
                  fallbackImageSrc={courseData.image_src}
                  fallbackImageAlt={courseData.course_name || "Course Image"}
                />
              ) : (
                courseData.image_src && (
                  <div className="mb-4 text-center">
                    <img
                      src={courseData.image_src}
                      alt={courseData.course_name || "Course Image"}
                      width={800}
                      height={350}
                      className="img-fluid rounded shadow-sm"
                    />
                  </div>
                )
              )}

              <div
                className="single-course-tab"
                style={{
                  border: "1px solid #cfd4d8",
                  borderRadius: "8px",
                  padding: "10px 18px 0px 18px",
                  marginBottom: "10px",
                }}
              >
                <ul className="nav nav-tabs mb-4 responsive-tabs" role="tablist">
                  {hasOverview && (
                    <li className="nav-item" role="presentation">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 0}
                        className={`nav-link tab-btn ${activeTab === 0 ? "active" : ""}`}
                        onClick={() => setActiveTab(0)}
                      >
                        Overview
                      </button>
                    </li>
                  )}
                  {hasCurriculum && (
                    <li className="nav-item" role="presentation">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 1}
                        className={`nav-link tab-btn ${activeTab === 1 ? "active" : ""}`}
                        onClick={() => setActiveTab(1)}
                      >
                        Curriculum
                      </button>
                    </li>
                  )}
                  {hasSessions && (
                    <li className="nav-item" role="presentation">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 4}
                        className={`nav-link tab-btn ${activeTab === 4 ? "active" : ""}`}
                        onClick={() => setActiveTab(4)}
                      >
                        Session Plan
                      </button>
                    </li>
                  )}
                  {hasVideo && (
                    <li className="nav-item" role="presentation">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 2}
                        className={`nav-link tab-btn ${activeTab === 2 ? "active" : ""}`}
                        onClick={() => setActiveTab(2)}
                      >
                        Free Lesson Videos
                      </button>
                    </li>
                  )}
                </ul>

                {/*
                  Keep text tab panels in the DOM so curriculum and session plan
                  are present in the initial HTML for crawlers. Inactive panels
                  stay hidden visually via the `hidden` attribute. Free lesson
                  video iframes are mounted only when that tab is active.
                */}
                <div className="tab-content">
                  {hasOverview && (
                    <div
                      className="overview-tab"
                      role="tabpanel"
                      hidden={activeTab !== 0}
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: processHtmlContent(
                            courseData.overview || "No description available",
                          ),
                        }}
                      />
                      {(showFreeTestLink || hasFreePredTest) && (
                        <div className={styles.overviewTestActions}>
                          {showFreeTestLink ? (
                            <Link
                              href={`/courses/${encodeURIComponent(courseCode)}/free-practice-test`}
                              className={`btn btn-primary-custom d-inline-flex align-items-center gap-2 ${styles.overviewTestBtn}`}
                            >
                              <i className="bi bi-clipboard-check" aria-hidden />
                              Take a Free{practiceName ? ` ${practiceName}` : ""}{" "}
                              practice test
                            </Link>
                          ) : null}
                          {hasFreePredTest ? (
                            <PredictionTestLinkButton
                              href={getCourseFreePredictionTestHref(courseCode)}
                              className={styles.overviewTestBtn}
                            >
                              Take a Free
                              {predictionName ? ` ${predictionName}` : ""}{" "}
                              prediction test
                            </PredictionTestLinkButton>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                  {hasCurriculum && (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: processHtmlContent(
                          courseData.curriculum || "No curriculum",
                        ),
                      }}
                      className="curriculum-table"
                      role="tabpanel"
                      hidden={activeTab !== 1}
                    />
                  )}
                  {hasSessions && (
                    <div
                      className="sessions-tab transition-fade"
                      role="tabpanel"
                      hidden={activeTab !== 4}
                    >
                      <p className={styles.sessionPlanIntro}>
                        Our one-on-one{" "}
                        {courseData.course_name?.trim() || courseCode.toUpperCase()}{" "}
                        tutoring follows a structured session plan designed to
                        strengthen each student&apos;s weaker areas while building
                        the knowledge, speed, and test-taking skills needed for
                        the exam. Each session combines focused instruction,
                        guided practice, assigned homework, practice tests, and
                        progress review. The plan shown below is a sample
                        framework and may be adjusted based on the student&apos;s
                        diagnostic assessment, target composites, official test
                        date, and individual learning needs.
                      </p>
                      <LessonPlanTab sessions={courseData.sessions} />
                    </div>
                  )}
                  {/*
                    Free lesson iframes must not mount while this panel is hidden:
                    embeds measure a 0×0 box and lock in blurry thumbnails.
                    Mount only when the tab is active (curriculum/session plan
                    stay preloaded for crawlability).
                  */}
                  {hasVideo && activeTab === 2 && (
                    <div role="tabpanel">
                      <FreeLessonVideosTab video={courseData.video} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-4 align-self-start">
              {packagesByService && (
                <CoursePricingPanel
                  courseCode={courseCode}
                  packagesByService={packagesByService}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <CourseReviews
        reviews={courseData.user_feedbacks ?? []}
        courseName={courseData.course_name}
      />
    </>
  );
}
