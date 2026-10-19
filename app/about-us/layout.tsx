import type { Metadata } from "next";
import { aboutUsMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = aboutUsMetadata();

export default function AboutUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
