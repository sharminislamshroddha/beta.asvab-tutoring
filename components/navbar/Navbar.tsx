"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FaPhone,
  FaEnvelope,
  FaApple,
  FaBars,
  FaCaretDown,
  FaCaretRight,
  FaSignInAlt,
  FaUserPlus,
  FaSignOutAlt,
  FaBookOpen,
} from "react-icons/fa";
import { useState, useEffect, useRef } from "react";
import {
  COURSE_CATEGORY_LABELS,
  groupCoursesByCategory,
} from "@/lib/package-utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { STUDY_PORTAL_HREF } from "@/lib/portal-login";
import type { AuthUser } from "@/lib/auth-session";

type Course = {
  course_id: string;
  course_code: string;
  name: string;
};

type Service = {
  service_id: string;
  course_name: string;
};

function firstInitial(value: string): string {
  const match = value.trim().match(/[\p{L}\p{N}]/u);
  return match ? match[0].toUpperCase() : "";
}

function userInitials(user: AuthUser): string {
  const first = firstInitial(user.first_name);
  const last = firstInitial(user.last_name);
  if (first && last) return `${first}${last}`;
  if (first) {
    const parts = user.first_name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const second = firstInitial(parts[parts.length - 1]);
      if (second) return `${first}${second}`;
    }
    return user.first_name.trim().slice(0, 2).toUpperCase() || first;
  }
  if (last) return user.last_name.trim().slice(0, 2).toUpperCase() || last;
  const local = user.email.split("@")[0] || "";
  return local.slice(0, 2).toUpperCase() || "?";
}

function userFullName(user: AuthUser): string {
  return `${user.first_name} ${user.last_name}`.trim() || user.email || "Account";
}

function NavbarUserAvatar({ user }: { user: AuthUser }) {
  const fullName = userFullName(user);
  return (
    <span
      className="navbar-user-avatar"
      title={fullName}
      aria-label={fullName}
      role="img"
    >
      {userInitials(user)}
    </span>
  );
}

function CourseNavGroups({
  courses,
  variant,
  onLinkClick,
  hrefFor = (course) => `/courses/${course.course_code}`,
}: {
  courses: Course[];
  variant: "desktop" | "mobile";
  onLinkClick?: () => void;
  hrefFor?: (course: Course) => string;
}) {
  const { militaryTestPrep, healthcareTestPrep, academicTestPrep } =
    groupCoursesByCategory(courses);

  const populatedCategoryCount = [
    militaryTestPrep.length > 0,
    healthcareTestPrep.length > 0,
    academicTestPrep.length > 0,
  ].filter(Boolean).length;
  const showCategoryLabels = populatedCategoryCount > 1;

  const renderCourse = (course: Course) => (
    <li
      key={course.course_id}
      className={`navbar-course-item ${variant === "mobile" ? "nav-item" : ""}`}
    >
      <Link
        className={variant === "desktop" ? "dropdown-item" : "nav-link text-white"}
        href={hrefFor(course)}
        onClick={onLinkClick}
      >
        {course.name}
      </Link>
    </li>
  );

  const renderGroup = (
    label: string,
    groupCourses: Course[],
    showDivider: boolean,
  ) => {
    if (groupCourses.length === 0) return null;

    return (
      <>
        {showDivider && variant === "desktop" && (
          <li>
            <hr className="dropdown-divider my-1" />
          </li>
        )}
        {showCategoryLabels && (
          <li
            className={variant === "mobile" ? "nav-item" : undefined}
            aria-hidden="true"
          >
            <span className="navbar-course-category">{label}</span>
          </li>
        )}
        {groupCourses.map(renderCourse)}
      </>
    );
  };

  return (
    <>
      {renderGroup(
        COURSE_CATEGORY_LABELS["military test prep"],
        militaryTestPrep,
        false,
      )}
      {renderGroup(
        COURSE_CATEGORY_LABELS["healthcare test prep"],
        healthcareTestPrep,
        showCategoryLabels && militaryTestPrep.length > 0,
      )}
      {renderGroup(
        COURSE_CATEGORY_LABELS["academic test prep"],
        academicTestPrep,
        showCategoryLabels &&
          (militaryTestPrep.length > 0 || healthcareTestPrep.length > 0),
      )}
    </>
  );
}

function FreeTestsNavGroups({
  practiceCourses,
  predictionCourses,
  variant,
  onLinkClick,
  practiceOpen = false,
  predictionOpen = false,
  onTogglePractice,
  onTogglePrediction,
  isParentOpen = false,
}: {
  practiceCourses: Course[];
  predictionCourses: Course[];
  variant: "desktop" | "mobile";
  onLinkClick?: () => void;
  practiceOpen?: boolean;
  predictionOpen?: boolean;
  onTogglePractice?: () => void;
  onTogglePrediction?: () => void;
  isParentOpen?: boolean;
}) {
  const [desktopOpenGroup, setDesktopOpenGroup] = useState<
    "practice" | "prediction" | null
  >(null);

  useEffect(() => {
    if (variant === "desktop" && !isParentOpen) {
      setDesktopOpenGroup(null);
    }
  }, [variant, isParentOpen]);

  const renderTestCourseGroups = (
    courses: Course[],
    testPathSuffix: "free-practice-test" | "free-prediction-test",
  ) => (
    <CourseNavGroups
      courses={courses}
      variant={variant}
      onLinkClick={onLinkClick}
      hrefFor={(course) => `/courses/${course.course_code}/${testPathSuffix}`}
    />
  );

  const renderDesktopGroup = (
    groupKey: "practice" | "prediction",
    label: string,
    hubHref: string,
    testPathSuffix: "free-practice-test" | "free-prediction-test",
    courses: Course[],
  ) => {
    if (courses.length === 0) return null;

    const isOpen = desktopOpenGroup === groupKey;

    return (
      <li
        className={`navbar-free-tests-submenu ${isOpen ? "show" : ""}`}
        onMouseEnter={() => setDesktopOpenGroup(groupKey)}
        onMouseLeave={() =>
          setDesktopOpenGroup((current) =>
            current === groupKey ? null : current,
          )
        }
      >
        <Link
          className="navbar-course-category navbar-course-category--link navbar-free-tests-submenu-trigger"
          href={hubHref}
          onClick={onLinkClick}
        >
          <span>{label}</span>
          <FaCaretRight className="navbar-free-tests-submenu-caret" aria-hidden />
        </Link>
        <ul
          className={`dropdown-menu navbar-free-tests-submenu-menu ${isOpen ? "show" : ""}`}
        >
          {renderTestCourseGroups(courses, testPathSuffix)}
        </ul>
      </li>
    );
  };

  const renderMobileGroup = (
    label: string,
    testPathSuffix: "free-practice-test" | "free-prediction-test",
    courses: Course[],
    isOpen: boolean,
    onToggle?: () => void,
  ) => {
    if (courses.length === 0) return null;

    return (
      <li className="nav-item">
        <button
          type="button"
          className="navbar-free-tests-category navbar-free-tests-category--toggle w-100 d-flex align-items-center justify-content-between gap-2"
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${label}`}
          onClick={onToggle}
        >
          <span className="navbar-course-category">{label}</span>
          <FaCaretDown
            className={`navbar-free-tests-category-caret ${isOpen ? "navbar-caret-open" : ""}`}
            aria-hidden
          />
        </button>
        <ul
          className={`navbar-nav ps-3 navbar-mobile-submenu ${isOpen ? "show" : ""}`}
        >
          {renderTestCourseGroups(courses, testPathSuffix)}
        </ul>
      </li>
    );
  };

  if (variant === "mobile") {
    return (
      <>
        {renderMobileGroup(
          "Free Practice Tests",
          "free-practice-test",
          practiceCourses,
          practiceOpen,
          onTogglePractice,
        )}
        {renderMobileGroup(
          "Free Prediction Tests",
          "free-prediction-test",
          predictionCourses,
          predictionOpen,
          onTogglePrediction,
        )}
      </>
    );
  }

  return (
    <>
      {renderDesktopGroup(
        "practice",
        "Free Practice Tests",
        "/free-practice-tests",
        "free-practice-test",
        practiceCourses,
      )}
      {renderDesktopGroup(
        "prediction",
        "Free Prediction Tests",
        "/free-prediction-tests",
        "free-prediction-test",
        predictionCourses,
      )}
    </>
  );
}

export default function Navbar({
  courses = [],
  services = [],
  freePracticeCourses = [],
  freePredictionCourses = [],
}: {
  courses?: Course[];
  services?: Service[];
  freePracticeCourses?: Course[];
  freePredictionCourses?: Course[];
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const navRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const headerHeightRef = useRef(0);
  const lastScrollY = useRef(0);
  const isNavbarVisibleRef = useRef(true);
  const isMenuOpenRef = useRef(isMenuOpen);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const [isCoursesOpen, setIsCoursesOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isFreeTestsOpen, setIsFreeTestsOpen] = useState(false);
  const [isFreePracticeOpen, setIsFreePracticeOpen] = useState(false);
  const [isFreePredictionOpen, setIsFreePredictionOpen] = useState(false);
  const { user: authUser, loggingOut, logout } = useAuth();

  const handleLogout = async () => {
    handleLinkClick();
    await logout();
  };

  const getServiceSlug = (serviceId: string) => {
    switch (serviceId) {
      case "2":
        return "1-on-1-tutoring";
      case "3":
        return "group-tutoring";
      case "4":
        return "self-study";
      default:
        return "unknown";
    }
  };

  const closeAll = () => {
    setIsMenuOpen(false);
    setIsCoursesOpen(false);
    setIsServicesOpen(false);
    setIsPricingOpen(false);
    setIsFreeTestsOpen(false);
    setIsFreePracticeOpen(false);
    setIsFreePredictionOpen(false);
  };

  useEffect(() => {
    isMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  // Auto-hide header on scroll down below 1180px
  useEffect(() => {
    const AUTO_HIDE_MAX_WIDTH = 1180;
    const HIDE_DELTA = 10;
    const SHOW_DELTA = 5;
    let ticking = false;

    const getHeaderHeight = () => {
      if (headerHeightRef.current > 0) {
        return headerHeightRef.current;
      }
      return headerRef.current?.offsetHeight ?? 0;
    };

    const syncHeaderHeight = () => {
      if (!headerRef.current) return;

      const height = headerRef.current.offsetHeight;
      if (height > 0) {
        headerHeightRef.current = height;
        document.documentElement.style.setProperty(
          "--navbar-header-height",
          `${height}px`,
        );
      }
    };

    const getAutoHideThreshold = (scrollY: number) => {
      const headerHeight = getHeaderHeight();
      const anchor = document.querySelector("[data-navbar-auto-hide-anchor]");

      if (anchor) {
        const anchorTop = anchor.getBoundingClientRect().top + scrollY;
        return Math.max(headerHeight, anchorTop - headerHeight);
      }

      return headerHeight;
    };

    const setNavbarVisible = (visible: boolean) => {
      if (isNavbarVisibleRef.current === visible) return;
      isNavbarVisibleRef.current = visible;
      setIsNavbarVisible(visible);
    };

    const updateNavbarOnScroll = () => {
      ticking = false;

      if (window.innerWidth >= AUTO_HIDE_MAX_WIDTH) {
        setNavbarVisible(true);
        return;
      }

      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;
      const autoHideThreshold = getAutoHideThreshold(currentScrollY);

      if (isMenuOpenRef.current) {
        setNavbarVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (currentScrollY < autoHideThreshold) {
        setNavbarVisible(true);
      } else if (delta > HIDE_DELTA) {
        setNavbarVisible(false);
      } else if (delta < -SHOW_DELTA) {
        setNavbarVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateNavbarOnScroll);
      }
    };

    const handleResize = () => {
      syncHeaderHeight();

      if (window.innerWidth >= AUTO_HIDE_MAX_WIDTH) {
        setNavbarVisible(true);
      }
    };

    syncHeaderHeight();
    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      document.documentElement.style.removeProperty("--navbar-header-height");
    };
  }, []);

  // Lock page scroll while the mobile menu is open (html only — avoid body position:fixed)
  useEffect(() => {
    if (!isMenuOpen) return;

    const { documentElement: html } = document;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    html.classList.add("navbar-mobile-menu-open");
    document.body.classList.add("navbar-mobile-menu-open");
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const preventBackgroundTouchMove = (event: TouchEvent) => {
      const target = event.target as Node;
      if (mobileMenuRef.current?.contains(target)) {
        return;
      }
      event.preventDefault();
    };

    document.addEventListener("touchmove", preventBackgroundTouchMove, {
      passive: false,
    });

    return () => {
      document.removeEventListener("touchmove", preventBackgroundTouchMove);
      html.classList.remove("navbar-mobile-menu-open");
      document.body.classList.remove("navbar-mobile-menu-open");
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isMenuOpen]);

  // Size the scrollable menu panel below the mobile nav bar
  useEffect(() => {
    if (!isMenuOpen || !navRef.current) return;

    const updateMenuOffset = () => {
      const navBottom = navRef.current?.getBoundingClientRect().bottom ?? 0;
      document.documentElement.style.setProperty(
        "--navbar-mobile-header-offset",
        `${navBottom}px`,
      );
    };

    const rafId = requestAnimationFrame(updateMenuOffset);
    window.addEventListener("resize", updateMenuOffset);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateMenuOffset);
      document.documentElement.style.removeProperty("--navbar-mobile-header-offset");
    };
  }, [isMenuOpen]);

  // Close navbar on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const clickedNav = navRef.current?.contains(target);
      const clickedMenu = mobileMenuRef.current?.contains(target);

      if (isMenuOpen && !clickedNav && !clickedMenu) {
        closeAll();
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isMenuOpen]);

  const handleLinkClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 992) {
      closeAll();
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);

    // Close all submenus when main menu toggles
    setIsCoursesOpen(false);
    setIsServicesOpen(false);
    setIsPricingOpen(false);
    setIsFreeTestsOpen(false);
    setIsFreePracticeOpen(false);
    setIsFreePredictionOpen(false);
  };

  // When opening one submenu, close others (mobile only)
  const toggleCourses = () => {
    setIsCoursesOpen(!isCoursesOpen);
    setIsServicesOpen(false);
    setIsPricingOpen(false);
    setIsFreeTestsOpen(false);
    setIsFreePracticeOpen(false);
    setIsFreePredictionOpen(false);
  };

  const toggleServices = () => {
    setIsServicesOpen(!isServicesOpen);
    setIsCoursesOpen(false);
    setIsPricingOpen(false);
    setIsFreeTestsOpen(false);
    setIsFreePracticeOpen(false);
    setIsFreePredictionOpen(false);
  };

  const togglePricing = () => {
    setIsPricingOpen(!isPricingOpen);
    setIsCoursesOpen(false);
    setIsServicesOpen(false);
    setIsFreeTestsOpen(false);
    setIsFreePracticeOpen(false);
    setIsFreePredictionOpen(false);
  };

  const toggleFreeTests = () => {
    const nextOpen = !isFreeTestsOpen;
    setIsFreeTestsOpen(nextOpen);
    setIsCoursesOpen(false);
    setIsServicesOpen(false);
    setIsPricingOpen(false);
    if (!nextOpen) {
      setIsFreePracticeOpen(false);
      setIsFreePredictionOpen(false);
    }
  };

  return (
    <header
      ref={headerRef}
      className={`navbar-site-header fixed-top ${!isNavbarVisible ? "navbar-site-header--hidden" : ""} ${isMenuOpen ? "navbar-site-header--menu-open" : ""}`}
    >
      {/* 🔹 Top Contact Bar */}
      <div className="bg-custom-secondary primary-color-custom d-none d-lg-block py-2">
        <div
          className="container-sm d-flex justify-content-between align-items-center small"
          style={{ maxWidth: "1166px", margin: "0 auto" }}
        >
          <div className="d-flex align-items-center gap-3">
            <FaPhone />
            <a
              href="tel:+17182006396"
              className="primary-color-custom text-decoration-none"
            >
              (718)-200-6396
            </a>
            <FaEnvelope />
            <a
              href="mailto:info@asvab-tutoring.com"
              className="primary-color-custom text-decoration-none"
            >
              info@asvab-tutoring.com
            </a>
          </div>
          <div className="d-flex align-items-center gap-2">
            <FaApple />
            <Link
              href="/our-mobile-apps"
              className="primary-color-custom text-decoration-none"
            >
              Our Mobile Apps
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav
        ref={navRef}
        className="navbar navbar-expand-lg bg-custom-secondary text-white py-2 py-md-3"
      >
        <div className="container d-flex justify-content-between align-items-center px-3">
          {/* MOBILE HEADER */}
          <div className="d-flex d-lg-none justify-content-between align-items-center w-100">
            <Link href="/" className="navbar-brand">
              <img
                src="/images/asvab-tutoring-logo.webp"
                width="65"
                height="65"
                alt="Logo"
              />
            </Link>

            <button
              className="navbar-toggler border-0"
              type="button"
              onClick={toggleMenu}
              aria-expanded={isMenuOpen}
              aria-controls="navbar-mobile-menu"
            >
              <FaBars
                size={26}
                className={isMenuOpen ? "primary-color-custom" : "text-white"}
              />
            </button>
          </div>

          {/* DESKTOP MENU */}
          <div className="d-none d-lg-flex justify-content-center align-items-center w-100">
            {/* LEFT MENU */}
            <ul className="navbar-nav flex-row flex-nowrap align-items-center me-2 gap-3 gap-lg-4">
              <li className="nav-item">
                <Link href="/" className="nav-link text-white px-2">
                  HOME
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/about-us" className="nav-link text-white px-2">
                  ABOUT US
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/how-it-works" className="nav-link text-white px-2">
                  HOW IT WORKS
                </Link>
              </li>

              {/* COURSES */}
              <li
                className="nav-item dropdown"
                onMouseEnter={() => setIsCoursesOpen(true)}
                onMouseLeave={() => setIsCoursesOpen(false)}
              >
                <span
                  className="nav-link text-white d-flex align-items-center gap-1 px-2"
                  role="button"
                >
                  COURSES{" "}
                  <FaCaretDown
                    className={`fs-6 navbar-dropdown-caret ${isCoursesOpen ? "navbar-caret-open" : ""}`}
                  />
                </span>
                <ul
                  className={`dropdown-menu navbar-courses-menu mt-0 ${isCoursesOpen ? "show" : ""}`}
                >
                  <CourseNavGroups courses={courses} variant="desktop" />
                </ul>
              </li>

              {/* FREE TESTS */}
              <li
                className="nav-item dropdown"
                onMouseEnter={() => setIsFreeTestsOpen(true)}
                onMouseLeave={() => setIsFreeTestsOpen(false)}
              >
                <span
                  className="nav-link text-white d-flex align-items-center gap-1 px-2"
                  role="button"
                >
                  FREE TESTS{" "}
                  <FaCaretDown
                    className={`fs-6 navbar-dropdown-caret ${isFreeTestsOpen ? "navbar-caret-open" : ""}`}
                  />
                </span>
                <ul
                  className={`dropdown-menu navbar-free-tests-menu mt-0 ${isFreeTestsOpen ? "show" : ""}`}
                >
                  <FreeTestsNavGroups
                    practiceCourses={freePracticeCourses}
                    predictionCourses={freePredictionCourses}
                    variant="desktop"
                    onLinkClick={handleLinkClick}
                    isParentOpen={isFreeTestsOpen}
                  />
                </ul>
              </li>

              {/* SERVICES */}
              {/* <li className="nav-item dropdown"
                onMouseEnter={() => setIsServicesOpen(true)}
                onMouseLeave={() => setIsServicesOpen(false)}
              >
                <span className="nav-link text-white d-flex align-items-center gap-1 px-2" role="button">
                  SERVICES <FaCaretDown className="fs-6" />
                </span>
                <ul className={`dropdown-menu mt-0 ${isServicesOpen ? "show" : ""}`}>
                  {services.map((service) => (
                    <li key={service.service_id}>
                      <Link className="dropdown-item" href={`/service-detail/${service.service_id}`}>
                        {service.course_name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li> */}

              {/* <li className="nav-item">
                <Link href="/how-it-works" className="nav-link text-white px-2">HOW IT WORKS</Link>
              </li> */}
            </ul>

            {/* CENTER LOGO */}
            <div className="mx-2 mx-md-3">
              <Link href="/" className="navbar-brand">
                <img
                  src="/images/asvab-tutoring-logo.webp"
                  width="65"
                  height="65"
                  alt="Logo"
                />
              </Link>
            </div>

            {/* RIGHT MENU */}
            <ul className="navbar-nav flex-row flex-nowrap align-items-center ms-2 gap-3 gap-lg-4">
              {/* SERVICES */}
              <li
                className="nav-item dropdown"
                onMouseEnter={() => setIsServicesOpen(true)}
                onMouseLeave={() => setIsServicesOpen(false)}
              >
                <span
                  className="nav-link text-white d-flex align-items-center gap-1 px-2"
                  role="button"
                >
                  SERVICES{" "}
                  <FaCaretDown
                    className={`fs-6 navbar-dropdown-caret ${isServicesOpen ? "navbar-caret-open" : ""}`}
                  />
                </span>
                <ul
                  className={`dropdown-menu mt-0 ${isServicesOpen ? "show" : ""}`}
                >
                  {services.map((service) => (
                    <li key={service.service_id}>
                      <Link
                        className="dropdown-item"
                        href={`/services/${getServiceSlug(service.service_id)}`}
                      >
                        {service.course_name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              {/* PRICING */}
              <li
                className="nav-item dropdown"
                onMouseEnter={() => setIsPricingOpen(true)}
                onMouseLeave={() => setIsPricingOpen(false)}
              >
                <span
                  className="nav-link text-white d-flex align-items-center gap-1 px-2"
                  role="button"
                >
                  PRICING{" "}
                  <FaCaretDown
                    className={`fs-6 navbar-dropdown-caret ${isPricingOpen ? "navbar-caret-open" : ""}`}
                  />
                </span>
                <ul
                  className={`dropdown-menu mt-0 ${isPricingOpen ? "show" : ""}`}
                >
                  {services.map((service) => (
                    <li key={service.service_id}>
                      <Link
                        className="dropdown-item"
                        href={`/pricing/${getServiceSlug(service.service_id)}`}
                      >
                        {service.course_name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>

              {/* <li className="nav-item">
                <Link href="/about-us" className="nav-link text-white px-2">ABOUT US</Link>
              </li> */}

              <li className="nav-item">
                <Link href="/blog" className="nav-link text-white px-2">
                  BLOG
                </Link>
              </li>

              {/* <li className="nav-item">
                    <Link href={`${process.env.NEXT_PUBLIC_RESOURCES_URL}/register-free`} className="btn border text-white px-3 py-1 fs-6">
                      ONLINE STUDY
                    </Link>
                  </li> */}
              {/* LOGIN / ACCOUNT */}
              {authUser ? (
                <>
                  <li className="nav-item">
                    <a
                      href={STUDY_PORTAL_HREF}
                      className="btn btn-outline-light d-flex align-items-center gap-2 px-3"
                    >
                      <FaBookOpen /> Study
                    </a>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className="btn btn-outline-light d-flex align-items-center gap-2 px-3"
                      onClick={handleLogout}
                      disabled={loggingOut}
                    >
                      <FaSignOutAlt /> {loggingOut ? "…" : "Log out"}
                    </button>
                  </li>
                  <li className="nav-item d-flex align-items-center">
                    <NavbarUserAvatar user={authUser} />
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link
                      href="/user-login"
                      className="btn btn-outline-light d-flex align-items-center gap-2 px-3"
                    >
                      <FaSignInAlt /> Login
                    </Link>
                  </li>

                  <li className="nav-item">
                    <Link
                      href="/user-registration"
                      className="btn btn-outline-light d-flex align-items-center gap-2 px-3"
                    >
                      <FaUserPlus /> Register
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* MOBILE COLLAPSIBLE MENU — outside nav so fixed positioning works correctly */}
      {isMenuOpen && (
        <div
          ref={mobileMenuRef}
          id="navbar-mobile-menu"
          className="navbar-mobile-menu d-lg-none"
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
        >
          <ul className="navbar-nav">
            <li className="nav-item">
              <Link
                href="/"
                className="nav-link text-white"
                onClick={handleLinkClick}
              >
                HOME
              </Link>
            </li>
            <li className="nav-item">
              <Link
                href="/about-us"
                className="nav-link text-white"
                onClick={handleLinkClick}
              >
                ABOUT US
              </Link>
            </li>
            <li className="nav-item">
              <Link
                href="/how-it-works"
                className="nav-link text-white"
                onClick={handleLinkClick}
              >
                HOW IT WORKS
              </Link>
            </li>

            {/* COURSES MOBILE */}
            <li className="nav-item">
              <span
                className="nav-link text-white d-flex align-items-center gap-1"
                role="button"
                onClick={toggleCourses}
              >
                COURSES{" "}
                <FaCaretDown
                  className={`navbar-dropdown-caret ${isCoursesOpen ? "navbar-caret-open" : ""}`}
                />
              </span>

              <ul
                className={`navbar-nav ps-3 navbar-mobile-submenu ${isCoursesOpen ? "show" : ""}`}
              >
                <CourseNavGroups
                  courses={courses}
                  variant="mobile"
                  onLinkClick={handleLinkClick}
                />
              </ul>
            </li>

            {/* FREE TESTS MOBILE */}
            <li className="nav-item">
              <span
                className="nav-link text-white d-flex align-items-center gap-1"
                role="button"
                onClick={toggleFreeTests}
              >
                FREE TESTS{" "}
                <FaCaretDown
                  className={`navbar-dropdown-caret ${isFreeTestsOpen ? "navbar-caret-open" : ""}`}
                />
              </span>

              <ul
                className={`navbar-nav ps-3 navbar-mobile-submenu ${isFreeTestsOpen ? "show" : ""}`}
              >
                <FreeTestsNavGroups
                  practiceCourses={freePracticeCourses}
                  predictionCourses={freePredictionCourses}
                  variant="mobile"
                  onLinkClick={handleLinkClick}
                  practiceOpen={isFreePracticeOpen}
                  predictionOpen={isFreePredictionOpen}
                  onTogglePractice={() =>
                    setIsFreePracticeOpen((open) => !open)
                  }
                  onTogglePrediction={() =>
                    setIsFreePredictionOpen((open) => !open)
                  }
                />
              </ul>
            </li>

            {/* SERVICES MOBILE */}
            <li className="nav-item">
              <span
                className="nav-link text-white d-flex align-items-center gap-1"
                role="button"
                onClick={toggleServices}
              >
                SERVICES{" "}
                <FaCaretDown
                  className={`navbar-dropdown-caret ${isServicesOpen ? "navbar-caret-open" : ""}`}
                />
              </span>

              <ul
                className={`navbar-nav ps-3 navbar-mobile-submenu ${isServicesOpen ? "show" : ""}`}
              >
                {services.map((service) => (
                  <li key={service.service_id} className="nav-item">
                    <Link
                      href={`/services/${getServiceSlug(service.service_id)}`}
                      className="nav-link text-white"
                      onClick={handleLinkClick}
                    >
                      {service.course_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>

            {/* PRICING MOBILE */}
            <li className="nav-item">
              <span
                className="nav-link text-white d-flex align-items-center gap-1"
                role="button"
                onClick={togglePricing}
              >
                PRICING{" "}
                <FaCaretDown
                  className={`navbar-dropdown-caret ${isPricingOpen ? "navbar-caret-open" : ""}`}
                />
              </span>

              <ul
                className={`navbar-nav ps-3 navbar-mobile-submenu ${isPricingOpen ? "show" : ""}`}
              >
                {services.map((service) => (
                  <li key={service.service_id} className="nav-item">
                    <Link
                      href={`/pricing/${getServiceSlug(service.service_id)}`}
                      className="nav-link text-white"
                      onClick={handleLinkClick}
                    >
                      {service.course_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li className="nav-item">
              <Link href="/blog" className="nav-link text-white px-2" onClick={handleLinkClick}>
                BLOG
              </Link>
            </li>

            {authUser ? (
              <>
                <li className="nav-item">
                  <a
                    href={STUDY_PORTAL_HREF}
                    className="nav-link text-white"
                    onClick={handleLinkClick}
                  >
                    <FaBookOpen /> Study
                  </a>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className="nav-link text-white btn btn-link text-start p-0"
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    <FaSignOutAlt /> {loggingOut ? "…" : "Log out"}
                  </button>
                </li>
                <li className="nav-item d-flex align-items-center py-2">
                  <NavbarUserAvatar user={authUser} />
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link
                    href="/user-login"
                    className="nav-link text-white"
                    onClick={handleLinkClick}
                  >
                    <FaSignInAlt /> Login
                  </Link>
                </li>

                <li className="nav-item">
                  <Link
                    href="/user-registration"
                    className="nav-link text-white"
                    onClick={handleLinkClick}
                  >
                    <FaUserPlus /> Register
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
