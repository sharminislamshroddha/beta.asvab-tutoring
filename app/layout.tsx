import type { Metadata } from "next";
import Script from "next/script";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";
import ScrollToTop from "@/components/scroll-to-top/ScrollToTop";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { fetchNavServices, fetchPublishableCourses, fetchFreePracticeTestCatalog, fetchFreePredTestCatalog } from "@/lib/php-api";
import { getSession } from "@/lib/auth-session";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";
import { SITE_URL } from "@/lib/seo";
import { HOME_SEO } from "@/lib/page-metadata";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: HOME_SEO.title,
  description: HOME_SEO.description,
  authors: [{ name: "ASVAB Tutoring" }],
  verification: {
    google: "tjKoBlCs6zhgP7CiS7k0C2U86ENYzEWPPsErD0ffpSU",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [courses, services, practiceCatalog, predictionCatalog, hasSession] =
    await Promise.all([
      fetchPublishableCourses(),
      fetchNavServices(),
      fetchFreePracticeTestCatalog(),
      fetchFreePredTestCatalog(),
      getSession()
        .then((session) => !!session)
        .catch(() => false),
    ]);

  const courseByCode = new Map(
    courses.map((course) => [course.course_code.toLowerCase(), course]),
  );

  const freePracticeCourses = practiceCatalog.map((entry) => {
    const match = courseByCode.get(entry.courseCode.toLowerCase());
    return {
      course_id: match?.course_id ?? entry.courseCode,
      course_code: entry.courseCode,
      name: match?.name ?? entry.courseName,
    };
  });

  const freePredictionCourses = predictionCatalog.map((entry) => {
    const match = courseByCode.get(entry.courseCode.toLowerCase());
    return {
      course_id: match?.course_id ?? entry.courseCode,
      course_code: entry.courseCode,
      name: match?.name ?? entry.courseName,
    };
  });

  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <AuthProvider hasSession={hasSession}>
          <ScrollToTop />
          <Navbar
            courses={courses}
            services={services}
            freePracticeCourses={freePracticeCourses}
            freePredictionCourses={freePredictionCourses}
          />
          <main className="site-main">{children}</main>
          <Footer />
        </AuthProvider>

        {/* Google Analytics Implementation */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2TE0FG0NK3"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2TE0FG0NK3');
          `}
        </Script>
      </body>
    </html>
  );
}
