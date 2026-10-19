import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/checkout",
        "/thank-you",
        "/buy-more-sessions",
        "/subscribe-again",
        "/user-login",
        "/user-registration",
        "/forgot-password",
        "/admin",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
