"use client";

import { useState, type CSSProperties } from "react";
import type { CourseVariantOption } from "@/lib/course-types";

type CourseVariantGradeSelectProps = {
  variants: CourseVariantOption[];
  value: string;
  onChange: (mainCourseId: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  /** Wrapper around the label + select. Defaults to Bootstrap `mb-3`. */
  containerClassName?: string;
  /** Also show error after a failed submit attempt. */
  showError?: boolean;
};

export default function CourseVariantGradeSelect({
  variants,
  value,
  onChange,
  disabled = false,
  id = "checkout-grade-select",
  className = "form-select",
  style,
  containerClassName = "mb-3",
  showError = false,
}: CourseVariantGradeSelectProps) {
  const [touched, setTouched] = useState(false);
  const displayError = (showError || touched) && !value;

  return (
    <div className={containerClassName}>
      <label htmlFor={id} className="form-label fw-semibold text-muted mb-1">
        Select grade <span className="text-danger">*</span>
      </label>
      <select
        id={id}
        className={`${className}${displayError ? " is-invalid" : ""}`}
        style={style}
        value={value}
        disabled={disabled || variants.length === 0}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        required
      >
        <option value="">Choose a grade</option>
        {variants.map((variant) => {
          const mainId = String(variant.main_course_id);
          return (
            <option key={mainId} value={mainId}>
              {variant.course_name || `Course ${mainId}`}
            </option>
          );
        })}
      </select>
      {displayError && (
        <div className="form-text text-danger">
          Please select a grade before continuing.
        </div>
      )}
    </div>
  );
}
