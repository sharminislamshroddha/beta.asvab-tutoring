import TermsOfServiceContent from "./TermsOfServiceContent";
import { fetchTermsOfService } from "@/lib/php-api";

export const revalidate = 3600;

export default async function TermsOfServicePage() {
  const terms = await fetchTermsOfService();
  return <TermsOfServiceContent terms={terms} />;
}
