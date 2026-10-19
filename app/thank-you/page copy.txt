import Link from "next/link";

type Method = "mobile" | "card";

export default function ThankYouPage({
  searchParams,
}: {
  searchParams?: { method?: string };
}) {
  const methodParam = (searchParams?.method || "").toLowerCase();
  const method: Method = methodParam === "mobile" ? "mobile" : "card";

  const title = method === "mobile" ? "Registration Completed" : "Payment Successful";

  const subtitle =
    method === "mobile"
      ? "Thanks! Your registration is complete."
      : "Thanks! Your payment has been completed.";

  const messageBlocks =
    method === "mobile" ? (
      <>
        <p className="mb-3" style={{ fontSize: 16, lineHeight: 1.6 }}>
          Congratulations, your registration has been done successfully. Your account will be
          activated by your tutor.
        </p>

        <p className="mb-0" style={{ fontSize: 16, lineHeight: 1.6 }}>
          After activation, you will be able to{" "}
          <Link href="/user-login" className="fw-bold text-decoration-underline">
            log in
          </Link>{" "}
          and start the online practice test. We will inform you when your account will be
          activated by your tutor within 24 hours.
        </p>
      </>
    ) : (
      <>
        <p className="mb-0" style={{ fontSize: 16, lineHeight: 1.6 }}>
          Congratulations, your payment has been done successfully. Now you can{" "}
          <Link href="/user-login" className="fw-bold text-decoration-underline">
            log in
          </Link>{" "}
          and start the online practice test.
        </p>
      </>
    );

  return (
    <main className="py-5" style={{ background: "#f8fafc", minHeight: "80vh" }}>
      <div className="container" style={{ maxWidth: 980 }}>
        <div className="row justify-content-center">
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm">
              {/* Header */}
              <div
                className="card-body p-4 p-md-5 text-center"
                style={{
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  background: "linear-gradient(135deg, rgba(242,161,85,0.14), rgba(0,35,65,0.08))",
                }}
              >
                {/* Check Icon */}
                <div
                  className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 999,
                    background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.25)",
                  }}
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="#16a34a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <h1 className="fw-bold mb-2" style={{ color: "#002341" }}>
                  {title}
                </h1>
                <p className="text-muted mb-0">{subtitle}</p>
              </div>

              {/* Content */}
              <div className="card-body p-4 p-md-5">
                <div className="mb-4">{messageBlocks}</div>

                <div className="d-flex flex-column flex-sm-row gap-2">
                  <Link
                    href="/user-login"
                    className="btn btn-primary-custom flex-fill"
                    style={{ padding: "12px 14px" }}
                  >
                    Go to Login
                  </Link>

                  <Link
                    href="/"
                    className="btn btn-outline-secondary flex-fill"
                    style={{ padding: "12px 14px" }}
                  >
                    Back to Home
                  </Link>
                </div>

                <div className="text-center mt-4">
                  <div className="text-muted" style={{ fontSize: 14 }}>
                    Thanks again,
                  </div>
                  <div className="fw-bold" style={{ color: "#002341", fontSize: 16 }}>
                    ASVAB Tutoring
                  </div>
                </div>
              </div>
            </div>

            {/* Small help note */}
            <div className="text-center mt-3 text-muted" style={{ fontSize: 13 }}>
              Need help? Email{" "}
              <a href="mailto:info@asvab-tutoring.com" className="text-decoration-underline">
                info@asvab-tutoring.com
              </a>{" "}
              or call{" "}
              <a href="tel:+17182006396" className="text-decoration-underline">
                (718) 200-6396
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
