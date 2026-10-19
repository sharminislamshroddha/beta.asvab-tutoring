import { fetchSitemapPaths } from "@/lib/sitemap-data";
import { buildSitemapXml } from "@/lib/sitemap-xml";

export const revalidate = 3600;

export async function GET() {
  const paths = await fetchSitemapPaths();
  const xml = buildSitemapXml(paths);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
