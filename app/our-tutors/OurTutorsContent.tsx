import Image from "next/image";
import type { TutorProfile } from "@/lib/php-api";

type Props = {
  tutors: TutorProfile[];
};

export default function OurTutorsContent({ tutors }: Props) {
  return (
    <section className="bg-white text-dark">
      <div className="banner bg-black bg-opacity-50 mb-5 rounded-bottom flex flex-col items-center text-center">
        <h1 className="text-white text-center bg-black bg-opacity-50 py-3 px-4 rounded">
          Our Tutors
        </h1>
      </div>

      <div className="text-center position-relative mb-4">
        <h2 className="fw-bold display-6 d-inline-block pb-3 position-relative">
          Meet Our Teachers
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

      <div className="container mb-5">
        {tutors.length > 0 ? (
          <div className="row g-4">
            {tutors.map((teacher) => (
              <div className="col-md-6 col-lg-6" key={teacher.id}>
                <div className="card h-100 shadow-sm text-center">
                  <div className="pt-4">
                    <Image
                      src={teacher.photo}
                      alt={teacher.name || "Tutor"}
                      width={220}
                      height={277}
                      style={{ objectFit: "contain" }}
                      unoptimized={true}
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
        ) : (
          <p className="text-center">No tutors available at the moment.</p>
        )}
      </div>
    </section>
  );
}
