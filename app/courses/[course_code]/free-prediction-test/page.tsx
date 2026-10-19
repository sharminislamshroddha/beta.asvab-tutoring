import { Metadata } from "next";
import { notFound } from "next/navigation";
import FreePredTest from "@/components/free-prediction-test/FreePredTest";
import VariantFreePredTest from "@/components/free-prediction-test/VariantFreePredTest";
import { isKnownCourseCode } from "@/lib/known-route-validation";
import { freePredictionTestMetadata } from "@/lib/page-metadata";
import {
  fetchAllPackageDetailsForCourse,
  fetchFreePredTestByCode,
  isCoursePublishable,
} from "@/lib/php-api";
import { getReadyFreePredTestVariants } from "@/lib/prediction-test-types";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course_code: string }>;
}): Promise<Metadata> {
  const { course_code } = await params;
  return freePredictionTestMetadata(course_code);
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

  const [predTestData, packagesByService] = await Promise.all([
    fetchFreePredTestByCode(course_code),
    fetchAllPackageDetailsForCourse(course_code),
  ]);

  if (!predTestData?.data) {
    notFound();
  }

  // Variant courses (e.g. State Math Test Prep) keep one test per grade, so the
  // parent page lets the student pick the grade instead of holding its own test.
  const gradeVariants = getReadyFreePredTestVariants(predTestData.variants);

  if (gradeVariants.length > 0) {
    return (
      <VariantFreePredTest
        courseName={predTestData.course_name}
        predictionTestName={predTestData.prediction_test_name}
        courseCode={course_code}
        variants={gradeVariants}
        packagesByService={packagesByService}
      />
    );
  }

  return (
    <FreePredTest
      courseName={predTestData.course_name}
      predictionTestName={predTestData.prediction_test_name}
      courseCode={course_code}
      courseId={predTestData.data.course_id}
      ft_categories={predTestData.data.categories}
      ft_ques_list={predTestData.data.questions}
      packagesByService={packagesByService}
    />
  );
}
