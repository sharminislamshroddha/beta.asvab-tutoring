import AboutUsContent from "./AboutUsContent";
import { fetchAboutUsItems } from "@/lib/php-api";

export const revalidate = 3600;

export default async function AboutUsPage() {
  const items = await fetchAboutUsItems();
  return <AboutUsContent items={items} />;
}
