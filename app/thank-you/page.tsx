import Link from "next/link";
import NextStepCard from "@/components/next-step-card/NextStepCard";
import { getSession } from "@/lib/auth-session";
import { STUDY_PORTAL_HREF } from "@/lib/portal-login";

type Method = "mobile" | "card";

export default async function ThankYouPage({
  searchParams,
}: {
  // Next.js 16: searchParams can be a Promise in Server Components
  searchParams?: Promise<{
    method?: string;
    id?: string;
    package_id?: string;
    buy_more?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};

  const methodParam = (params.method ?? "").toLowerCase();
  const method: Method = methodParam === "mobile" ? "mobile" : "card";

  const package_id = params.package_id || "";
  const oneOnOneArray: string[] = ["12", "14", "16", "18", "23", "28", "30"];
  const groupArray: string[] = ["15", "19", "29", "31"];
  const service = oneOnOneArray.includes(package_id)
    ? "1-on-1 Tutoring"
    : groupArray.includes(package_id)
      ? "Group Tutoring"
      : "";

  const buyMore = params.buy_more === "1";
  const isLoggedIn = await getSession()
    .then((session) => !!session)
    .catch(() => false);
  const canStartStudy = isLoggedIn || buyMore;

  const title = buyMore
    ? "Payment Successful"
    : method === "mobile" && !isLoggedIn
      ? "Registration Completed"
      : "Payment Successful";

  const subtitle = buyMore
    ? "Thanks! Your package purchase has been completed."
    : method === "mobile" && !isLoggedIn
      ? "Thanks! Your registration is complete."
      : "Thanks! Your payment has been completed.";

  const messageBlocks = buyMore ? (
    <>
      <p className="mb-3" style={{ fontSize: 16, lineHeight: 1.6 }}>
        Congratulations, your purchase has been completed successfully. The new
        session plan has been added to your account.
      </p>

      <p className="mb-0" style={{ fontSize: 16, lineHeight: 1.6 }}>
        You can now return to the portal and continue your learning.
      </p>
    </>
  ) : canStartStudy ? (
    <>
      <p className="mb-3" style={{ fontSize: 16, lineHeight: 1.6 }}>
        Congratulations, your purchase has been completed successfully. Access
        has been added to your account.
      </p>

      <p className="mb-0" style={{ fontSize: 16, lineHeight: 1.6 }}>
        You can start studying now.
      </p>
    </>
  ) : (
    <>
      <p className="mb-3" style={{ fontSize: 16, lineHeight: 1.6 }}>
        Congratulations, your registration has been done successfully. Your
        account will be activated by the admin soon.
      </p>

      <p className="mb-0" style={{ fontSize: 16, lineHeight: 1.6 }}>
        After activation, you will be able to{" "}
        <Link href="/user-login" className="fw-bold text-decoration-underline">
          log in
        </Link>{" "}
        and start the lessons.
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
                  background:
                    "linear-gradient(135deg, rgba(242,161,85,0.14), rgba(0,35,65,0.08))",
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
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
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

                <NextStepCard service={service} className={"mb-4"} />

                <div className="d-flex flex-column flex-sm-row gap-2">
                  {canStartStudy ? (
                    <a
                      href={STUDY_PORTAL_HREF}
                      className="btn btn-primary-custom flex-fill text-center"
                      style={{ padding: "12px 14px" }}
                    >
                      Start Studying Now
                    </a>
                  ) : (
                    <Link
                      href="/user-login"
                      className="btn btn-primary-custom flex-fill text-center"
                      style={{ padding: "12px 14px" }}
                    >
                      Go to Login
                    </Link>
                  )}

                  <Link
                    href="/"
                    className="btn btn-outline-secondary flex-fill text-center"
                    style={{ padding: "12px 14px" }}
                  >
                    Back to Home
                  </Link>
                </div>

                <div className="text-center mt-4">
                  <div className="text-muted" style={{ fontSize: 14 }}>
                    Thanks again,
                  </div>
                  <div
                    className="fw-bold"
                    style={{ color: "#002341", fontSize: 16 }}
                  >
                    ASVAB Tutoring
                  </div>
                </div>
              </div>
            </div>

            {/* Small help note */}
            <div
              className="text-center mt-3 text-muted"
              style={{ fontSize: 13 }}
            >
              Need help? Email{" "}
              <a
                href="mailto:info@asvab-tutoring.com"
                className="text-decoration-underline"
              >
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
