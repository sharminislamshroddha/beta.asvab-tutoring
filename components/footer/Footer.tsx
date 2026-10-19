"use client";

import Link from "next/link";
import Image from "next/image";

import { useEffect, useState } from "react";

export default function Footer() {
  const [isMounted, setIsMounted] = useState(false);
  const [loadBg, setLoadBg] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    const enableBg = () => {
      if (!cancelled) setLoadBg(true);
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(enableBg, { timeout: 2000 });
    } else {
      timeoutId = setTimeout(enableBg, 1);
    }

    return () => {
      cancelled = true;
      if (idleId != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, []);

  if (!isMounted) {
    return (
      <footer className="text-white py-5">
        <div className="container"></div>
      </footer>
    );
  }

  return (
    <footer
      className="text-white"
      style={
        loadBg
          ? {
              background:
                "url('/images/footer_bg.jpg') center center/cover no-repeat",
            }
          : { backgroundColor: "#0b1f3a" }
      }
    >
      <div
        className="container-xxl"
        style={{
          paddingTop: "40px",
          paddingBottom: "25px",
        }}
      >
        <div className="row gy-5 justify-content-lg-between">
          {/* About Us */}
          <div className="col-12 col-md-4 col-lg-3">
            <h5 className="fw-semibold mb-4">ABOUT US</h5>
            <p className="footer-text">
              At ASVAB Tutoring, we’re dedicated to helping future service
              members achieve their dreams of joining the United States Armed
              Forces.
            </p>
            <Link
              href="/about-us"
              className="read-more-link d-inline-block"
              style={{ fontSize: "14px" }}
            >
              READ MORE &gt;&gt;
            </Link>
          </div>

          {/* Quick Links */}
          <div className="col-12 col-md-4 col-lg-auto">
            <h5 className="fw-semibold mb-4">QUICK LINKS</h5>
            <ul className="list-unstyled p-0 m-0">
              <li className="mb-2">
                <Link href="/about-us" className="footer-link">
                  About Us
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/blog" className="footer-link">
                  Blog
                </Link>
              </li>
              <li className="mb-2">
                <Link href="/faq" className="footer-link">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Affiliate links */}
          <div className="col-12 col-md-4 col-lg-auto">
            <h5 className="fw-semibold mb-4">AFFILIATE</h5>
            <ul className="list-unstyled p-0 m-0">
              <li className="mb-2">
                <Link
                  href="https://test-prep.asvab-tutoring.com/affiliate-login"
                  className="footer-link"
                >
                  Affiliate Login
                </Link>
              </li>
              <li className="mb-2">
                <Link
                  href="https://test-prep.asvab-tutoring.com/become-an-affiliate"
                  className="footer-link"
                >
                  Become an Affiliate
                </Link>
              </li>
            </ul>
          </div>

          {/* Our Mobile Apps */}
          <div className="col-12 col-md-4 col-lg-auto">
            <h5 className="fw-semibold mb-4">OUR MOBILE APPS</h5>
            <div className="d-flex flex-column gap-2">
              <a
                href="/our-mobile-apps"
                target="_blank"
                rel="noopener noreferrer"
                className="app-link-btn"
              >
                <Image
                  src="/images/download-on-the-app-store.svg"
                  alt="App Store"
                  width={120}
                  height={40}
                  unoptimized
                  style={{ width: "auto", height: "40px" }}
                />
              </a>
              <a
                href="/our-mobile-apps"
                target="_blank"
                rel="noopener noreferrer"
                className="app-link-btn"
              >
                <Image
                  src="/images/Google_Play_Store_badge_EN.svg"
                  alt="Google Play"
                  width={135}
                  height={40}
                  unoptimized
                  style={{ width: "auto", height: "40px" }}
                />
              </a>
            </div>
          </div>

          {/* Social Icons */}
          <div className="col-12 col-md-4 col-lg-auto">
            <h5 className="fw-semibold mb-4">KEEP IN TOUCH</h5>
            <div className="d-flex flex-wrap gap-3">
              <a
                href="https://x.com/asvabtutoring18"
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none fs-5 footer-icon"
              >
                <i className="bi bi-twitter-x"></i>
              </a>
              <a
                href="https://www.facebook.com/asvabtutoring"
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none fs-5 footer-icon"
              >
                <i className="bi bi-facebook"></i>
              </a>
              <a
                href="https://www.youtube.com/channel/UCCVP6UtL3O2-gQJa9KwRMXw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none fs-5 footer-icon"
              >
                <i className="bi bi-youtube"></i>
              </a>
              <a
                href="https://www.instagram.com/asvabtutoring/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none fs-5 footer-icon"
              >
                <i className="bi bi-instagram"></i>
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="col-12 col-md-4 col-lg-auto">
            <h5 className="fw-semibold mb-3">
              <Link
                href="/contact-us"
                className="text-decoration-none text-white"
                style={{ cursor: "pointer" }}
              >
                CONTACT US
              </Link>
            </h5>
            <p className="small mb-2 footer-text">
              <i className="bi bi-geo-alt-fill me-2 primary-color-custom"></i>
              United States
            </p>
            <p className="small mb-2 footer-text">
              <i className="bi bi-envelope-fill me-2 primary-color-custom"></i>
              <a
                href="mailto:info@asvab-tutoring.com"
                className="footer-contact-link"
              >
                info@asvab-tutoring.com
              </a>
            </p>

            <p className="small mb-2 footer-text">
              <i className="bi bi-telephone-fill me-2 primary-color-custom"></i>
              <a href="tel:(718)-200-6396" className="footer-contact-link">
                (718)-200-6396
              </a>
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center small pt-4 mt-4 border-top border-light">
          <p className="mb-1">© 2026 ASVAB TUTORING LLC All Rights Reserved</p>
          <Link
            href="/privacy-policy"
            className="text-decoration-none"
            style={{ color: "var(--primary-color)" }}
          >
            Privacy Policy
          </Link>{" "}
          |{" "}
          <Link
            href="/terms-of-service"
            className="text-decoration-none"
            style={{ color: "var(--primary-color)" }}
          >
            Terms of Service
          </Link>{" "}
          |{" "}
          <Link
            href="/sitemap"
            className="text-decoration-none"
            style={{ color: "var(--primary-color)" }}
          >
            Sitemap
          </Link>
        </div>
      </div>
    </footer>
  );
}
