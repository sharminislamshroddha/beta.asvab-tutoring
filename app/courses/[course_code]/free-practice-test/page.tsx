import { Metadata } from "next";
import { notFound } from "next/navigation";
import FreeTest from "@/components/free-test/FreeTest";
import VariantFreeTest from "@/components/free-test/VariantFreeTest";
import { getReadyFreeTestVariants } from "@/lib/course-types";
import { isKnownCourseCode } from "@/lib/known-route-validation";
import { freePracticeTestMetadata } from "@/lib/page-metadata";
import {
  fetchAllPackageDetailsForCourse,
  fetchFreePracticeTestByCode,
  fetchFreePredTestByCode,
  isCoursePublishable,
} from "@/lib/php-api";
import { isFreePredTestResponseReady } from "@/lib/prediction-test-types";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course_code: string }>;
}): Promise<Metadata> {
  const { course_code } = await params;
  return freePracticeTestMetadata(course_code);
}

export default async function Page({
  params,
}: {
  params: Promise<{ course_code: string }>;
}) {
  const { course_code } = await params;

  if (!isKnownCourseCode(course_code)) {
    notFound();
  }

  if (!(await isCoursePublishable(course_code))) {
    notFound();
  }

  const [freeTestData, packagesByService, predTestData] = await Promise.all([
    fetchFreePracticeTestByCode(course_code),
    fetchAllPackageDetailsForCourse(course_code),
    fetchFreePredTestByCode(course_code),
  ]);

  const hasFreePredTest = isFreePredTestResponseReady(predTestData);

  if (!freeTestData?.data) {
    notFound();
  }

  // Variant courses (e.g. State Math Test Prep) keep one test per grade, so the
  // parent page lets the student pick the grade instead of holding its own test.
  const gradeVariants = getReadyFreeTestVariants(freeTestData.variants);

  if (gradeVariants.length > 0) {
    return (
      <VariantFreeTest
        courseName={freeTestData.course_name}
        courseCode={course_code}
        variants={gradeVariants}
        packagesByService={packagesByService}
        hasFreePredTest={hasFreePredTest}
      />
    );
  }

  return (
    <FreeTest
      courseName={freeTestData.course_name}
      courseCode={course_code}
      ft_categories={freeTestData.data.categories}
      ft_ques_list={freeTestData.data.questions}
      packagesByService={packagesByService}
      hasFreePredTest={hasFreePredTest}
    />
  );
}
