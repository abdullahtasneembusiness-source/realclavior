"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

/** True when the current path is exactly this segment, or nested beneath it. */
function isActiveSegment(
  pathname: string,
  workspaceId: string,
  segment: string,
) {
  const base = `/w/${workspaceId}`;
  const target = segment ? `${base}/${segment}` : base;
  if (segment === "") {
    return pathname === base;
  }
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function NavLink({
  item,
  workspaceId,
  onNavigate,
  collapsed = false,
}: {
  item: NavItem;
  workspaceId: string;
  onNavigate?: () => void;
  /** Icon-rail mode (desktop): icon only, label on hover as a tooltip. */
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const active = isActiveSegment(pathname, workspaceId, item.segment);
  const Icon = item.icon;

  if (collapsed) {
    return (
      <Link
        href={item.href(workspaceId)}
        onClick={onNavigate}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        title={item.label}
        className={cn(
          "group relative flex h-10 w-10 items-center justify-center rounded-md transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        {/* Solid accent-green indicator on the active item. */}
        <span
          aria-hidden="true"
          className={cn(
            "absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-primary transition-opacity",
            active ? "opacity-100" : "opacity-0",
          )}
        />
        <Icon
          aria-hidden="true"
          className="size-[1.15rem] shrink-0"
          strokeWidth={active ? 2.4 : 2}
        />
        {/* Hover tooltip — the label, styled. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 font-sans text-xs font-medium text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
        >
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={item.href(workspaceId)}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active
            ? "text-primary"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      {item.label}
    </Link>
  );
}
