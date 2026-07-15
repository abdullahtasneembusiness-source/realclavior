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
}: {
  item: NavItem;
  workspaceId: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isActiveSegment(pathname, workspaceId, item.segment);
  const Icon = item.icon;

  return (
    <Link
      href={item.href(workspaceId)}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/12 text-foreground"
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
