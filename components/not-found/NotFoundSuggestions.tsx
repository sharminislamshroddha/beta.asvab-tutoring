"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SerializableRouteIndex } from "@/lib/known-routes";
import { getNotFoundSuggestions } from "@/lib/not-found-suggestions";

type Props = {
  routeIndex: SerializableRouteIndex;
};

export default function NotFoundSuggestions({ routeIndex }: Props) {
  const pathname = usePathname() ?? "/";
  const result = getNotFoundSuggestions(pathname, routeIndex);

  return (
    <section className="bg-light pb-5 min-vh-50">
      <div className="container py-5">
        <div className="row g-4 g-lg-5 align-items-center">
          <div className="col-lg-5">
            <p className="display-1 fw-bold text-secondary mb-3">404</p>
            <h1 className="h2 mb-3">Page not found</h1>
            <p className="text-muted mb-0">
              We couldn&apos;t find the page you were looking for.{" "}
              <br />
              Sorry for the inconvenience.
            </p>
          </div>

          <div className="col-lg-7">
            <h2 className="h4 mb-2" style={{ color: "#f2a155" }}>
              {result.title}
            </h2>
            <p className="text-muted mb-4">{result.intro}</p>

            <ul className="list-unstyled d-flex flex-column gap-3 mb-0">
              {result.suggestions.map((suggestion) => (
                <li key={suggestion.href}>
                  <Link
                    href={suggestion.href}
                    className={`sitemap-link d-block p-3 shadow-sm rounded ${
                      suggestion.isPrimary ? "border border-warning" : ""
                    }`}
                  >
                    <span className="d-block fw-semibold">{suggestion.label}</span>
                    {suggestion.description ? (
                      <span className="d-block small text-muted mt-1">
                        {suggestion.description}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
