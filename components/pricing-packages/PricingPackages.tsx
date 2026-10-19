"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ServiceType } from "@/types/Services";
import type { PricingPackageItem } from "@/lib/php-api";
import {
  COURSE_CATEGORY_LABELS,
  groupCoursesByCategory,
  type CourseCategory,
} from "@/lib/package-utils";

type Submenu = "one" | "group" | "subscribe";

function isListedPricingPackage(pkg: PricingPackageItem): boolean {
  const priceRange = (pkg.price_range ?? "").trim();
  return priceRange !== "" && priceRange.toUpperCase() !== "N/A";
}

type Props = {
  submenu?: Submenu;
  fixedSubmenu?: Submenu;
  homepageDescription?: React.ReactNode;
  sectionTitle?: string;
  sectionSubtitle?: string;
  /** Server-fetched packages (pricing pages). Homepage omits this and client-fetches. */
  initialPackages?: PricingPackageItem[];
};

const CATEGORY_GROUPS: {
  key: CourseCategory;
  packagesKey:
    | "militaryTestPrep"
    | "healthcareTestPrep"
    | "academicTestPrep";
}[] = [
  { key: "military test prep", packagesKey: "militaryTestPrep" },
  { key: "healthcare test prep", packagesKey: "healthcareTestPrep" },
  { key: "academic test prep", packagesKey: "academicTestPrep" },
];

function PackageCard({
  pkg,
  serviceType,
}: {
  pkg: PricingPackageItem;
  serviceType: ServiceType;
}) {
  return (
    <div className="col hover-lift">
      <Link href={`/package-details/${serviceType}/${pkg.course_code}`}>
        <div className="card h-100 shadow-sm border-0">
          <Image
            src={encodeURI(pkg.image_src.trim())}
            alt={pkg.name}
            width={400}
            height={250}
            className="card-img-top"
            unoptimized
            loading="lazy"
            style={{
              width: "100%",
              height: "auto",
              aspectRatio: "4 / 3",
              objectFit: "cover",
            }}
          />

          <div className="card-body text-start text-center">
            <h5 className="card-title fw-bold text-primary text-center">
              <span className="course-name">{pkg.name}</span>
              <br />
              <span className="course-full-form">{pkg.full_form}</span>
            </h5>

            <p className="card-text fw-semibold">
              {(pkg.price_range ?? "")
                .split(" (")
                .map((part: string, i: number) => (
                  <React.Fragment key={i}>
                    {i > 0 && <br />}
                    {i > 0 ? `(${part}` : part}
                  </React.Fragment>
                ))}
            </p>

            <div className="text-center">
              <button className="btn btn-secondary-custom btn-sm w-50">
                Details
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

const PricingPackages: React.FC<Props> = ({
  submenu,
  fixedSubmenu = "one",
  homepageDescription,
  sectionTitle,
  sectionSubtitle,
  initialPackages,
}) => {
  const [packages, setPackages] = useState<PricingPackageItem[]>(
    initialPackages ?? [],
  );
  const [loading, setLoading] = useState(initialPackages === undefined);

  const activeSubmenu: Submenu = submenu ?? fixedSubmenu;

  const serviceTypeMap: Record<Submenu, ServiceType> = {
    one: "1-on-1-tutoring",
    group: "group-tutoring",
    subscribe: "self-study",
  };

  const serviceType = serviceTypeMap[activeSubmenu] ?? null;

  useEffect(() => {
    if (initialPackages !== undefined) {
      return;
    }

    setLoading(true);

    const fetchPackages = async () => {
      try {
        const formData = new FormData();
        formData.append("action", "specific-course-list-tutoring-package");
        formData.append("submenu", activeSubmenu);

        const res = await fetch(process.env.NEXT_PUBLIC_PHP_API_URL!, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (data?.isSuccess && Array.isArray(data.data)) {
          setPackages(data.data.filter(isListedPricingPackage));
        } else {
          setPackages([]);
        }
      } catch (err) {
        console.error("Error fetching packages:", err);
        setPackages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [activeSubmenu, initialPackages]);

  // ---------------- TITLES ----------------

  // Default titles for pricing pages (and as fallback)
  const defaultTitleMap: Record<Submenu, string> = {
    one: "1-on-1 Tutoring Packages",
    group: "Group Tutoring Packages",
    subscribe: "Self-Study Packages",
  };

  const subTextMap: Record<Submenu, string> = {
    one: "Choose from our personalized 1-on-1 tutoring packages.",
    group: "Choose from one of our group tutoring packages.",
    subscribe:
      "Choose a self-study plan for full access to study materials and practice tests.",
  };

  // Final heading logic:
  // 1) If sectionTitle is provided (homepage section), use it
  // 2) Else use default map (pricing pages)
  const headingText = sectionTitle ?? defaultTitleMap[activeSubmenu];
  const subText = subTextMap[activeSubmenu];

  const grouped = groupCoursesByCategory(packages);
  const populatedGroups = CATEGORY_GROUPS.filter(
    ({ packagesKey }) => grouped[packagesKey].length > 0,
  );
  const showCategoryLabels = populatedGroups.length > 0;

  return (
    <section className="bg-white mt-5 text-center">
      <div className="container">
        {/* Heading */}
        <div className="text-center mb-2 position-relative">
          <h2 className="fs-2 fw-bold d-inline-block pb-3 position-relative">
            {headingText}
            <img
              src="/images/border_v1.png"
              alt="underline"
              width={160}
              height={8}
              className="position-absolute start-50 translate-middle-x bottom-0"
              style={{ objectFit: "cover" }}
            />
          </h2>
        </div>

        {/* Optional subtitle (useful for homepage subscribe section etc.) */}
        {sectionSubtitle && (
          <h3 className="fs-5 fw-semibold text-muted mb-3">
            {sectionSubtitle}
          </h3>
        )}

        {/* Description:
            - If homepageDescription exists, show that
            - Otherwise use submenu-based description (pricing pages)
        */}
        {homepageDescription && (
          <p className="text-start mx-auto mb-4" style={{ maxWidth: "960px" }}>
            {homepageDescription}
          </p>
        )}

        {/* Always show subText after homepageDescription (or alone on pricing page) */}
        <p className="text-start mx-auto mb-4 fs-5">{subText}</p>

        {loading ? (
          <p>Loading packages...</p>
        ) : packages.length === 0 ? (
          <p>No packages found for this category.</p>
        ) : (
          populatedGroups.map(({ key, packagesKey }, groupIndex) => {
            const groupPackages = grouped[packagesKey];

            return (
              <div
                key={key}
                className={groupIndex > 0 ? "mt-5" : undefined}
              >
                {showCategoryLabels && (
                  <h3 className="pricing-category-heading">
                    <span className="pricing-category-heading__label">
                      {COURSE_CATEGORY_LABELS[key]}
                    </span>
                  </h3>
                )}
                <div className="row justify-content-center g-3 row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5">
                  {groupPackages.map((pkg) => (
                    <PackageCard
                      key={pkg.course_id}
                      pkg={pkg}
                      serviceType={serviceType}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default PricingPackages;
