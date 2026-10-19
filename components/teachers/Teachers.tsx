"use client";

import Image from "next/image";
import Link from "next/link";
import type { TutorProfile } from "@/lib/php-api";

type Props = {
  initialTutors?: TutorProfile[];
};

export default function Teachers({ initialTutors = [] }: Props) {
  const homepageTutors = initialTutors.slice(0, 4);

  return (
    <section className="bg-dark-blue text-white py-5 mt-5 px-3">
      <div className="text-center mb-4 position-relative">
        <h2 className="fw-bold display-6 d-inline-block pb-3 position-relative">
          Meet Our Teachers
          <img
            src="/images/border_v1.png"
            alt="underline"
            width={160}
            height={8}
            className="position-absolute start-50 translate-middle-x bottom-0"
            style={{ objectFit: "cover" }}
            loading="lazy"
            decoding="async"
          />
        </h2>
      </div>

      <div className="container">
        {homepageTutors.length === 0 ? (
          <p className="text-center">No tutors available.</p>
        ) : (
          <div className="row g-4">
            {homepageTutors.map((teacher) => (
              <div className="col-md-6" key={teacher.id}>
                <div className="card h-100 shadow-sm text-center">
                  <div className="pt-4">
                    <Image
                      src={teacher.photo}
                      alt={teacher.name || "Tutor"}
                      width={220}
                      height={277}
                      style={{ objectFit: "contain" }}
                      unoptimized={true}
                      loading="lazy"
                    />
                  </div>
                  <div className="card-body d-flex flex-column text-start px-4">
                    <h5 className="card-title text-center fw-semibold mt-3">
                      {teacher.name || "No Name"}
                    </h5>
                    <p className="text-center text-primary small mb-3 fw-medium">
                      {teacher.designation || "Tutor"}
                    </p>
                    <div
                      className="card-text small"
                      dangerouslySetInnerHTML={{
                        __html: teacher.about || "No bio available.",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-4">
          <Link
            href="/our-tutors"
            className="btn btn-primary-custom text-white fw-semibold px-4 py-2"
          >
            See All Tutors
          </Link>
        </div>
      </div>
    </section>
  );
}
