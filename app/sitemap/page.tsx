import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/breadcrumb/Breadcrumb";
import { fetchSitemapPageSections, type SitemapSection } from "@/lib/sitemap-data";
import { sitemapMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = sitemapMetadata();

export const revalidate = 3600;

function getTotalLinks(sections: SitemapSection[]): number {
  return sections.reduce(
    (total, section) => total + (section.links?.length ?? 0),
    0,
  );
}

export default async function SitemapPage() {
  const sections = await fetchSitemapPageSections();
  const totalLinks = getTotalLinks(sections);

  return (
    <section className="bg-light pb-5">
      <div className="banner bg-black bg-opacity-50 py-3 px-4 rounded flex flex-col items-center text-center mb-5">
        <h1 className="text-white mb-2 text-3xl font-bold">Sitemap</h1>
        <Breadcrumb
          segments={["sitemap"]}
          className="text-white text-base mt-1"
        />
      </div>

      <main className="container">
        {sections.length === 0 ? (
          <p className="text-center text-muted">
            Sitemap links are temporarily unavailable. Please try again later.
          </p>
        ) : (
          <>
            <p className="text-center text-muted mb-5">
              {totalLinks} pages across {sections.length} sections
            </p>

            <nav aria-label="Sitemap" className="d-flex flex-column gap-5">
              {sections.map((section) => {
                const isBlogSection = section.category === "Blog Articles";

                return (
                  <section
                    key={section.category}
                    aria-labelledby={`sitemap-${section.category}`}
                  >
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 pb-2 border-bottom">
                      <h2
                        id={`sitemap-${section.category}`}
                        className="h4 mb-0"
                        style={{ color: "#f2a155" }}
                      >
                        {section.category}
                      </h2>
                      <span className="badge rounded-pill text-bg-secondary">
                        {section.links?.length ?? 0}{" "}
                        {(section.links?.length ?? 0) === 1 ? "link" : "links"}
                      </span>
                    </div>

                    <ul
                      className={`row g-3 list-unstyled mb-0 ${
                        isBlogSection
                          ? "row-cols-1 row-cols-md-2 row-cols-xl-3"
                          : "row-cols-1 row-cols-md-2 row-cols-lg-3"
                      }`}
                    >
                      {(section.links ?? []).map((link) => (
                        <li key={link.path} className="col">
                          <Link
                            href={link.path}
                            className={`sitemap-link d-block p-3 h-100 shadow-sm rounded ${
                              isBlogSection ? "small" : ""
                            }`}
                          >
                            <span className="d-block fw-semibold">
                              {link.label}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </nav>
          </>
        )}
      </main>
    </section>
  );
}
