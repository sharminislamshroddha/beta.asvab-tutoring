"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import AlreadySignedInCard from "@/components/auth/AlreadySignedInCard";
import RegisterForm from "./RegisterForm";
import type {
  PackageSession,
  RegistrationCourseWithServices,
} from "@/lib/php-api";

export default function RegisterPageClient({
  initialCourses = [],
  initialServices = {},
  initialSessionsByCourseService = {},
}: {
  initialCourses?: RegistrationCourseWithServices[];
  initialServices?: Record<string, number>;
  initialSessionsByCourseService?: Record<string, PackageSession[]>;
}) {
  const { user, loggingOut, logout } = useAuth();

  if (user) {
    return (
      <AlreadySignedInCard
        variant="register"
        user={user}
        loggingOut={loggingOut}
        onLogout={() => {
          void logout("/user-registration");
        }}
      />
    );
  }

  return (
    <RegisterForm
      initialCourses={initialCourses}
      initialServices={initialServices}
      initialSessionsByCourseService={initialSessionsByCourseService}
    />
  );
}
