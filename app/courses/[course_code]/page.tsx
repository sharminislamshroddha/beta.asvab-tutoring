import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { isKnownCourseCode } from "@/lib/known-route-validation";
import CourseDetailPage from "./CourseDetailPage";
import { courseMetadata } from "@/lib/page-metadata";
import {
  fetchCourseDetailsByCode,
  fetchCourseOverviewVideoByCode,
  fetchAllPackageDetailsForCourse,
  fetchFreePredTestByCode,
  fetchFreePracticeTestByCode,
  isCoursePublishable,
} from "@/lib/php-api";
import { isFreePredTestResponseReady } from "@/lib/prediction-test-types";
import { isFreePracticeTestResponseReady } from "@/lib/course-types";

export const revalidate = 3600;

function normalizeCourseCode(raw: string): string {
  return raw.replace(/-tutor$/i, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course_code: string }>;
}): Promise<Metadata> {
  const { course_code: raw } = await params;
  return courseMetadata(normalizeCourseCode(raw));
}

export default async function Page({
  params,
}: {
  params: Promise<{ course_code: string }>;
}) {
  const { course_code: raw } = await params;
  const course_code = normalizeCourseCode(raw);

  // Legacy online-courses URLs redirected here may still include `-tutor`.
  if (raw !== course_code) {
    permanentRedirect(`/courses/${course_code}`);
  }

  if (!isKnownCourseCode(course_code)) {
    notFound();
  }

  if (!(await isCoursePublishable(course_code))) {
    notFound();
  }

  const [courseData, packagesByService, predTestData, freeTestData] =
    await Promise.all([
      fetchCourseDetailsByCode(course_code),
      fetchAllPackageDetailsForCourse(course_code),
      fetchFreePredTestByCode(course_code),
      fetchFreePracticeTestByCode(course_code),
    ]);

  const courseOverviewVideoData =
    await fetchCourseOverviewVideoByCode(course_code);

  const hasFreePredTest = isFreePredTestResponseReady(predTestData);

  const hasFreePracticeTest = isFreePracticeTestResponseReady(freeTestData);

  if (!courseData) {
    notFound();
  }

  return (
    <CourseDetailPage
      courseCode={course_code}
      courseData={courseData}
      courseOverviewVideoData={courseOverviewVideoData}
      packagesByService={packagesByService}
      breadcrumbSegments={["courses", course_code]}
      hasFreePredTest={hasFreePredTest}
      hasFreePracticeTest={hasFreePracticeTest}
      practiceTestCourseName={
        freeTestData?.course_name || courseData.course_name
      }
      predictionTestCourseName={
        predTestData?.prediction_test_name ||
        predTestData?.course_name ||
        courseData.course_name
      }
    />
  );
}
