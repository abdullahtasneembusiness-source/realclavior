import { cn } from "@/lib/utils";

/** Colored circle with an initial — the standard way we show a member everywhere. */
export function MemberAvatar({
  name,
  color,
  size = "md",
  className,
}: {
  name: string;
  color?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const dims =
    size === "sm"
      ? "size-6 text-xs"
      : size === "lg"
        ? "size-10 text-base"
        : "size-8 text-sm";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white",
        dims,
        className,
      )}
      style={{ backgroundColor: color ?? "#5B4BE0" }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
