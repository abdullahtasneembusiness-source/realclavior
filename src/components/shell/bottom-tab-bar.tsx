"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

/** Operator mobile nav — big touch targets, icon + label, no drawer to open. */
export function BottomTabBar({
  workspaceId,
  navItems,
}: {
  workspaceId: string;
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const base = `/w/${workspaceId}`;

  return (
    <nav
      data-testid="bottom-tab-bar"
      className="bg-background/95 fixed inset-x-0 bottom-0 z-20 flex h-16 items-stretch border-t border-border pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {navItems.map((item) => {
        const target = item.segment ? `${base}/${item.segment}` : base;
        const active =
          item.segment === ""
            ? pathname === base
            : pathname === target || pathname.startsWith(`${target}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            href={item.href(workspaceId)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
