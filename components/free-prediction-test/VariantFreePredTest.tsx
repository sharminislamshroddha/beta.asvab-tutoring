"use client";

import { useState } from "react";
import FreePredTest from "./FreePredTest";
import TestGradeSelector, {
  courseNameWithSelectedGrade,
} from "@/components/free-test/TestGradeSelector";
import type { PackagesByService } from "@/lib/package-types";
import type { FreePredTestVariant } from "@/lib/prediction-test-types";
import { convertCourseCodeToId } from "@/lib/package-utils";

type VariantFreePredTestProps = {
  courseName: string;
  predictionTestName?: string;
  courseCode: string;
  /** One entry per grade, already filtered to grades with a complete test. */
  variants: FreePredTestVariant[];
  packagesByService?: PackagesByService;
};

export default function VariantFreePredTest({
  courseName,
  predictionTestName,
  courseCode,
  variants,
  packagesByService,
}: VariantFreePredTestProps) {
  const [selectedGradeId, setSelectedGradeId] = useState("");

  const activeVariant = variants.find(
    (variant) => String(variant.main_course_id) === selectedGradeId,
  );

  const gradeSelector = (
    <TestGradeSelector
      variant="prediction"
      options={variants}
      value={selectedGradeId}
      onChange={setSelectedGradeId}
    />
  );

  return (
    <FreePredTest
      // Remounting on grade change discards answers and scores from the
      // previous grade.
      key={selectedGradeId || "awaiting-grade"}
      courseName={courseName}
      rulesCourseName={courseNameWithSelectedGrade(
        courseName,
        activeVariant?.course_name,
      )}
      predictionTestName={predictionTestName}
      courseCode={courseCode}
      awaitingGrade={!activeVariant}
      // Scoring uses the parent asvab id; checkout still needs the grade MAIN.
      courseId={Number(convertCourseCodeToId(courseCode))}
      gradeMainId={Number(activeVariant?.main_course_id ?? 0) || undefined}
      ft_categories={activeVariant?.data?.categories}
      ft_ques_list={activeVariant?.data?.questions}
      packagesByService={packagesByService}
      headerSlot={gradeSelector}
    />
  );
}
