"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import Image from "next/image";

type CoursePackage = {
  course_id: string;
  course_code: string;
  name: string;
  image_src: string;
  price_range: string;
};

type PackagesProps = {
  // showEnrollButton?: boolean; // default true
  headingSize?: string; // optional text size class for heading
};

const Packages = ({
  // showEnrollButton = true,
  headingSize = "fs-5", // default smaller heading
}: PackagesProps) => {
  const [packages, setPackages] = useState<CoursePackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const formData = new FormData();
        formData.append("action", "course-list-tutoring-package");

        const res = await fetch(process.env.NEXT_PUBLIC_PHP_API_URL!, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data?.isSuccess) {
          setPackages(data.data);
        }
      } catch (error) {
        console.error("Error fetching tutor packages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  return (
    <section className="bg-white py-5 text-center">
      <div className="container">
        {/* Title */}
        <div className="text-center mb-5 position-relative">
          <h2 className="display-5 fw-bold text-gray-800 d-inline-block pb-3 position-relative">
            Our Pricing
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

        {/* Description */}
        <p className="text-start mx-auto mb-4" style={{ maxWidth: "960px" }}>
          ASVAB Tutoring will provide One-on-One online tutoring service. All
          the study materials with a lesson plan will be provided. Each session
          is 2 hours. The tutoring services offered by ASVAB Tutoring are as
          follows.
        </p>

        {/* Subheading */}
        <h3
          className={`fw-semibold ${headingSize} mb-4 text-start`}
          style={{ maxWidth: "960px", marginInline: "auto" }}
        >
          Select online Tutoring package:
        </h3>

        {/* Packages Grid */}
        <div className="row justify-content-center g-4 mb-5">
          {loading ? (
            <p>Loading packages...</p>
          ) : (
            packages.map((pkg) => (
              <div key={pkg.course_id} className="col-sm-6 col-lg-4 hover-lift">
                <div className="card h-100 shadow-sm">
                  <Image
                    src={encodeURI(pkg.image_src.trim())}
                    alt={pkg.name}
                    width={400}
                    height={200}
                    className="card-img-top"
                    unoptimized
                    loading="lazy"
                    style={{ height: "200px", objectFit: "cover" }}
                  />
                  <div className="card-body text-start">
                    <h5 className="card-title fw-bold text-primary">
                      {pkg.name}
                    </h5>
                    <p className="card-text fw-semibold">
                      {(pkg.price_range ?? "").split(" (").map((part: string, i: number) => (
                        <React.Fragment key={i}>
                          {i > 0 && <br />}
                          {i > 0 ? `(${part}` : part}
                        </React.Fragment>
                      ))}
                    </p>
                    <div className="text-center">
                      <Link
                        href={`/tutor-package-details/${pkg.course_id}`}
                        className="btn btn-secondary-custom btn-sm w-50"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default Packages;
