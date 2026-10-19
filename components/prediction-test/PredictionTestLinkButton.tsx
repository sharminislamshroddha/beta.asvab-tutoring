import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
};

export default function PredictionTestLinkButton({
  href,
  children,
  className = "",
}: Props) {
  return (
    <Link
      href={href}
      className={`btn btn-primary-custom px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2 ${className}`.trim()}
    >
      <i className="bi bi-stars" aria-hidden />
      {children}
    </Link>
  );
}
