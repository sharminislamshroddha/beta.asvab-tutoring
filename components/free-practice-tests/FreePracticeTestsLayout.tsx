"use client";

import CoursePricingPanel from "@/components/pricing/CoursePricingPanel";
import FreePracticeTestsContent from "./FreePracticeTestsContent";
import type { FreePracticeTestCourse } from "@/lib/php-api";
import type { PackagesByService } from "@/lib/package-types";

type Props = {
  courses: FreePracticeTestCourse[];
  packagesByCourse: Record<string, PackagesByService>;
};

export default function FreePracticeTestsLayout({
  courses,
  packagesByCourse,
}: Props) {
  if (courses.length === 0) {
    return (
      <div className="row justify-content-center">
        <div className="col-lg-8 col-xl-6">
          <FreePracticeTestsContent courses={courses} />
        </div>
      </div>
    );
  }

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <FreePracticeTestsContent courses={courses} />
      </div>
      <div className="col-lg-4 align-self-start">
        <CoursePricingPanel
          courseOptions={courses.map((course) => ({
            courseCode: course.courseCode,
            courseName: course.courseName,
          }))}
          packagesByCourse={packagesByCourse}
        />
      </div>
    </div>
  );
}
