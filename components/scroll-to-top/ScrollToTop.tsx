"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FaArrowUp } from "react-icons/fa";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 50);

    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const toggleVisibility = () => {
      const scrollTop = window.scrollY ?? document.documentElement.scrollTop;
      setIsVisible(scrollTop > 300);
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    window.addEventListener("touchmove", toggleVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
      window.removeEventListener("touchmove", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      className={`scroll-to-top ${isVisible ? "visible" : ""}`}
      onClick={scrollToTop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Scroll to top"
      style={{
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? "visible" : "hidden",
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
      }}
    >
      <FaArrowUp
        className={`transition-transform ${isHovered ? "scale-110" : ""}`}
        style={{
          transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        }}
      />
    </button>
  );
}