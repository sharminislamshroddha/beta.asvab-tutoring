import type { Metadata } from "next";
import NotFoundSuggestions from "@/components/not-found/NotFoundSuggestions";
import { fetchKnownRouteIndex } from "@/lib/known-routes";

export const metadata: Metadata = {
  title: "Page Not Found | ASVAB Tutoring",
  description: "The page you requested could not be found.",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function NotFound() {
  const routeIndex = await fetchKnownRouteIndex();

  return <NotFoundSuggestions routeIndex={routeIndex} />;
}
