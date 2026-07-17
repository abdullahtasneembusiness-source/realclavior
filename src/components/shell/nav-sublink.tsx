"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * A nested shortcut under a top-level nav item (e.g. a recent playbook under
 * Playbooks). Sits inside a bordered guide rail; active when the pathname is on
 * this exact resource or a page beneath it.
 */
export function NavSubLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "truncate rounded-md py-1.5 pl-3 pr-2 text-[13px] transition-colors",
        active
          ? "font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
