"use client";

import Link from "next/link";
import { decodeHtml } from "@/lib/decode-html";
import type { ContentBlock } from "@/lib/php-api";

type Props = {
  initialWelcome?: ContentBlock | null;
};

export default function WelcomeSection({ initialWelcome = null }: Props) {
  const welcome = initialWelcome;

  return (
    <section className="py-5 bg-white px-3" data-navbar-auto-hide-anchor>
      <div className="container">
        <div className="text-center position-relative">
          <h2 className="fw-bold display-6 text-dark position-relative d-inline-block pb-3">
            {welcome?.title || "Welcome"}
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

        <div className="my-4 fs-5">
          {welcome ? (
            <div
              className="fs-6"
              dangerouslySetInnerHTML={{
                __html: decodeHtml(welcome.description),
              }}
            />
          ) : (
            <p className="text-center text-muted">
              Welcome content is not available at the moment.
            </p>
          )}
        </div>

        <div className="text-center">
          <Link href="/about-us">
            <button className="btn btn-primary-custom px-4 py-2">
              Read More
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
