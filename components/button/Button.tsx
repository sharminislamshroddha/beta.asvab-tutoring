import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  pathname: string;
  queryObj?: object;
  style?: React.CSSProperties;
  className?: string;
}

const Button = ({
  children,
  pathname,
  queryObj,
  style,
  className,
}: ButtonProps) => {
  return (
    <Link
      href={{
        pathname: pathname,
        query: { ...queryObj },
      }}
      className="text-decoration-none"
    >
      <button
        className={className ?? ""}
        style={{ marginTop: "20px", ...style }}
      >
        {children}
      </button>
    </Link>
  );
};

export default Button;
