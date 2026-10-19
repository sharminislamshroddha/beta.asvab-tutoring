import type { Metadata } from "next";
import { termsOfServiceMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = termsOfServiceMetadata();

export default function TermsOfServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
