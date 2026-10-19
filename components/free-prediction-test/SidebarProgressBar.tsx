type Props = {
  answered: number;
  total: number;
  className?: string;
};

export default function SidebarProgressBar({
  answered,
  total,
  className = "mb-0",
}: Props) {
  const percentage =
    total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div
      className={`progress ${className}`}
      style={{ height: "4px", backgroundColor: "rgba(255,255,255,0.15)" }}
    >
      <div
        className="progress-bar"
        role="progressbar"
        style={{
          width: `${percentage}%`,
          backgroundColor: "#e58a34",
        }}
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
