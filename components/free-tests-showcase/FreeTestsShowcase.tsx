import Link from "next/link";
import { ALL_FREE_PREDICTION_TESTS_HREF } from "@/lib/prediction-test-links";
import "./freeTestsShowcase.css";

const FREE_TESTS = [
  {
    id: "practice",
    icon: "bi-clipboard-check",
    title: "Free Practice Tests",
    lead: "Build confidence before test day",
    description:
      "Work through realistic practice questions across every major exam subject. Get instant feedback, spot weak areas early, and sharpen the skills that move your score.",
    href: "/free-practice-tests",
    cta: "Take a Free Practice Test",
  },
  {
    id: "prediction",
    icon: "bi-stars",
    title: "Free Prediction Tests",
    lead: "See where you stand right now",
    description:
      "Take a short prediction assessment to estimate your current readiness. Use the results to focus your study plan and walk into tutoring sessions with clear goals.",
    href: ALL_FREE_PREDICTION_TESTS_HREF,
    cta: "Take a Free Prediction Test",
  },
] as const;

export default function FreeTestsShowcase() {
  return (
    <section id="free-tests" className="text-white pt-2 pb-5 px-3">
      <div className="text-center mb-4 position-relative">
        <h2 className="fw-bold display-6 d-inline-block pb-3 position-relative">
          Free Tests
          <img
            src="/images/border_v1.png"
            alt=""
            width={160}
            height={8}
            className="position-absolute start-50 translate-middle-x bottom-0"
            style={{ objectFit: "cover" }}
          />
        </h2>
        <p className="free-tests-showcase__intro mx-auto mt-3 mb-0">
          Not sure where to start? Browse through our list of free practice and prediction tests to
          measure your readiness and find the study path that fits you best.
        </p>
      </div>

      <div className="container">
        <div className="row g-4 justify-content-center">
          {FREE_TESTS.map((test) => (
            <div className="col-12 col-lg-6" key={test.id}>
              <article className="free-tests-showcase__panel h-100 d-flex flex-column">
                <div
                  className="free-tests-showcase__icon"
                  aria-hidden
                >
                  <i className={`bi ${test.icon}`} />
                </div>
                <h3 className="free-tests-showcase__title">{test.title}</h3>
                <p className="free-tests-showcase__lead">{test.lead}</p>
                <p className="free-tests-showcase__desc flex-grow-1">
                  {test.description}
                </p>
                <div className="mt-auto pt-3">
                  <Link
                    href={test.href}
                    className="btn btn-primary-custom px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2"
                  >
                    <i className={`bi ${test.icon}`} aria-hidden />
                    {test.cta}
                  </Link>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
