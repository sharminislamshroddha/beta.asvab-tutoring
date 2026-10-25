"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AuthUser } from "@/lib/auth-session";
import styles from "./UserMenu.module.css";

const ITEMS = [
  { href: "/study", label: "My study", icon: "bi-journal-text" },
  { href: "/study/account/profile", label: "Edit profile", icon: "bi-person" },
  {
    href: "/study/account/subscription",
    label: "Subscription",
    icon: "bi-credit-card",
  },
  {
    href: "/study/progress",
    label: "My progress report",
    icon: "bi-graph-up-arrow",
  },
  { href: "/study/account/password", label: "Change password", icon: "bi-key" },
];

function initials(user: AuthUser) {
  const parts = [user.first_name, user.last_name]
    .map((p) => (p || "").trim())
    .filter(Boolean);
  if (parts.length)
    return parts
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  return (user.email.split("@")[0] || "?").slice(0, 2).toUpperCase();
}

/**
 * Signed-in student's account menu: the avatar opens a dropdown on desktop and
 * a bottom sheet on phones/tablets. The sheet is rendered into <body>: the site
 * header is transformed (auto-hide), which would pin a fixed sheet to the header.
 */
export default function UserMenu({
  user,
  onLogout,
  loggingOut,
}: {
  user: AuthUser;
  onLogout: () => void | Promise<void>;
  loggingOut: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [asSheet, setAsSheet] = useState(false);
  const menuId = useId();
  const pathname = usePathname();
  const fullName = `${user.first_name} ${user.last_name}`.trim() || user.email;

  // Close after navigating
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Phones / tablets get the bottom sheet (same breakpoint as the CSS)
  useEffect(() => {
    const query = window.matchMedia("(max-width: 991.98px)");
    const update = () => setAsSheet(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Close on Escape / a click outside; focus the first item when opened
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !wrapRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      )
        setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const menu = (
    <>
      <div
        className={styles.backdrop}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        id={menuId}
        ref={menuRef}
        className={styles.menu}
        role="menu"
        aria-label="Account"
      >
        <span className={styles.handle} aria-hidden="true" />
        <div className={styles.head}>
          <span className={styles.headAvatar} aria-hidden="true">
            {initials(user)}
          </span>
          <span className={styles.headText}>
            <span className={styles.name}>{fullName}</span>
            <span className={styles.email}>{user.email}</span>
          </span>
        </div>

        <div className={styles.items}>
          {ITEMS.map((item) => {
            const active =
              item.href === "/study"
                ? pathname === "/study"
                : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={`${styles.item} ${active ? styles.itemActive : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <i className={`bi ${item.icon}`} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className={styles.items}>
          <button
            type="button"
            role="menuitem"
            className={`${styles.item} ${styles.itemDanger}`}
            onClick={() => {
              setOpen(false);
              void onLogout();
            }}
            disabled={loggingOut}
          >
            <i className="bi bi-box-arrow-right" aria-hidden="true" />
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${fullName}`}
        title={fullName}
      >
        <span className={styles.avatar} aria-hidden="true">
          {initials(user)}
        </span>
        <span className={styles.triggerName} aria-hidden="true">
          {(user.first_name || "").trim().split(/\s+/)[0] || "Account"}
        </span>
        <i
          className={`bi bi-chevron-down ${styles.triggerChevron}`}
          aria-hidden="true"
        />
      </button>

      {open && (asSheet ? createPortal(menu, document.body) : menu)}
    </div>
  );
}
