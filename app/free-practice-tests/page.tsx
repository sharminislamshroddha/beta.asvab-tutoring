import type { Metadata } from "next";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import FreePracticeTestsLayout from "@/components/free-practice-tests/FreePracticeTestsLayout";
import { freePracticeTestsMetadata, FREE_PRACTICE_TESTS_BANNER_SUBTITLE } from "@/lib/page-metadata";
import {
  fetchAllPackageDetailsForCourse,
  fetchFreePracticeTestCatalog,
} from "@/lib/php-api";

export const metadata: Metadata = freePracticeTestsMetadata();
export const revalidate = 3600;

export default async function FreePracticeTestsPage() {
  const courses = await fetchFreePracticeTestCatalog();

  const packageEntries = await Promise.all(
    courses.map(async (course) => {
      const packages = await fetchAllPackageDetailsForCourse(course.courseCode);
      return [course.courseCode, packages] as const;
    }),
  );

  const packagesByCourse = Object.fromEntries(packageEntries);

  return (
    <>
      <div className="page-title-area text-white py-5">
        <div className="container text-center">
          <h1>Free Practice Tests</h1>
          <h2 className="h4">{FREE_PRACTICE_TESTS_BANNER_SUBTITLE}</h2>
          <Breadcrumb segments={["free-practice-tests"]} />
        </div>
      </div>

      <div className="container py-5">
        <FreePracticeTestsLayout
          courses={courses}
          packagesByCourse={packagesByCourse}
        />
      </div>
    </>
  );
}
