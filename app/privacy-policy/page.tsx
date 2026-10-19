import PrivacyPolicyContent from "./PrivacyPolicyContent";
import { fetchPrivacyPolicy } from "@/lib/php-api";

export const revalidate = 3600;

export default async function PrivacyPolicyPage() {
  const policy = await fetchPrivacyPolicy();
  return <PrivacyPolicyContent policy={policy} />;
}
