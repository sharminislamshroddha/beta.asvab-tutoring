import { absoluteUrl } from "@/lib/seo";

type ChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

function getPriority(path: string): number {
  if (path === "/") return 1;
  if (path.startsWith("/courses/")) return 0.9;
  if (path.startsWith("/services/") || path.startsWith("/pricing/")) return 0.9;
  if (path.startsWith("/package-details/")) return 0.8;
  if (path.startsWith("/blog-detail/")) return 0.6;
  if (path === "/blog") return 0.7;
  return 0.5;
}

function getChangeFrequency(path: string): ChangeFrequency {
  if (path.startsWith("/blog-detail/")) return "monthly";
  return "weekly";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemapXml(paths: string[]): string {
  const lastModified = new Date().toISOString();

  const urlEntries = paths
    .map((path) => {
      const loc = escapeXml(absoluteUrl(path));
      const changefreq = getChangeFrequency(path);
      const priority = getPriority(path).toFixed(1);

      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastModified}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlEntries,
    "</urlset>",
  ].join("\n");
}
