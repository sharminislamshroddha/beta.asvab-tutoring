import Link from "next/link";
import styles from "../study.module.css";

const TABS = [
  {
    id: "profile",
    href: "/study/account/profile",
    label: "Profile",
    icon: "bi-person",
  },
  {
    id: "password",
    href: "/study/account/password",
    label: "Password",
    icon: "bi-key",
  },
  {
    id: "subscription",
    href: "/study/account/subscription",
    label: "Subscription",
    icon: "bi-credit-card",
  },
] as const;

export type AccountTab = (typeof TABS)[number]["id"];

/** Profile · Password · Subscription switcher for the account pages. */
export default function AccountTabs({ active }: { active: AccountTab }) {
  return (
    <nav className={styles.tabs} aria-label="Account sections">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`${styles.tab} ${tab.id === active ? styles.tabActive : ""}`}
          aria-current={tab.id === active ? "page" : undefined}
          scroll={false}
        >
          <i className={`bi ${tab.icon}`} aria-hidden="true" />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
