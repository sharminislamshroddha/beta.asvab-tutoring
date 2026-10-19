import type { Metadata } from "next";
import { privacyPolicyMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = privacyPolicyMetadata();

export default function PrivacyPolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
