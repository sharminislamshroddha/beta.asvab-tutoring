"use client";

import { useState } from "react";
import FreeTest from "./FreeTest";
import TestGradeSelector, {
  courseNameWithSelectedGrade,
} from "./TestGradeSelector";
import type { FreePracticeTestVariant } from "@/lib/course-types";
import type { PackagesByService } from "@/lib/package-types";

type VariantFreeTestProps = {
  courseName?: string;
  courseCode: string;
  /** One entry per grade, already filtered to grades with a complete test. */
  variants: FreePracticeTestVariant[];
  packagesByService?: PackagesByService;
  hasFreePredTest?: boolean;
};

export default function VariantFreeTest({
  courseName,
  courseCode,
  variants,
  packagesByService,
  hasFreePredTest = false,
}: VariantFreeTestProps) {
  const [selectedGradeId, setSelectedGradeId] = useState("");

  const activeVariant = variants.find(
    (variant) => String(variant.main_course_id) === selectedGradeId,
  );

  const gradeSelector = (
    <TestGradeSelector
      variant="practice"
      options={variants}
      value={selectedGradeId}
      onChange={setSelectedGradeId}
    />
  );

  return (
    <FreeTest
      // Remounting on grade change discards answers and section progress from
      // the previous grade.
      key={selectedGradeId || "awaiting-grade"}
      courseName={courseName}
      rulesCourseName={courseNameWithSelectedGrade(
        courseName,
        activeVariant?.course_name,
      )}
      courseCode={courseCode}
      awaitingGrade={!activeVariant}
      ft_categories={activeVariant?.data?.categories}
      ft_ques_list={activeVariant?.data?.questions}
      packagesByService={packagesByService}
      hasFreePredTest={hasFreePredTest}
      headerSlot={gradeSelector}
    />
  );
}
