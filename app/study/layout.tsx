import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import StudyShell from "@/components/study/StudyShell";
import { getSession } from "@/lib/auth-session";
import { getStudyDashboard } from "@/lib/study-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "My Study | ASVAB Tutoring", template: "%s | My Study" },
  robots: { index: false, follow: false },
};

export default async function StudyLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/user-login");

  const dashboard = await getStudyDashboard();
  if (!dashboard.ok && dashboard.code === "invalid_token") redirect("/user-login");

  return <StudyShell dashboard={dashboard.ok ? dashboard.data : null}>{children}</StudyShell>;
}
