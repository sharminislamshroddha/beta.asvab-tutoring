import type { Metadata } from "next";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import FreePredictionTestsLayout from "@/components/free-prediction-tests/FreePredictionTestsLayout";
import { freePredictionTestsMetadata, FREE_PREDICTION_TESTS_BANNER_SUBTITLE } from "@/lib/page-metadata";
import {
  fetchPublishableCourses,
  fetchAllPackageDetailsForCourse,
  fetchFreePredTestCatalog,
} from "@/lib/php-api";

export const metadata: Metadata = freePredictionTestsMetadata();
export const revalidate = 3600;

export default async function FreePredictionTestsPage() {
  const [allCourses, predictionTests] = await Promise.all([
    fetchPublishableCourses(),
    fetchFreePredTestCatalog(),
  ]);

  const packageEntries = await Promise.all(
    allCourses.map(async (course) => {
      const packages = await fetchAllPackageDetailsForCourse(course.course_code);
      return [course.course_code, packages] as const;
    }),
  );

  const packagesByCourse = Object.fromEntries(packageEntries);

  return (
    <>
      <div className="page-title-area text-white py-5">
        <div className="container text-center">
          <h1>Free Prediction Tests</h1>
          <h2 className="h4">{FREE_PREDICTION_TESTS_BANNER_SUBTITLE}</h2>
          <Breadcrumb segments={["free-prediction-tests"]} />
        </div>
      </div>

      <div className="container py-5">
        <FreePredictionTestsLayout
          courses={predictionTests}
          allCourses={allCourses}
          packagesByCourse={packagesByCourse}
        />
      </div>
    </>
  );
}
