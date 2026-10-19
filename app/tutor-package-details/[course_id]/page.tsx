"use client";

import React, { use, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "../packageDetails.module.css";
import PaymentMethodSection from "@/components/payment-list/paymentList";
import Link from "next/link";
function decodeHtmlEntities(input: string): string {
  if (!input) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = input;
  return txt.value;
}

function cleanQuestionText(input: string): string {
  if (!input) return "";

  let decoded = decodeHtmlEntities(input);

  decoded = decoded.replace(/<br\s*\/?>/gi, "\n");
  decoded = decoded.replace(/<p[^>]*>/gi, "").replace(/<\/p>/gi, "\n\n");
  decoded = decoded
    .replace(/<h[1-6][^>]*>/gi, "")
    .replace(/<\/h[1-6]>/gi, "\n\n");
  decoded = decoded.replace(/<li[^>]*>/gi, "• ").replace(/<\/li>/gi, "\n");
  decoded = decoded
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "\t")
    .replace(/<\/th>/gi, "\t");
  decoded = decoded.replace(/<[^>]*>/g, "");
  decoded = decoded.replace(/\\\(|\\\)/g, "");
  decoded = decoded.replace(/\^(\d+)\/_({?)(\d+)(}?)/g, "$1/$3");

  return decoded.trim();
}

function renderTextWithLineBreaks(text: string) {
  return text.split(/\r?\n/).map((line, idx) => (
    <p key={idx} style={{ marginBottom: "0.8em", whiteSpace: "pre-wrap" }}>
      {line}
    </p>
  ));
}

// ✅ params is required in a dynamic route
export default function PackageDetailsPage({
  params,
}: {
  params: Promise<{ course_id: string }>;
}) {
  const { course_id } = use(params);
  const router = useRouter();
  const [courseData, setCourseData] = useState<any>(null);

  useEffect(() => {
    async function fetchCourseData() {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_PHP_API_URL!, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            action: "tutoring-package-details-page",
            course_id: String(course_id),
          }),
        });

        const data = await res.json();
        setCourseData(data);
      } catch (err) {
        console.error("API error:", err);
      }
    }

    fetchCourseData();
  }, [course_id]); // 🔑 fetch new data when URL param changes

  if (!courseData) {
    return <p className="text-center py-5">Loading...</p>;
  }

  return (
    <main>
      {/* Top Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-6 text-center">
              <Image
                src={courseData.image_src}
                alt={courseData.course_name}
                width={600}
                height={400}
                className="img-fluid rounded shadow-sm"
                style={{ objectFit: "cover" }}
                unoptimized
              />
            </div>

            <div className="col-lg-6 text-start">
              <h2 className="fw-bold text-uppercase">
                {courseData.course_name}
              </h2>
              <h4 className="fw-bold text-success mb-3">
                {(courseData.price_range ?? "").split(" (").map((part: string, i: number) => (
                  <React.Fragment key={i}>
                    {i > 0 && <br />}
                    {i > 0 ? `(${part}` : part}
                  </React.Fragment>
                ))}
              </h4>

              {renderTextWithLineBreaks(
                cleanQuestionText(courseData.course_intro),
              )}

              <div className="mt-4">
                <Image
                  src="/images/send-payment_20251230.png"
                  alt="Payment info"
                  width={600}
                  height={400}
                  className="img-fluid rounded shadow-sm"
                  style={{ objectFit: "cover" }}
                />
                {/* < PaymentMethodSection /> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Packages */}
      {courseData.data?.map((pkg: any) => (
        <section key={pkg.package_id} className="py-5">
          <div className="container text-center">
            <h1 className={styles.heroTitle}>{pkg.title}</h1>

            <div
              className="mx-auto text-start"
              style={{ marginTop: "1rem", marginBottom: "2rem" }}
            >
              {renderTextWithLineBreaks(cleanQuestionText(pkg.description))}
            </div>

            <div
              className={styles.pricingGrid}
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: "2rem",
              }}
            >
              {pkg.sessions.map((session: any) => (
                <div
                  key={session.session_id}
                  className={`${styles.pricingCard} ${
                    session.is_most_popular === "1"
                      ? styles.mostPopularWrap
                      : ""
                  }`}
                  style={{
                    flex: "0 0 300px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "300px",
                  }}
                >
                  {session.is_most_popular === "1" && (
                    <div className={styles.mostPopularBadge}>Most Popular</div>
                  )}
                  {/* <div className={styles.cardInner}>
                    <h4 className={styles.cardTitle}>{session.title}</h4>
                    <div className={styles.price}>${session.price}</div>
                    <div className="text-start" style={{ marginTop: '0.5rem' }}>
                      {renderTextWithLineBreaks(cleanQuestionText(session.feature))}
                    </div>
                  </div> */}
                  <div className={styles.cardInner}>
                    <h4 className={styles.cardTitle}>{session.title}</h4>

                    <div className={styles.price}>${session.price}</div>

                    <div className="text-start" style={{ marginTop: "0.5rem" }}>
                      {renderTextWithLineBreaks(
                        cleanQuestionText(session.feature),
                      )}
                    </div>

                    {/* Dynamic Enroll Button */}
                    <div className="mt-3 text-center">
                      <Link
                        href={{
                          pathname: "/checkout",
                          query: {
                            course_id: String(course_id),
                            session_id: String(session.session_id),
                            amount: String(
                              Math.round(Number(session.price) * 100),
                            ), // cents (integer)
                          },
                        }}
                      >
                        <button className="btn btn-primary-custom mt-4 px-5 py-2">
                          Enroll Now
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <div className="container">
        {/* Notes */}
        <p
          className="  fs-6 text-start mx-auto mb-3"
          style={{ maxWidth: "960px" }}
        >
          <span className="fw-semibold text-danger">NOTE:</span> No session will
          be scheduled without payment information on file. Students are
          required to submit homework before each session.
        </p>
        <p
          className="  fs-6 text-start mx-auto mb-5"
          style={{ maxWidth: "960px" }}
        >
          <span className="fw-semibold text-primary">Cancellation Policy:</span>{" "}
          If you want to cancel a session or reschedule, 24 hrs. advance notice
          is required. You can cancel the entire service within 7 days.
        </p>

        {/* Enroll Button (conditionally visible) */}
        {/* {showEnrollButton && (
          <Link
            href="/pricing-page"
            className="btn btn-primary-custom fw-semibold text-white px-4 py-2 mb-4"
          >
            ENROLL NOW
          </Link>
        )} */}
      </div>

      {/* Related Courses Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <h5 className="mb-4 text-uppercase fs-3 fw-bold text-center">
            Related Packages
          </h5>

          <div className="row g-4">
            {courseData.related_courses?.length > 0 ? (
              courseData.related_courses.map((rel: any) => (
                <div
                  key={rel.course_id}
                  className="col-12 col-sm-6 col-md-4 col-lg-3"
                >
                  <div
                    className="card h-100 shadow-sm border-0 cursor-pointer"
                    style={{ borderRadius: "10px" }}
                    onClick={() =>
                      router.push(`/tutor-package-details/${rel.course_id}`)
                    }
                  >
                    <div className="card-body p-3 d-flex flex-column">
                      <Image
                        src={rel.image}
                        alt={rel.name}
                        width={300}
                        height={200}
                        className="rounded mb-3 w-100"
                        style={{ objectFit: "cover", height: "200px" }}
                        unoptimized
                        loading="lazy"
                      />
                      <h6
                        className="fw-semibold mb-2"
                        style={{ color: "#e58a34" }}
                      >
                        {rel.name}
                      </h6>
                      <p className="fw-bold text-success mb-0 mt-auto">
                        {(rel.price_range ?? "").split(" (").map((part: string, i: number) => (
                          <React.Fragment key={i}>
                            {i > 0 && <br />}
                            {i > 0 ? `(${part}` : part}
                          </React.Fragment>
                        ))}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="  text-center">No related packages available.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
