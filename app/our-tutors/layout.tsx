import type { Metadata } from "next";
import { ourTutorsMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = ourTutorsMetadata();

export default function OurTutorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
