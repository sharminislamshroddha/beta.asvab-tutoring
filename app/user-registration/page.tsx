import type { Metadata } from "next";
import { fetchRegistrationTutoringCourseList } from "@/lib/php-api";
import RegisterPageClient from "./RegisterPageClient";

export const metadata: Metadata = {
  title: "Create Account | ASVAB Tutoring",
  description:
    "Register to get access to your course and study materials at ASVAB Tutoring.",
};

export const revalidate = 3600;

export default async function RegisterPage() {
  const { courses, services, sessionsByCourseService } =
    await fetchRegistrationTutoringCourseList();

  return (
    <RegisterPageClient
      initialCourses={courses}
      initialServices={services}
      initialSessionsByCourseService={sessionsByCourseService}
    />
  );
}
