/**
 * A small SVG progress ring. Used on goals (detail + Command View rollup). Pure
 * presentational — the value is a 0-100 percentage the founder sets by hand in v1.
 */
export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped}% complete`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div
        className="flex items-center justify-center"
        style={{ marginTop: -size, height: size }}
      >
        <span className="text-lg font-semibold font-mono tabular-nums">{clamped}%</span>
      </div>
    </div>
  );
}
