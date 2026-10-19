import HowItWorksContent from "./HowItWorksContent";
import { fetchHowItWorksItems } from "@/lib/php-api";

export const revalidate = 3600;

export default async function HowItWorkPage() {
  const items = await fetchHowItWorksItems();
  return <HowItWorksContent items={items} />;
}
