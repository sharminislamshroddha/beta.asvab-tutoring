"use client";
import Link from "next/link";

interface BreadcrumbProps {
  segments: string[];
  dynamicTitle?: string; // for dynamic pages
  segmentLabels?: Record<number, string>;
  className?: string; // for custom styling
}

export default function Breadcrumb({
  segments,
  dynamicTitle,
  segmentLabels,
  className,
}: BreadcrumbProps) {
  const lastIndex = segments.length - 1;

  // Add any segment names here that should NOT be clickable
  const nonClickableSegments = ["courses", "pricing", "services"];

  return (
    <nav
      className={`flex justify-center items-center gap-2 flex-wrap ${className || ""}`}
    >
      {/* Home */}
      <span className="flex items-center">
        <Link href="/" className="breadcrumb-link">
          Home
        </Link>
        {segments.length > 0 && <span className="mx-2">›</span>}
      </span>

      {segments.map((seg, idx) => {
        const isLast = idx === lastIndex;
        const displayLabel =
          segmentLabels?.[idx] ??
          (isLast && dynamicTitle
            ? dynamicTitle
            : seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));

        const href = "/" + segments.slice(0, idx + 1).join("/");

        const isClickable =
          !isLast && !nonClickableSegments.includes(seg.toLowerCase());

        return (
          <span key={idx} className="flex items-center">
            {isClickable ? (
              <Link href={href} className="breadcrumb-link">
                {displayLabel}
              </Link>
            ) : (
              <span>{displayLabel}</span>
            )}
            {!isLast && <span className="mx-2">›</span>}
          </span>
        );
      })}
    </nav>
  );
}
