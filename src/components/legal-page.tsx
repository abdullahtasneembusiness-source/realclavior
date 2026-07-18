import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

/**
 * Shared shell for the public legal pages (/privacy, /terms). Matches the marketing
 * site's identity — warm off-white canvas, display headings, mono "LAST UPDATED"
 * label — at a comfortable long-form reading width. Public and static: no auth, no
 * data fetching.
 *
 * Bump LEGAL_LAST_UPDATED whenever either document changes; both pages read from it.
 */
export const LEGAL_LAST_UPDATED = "July 18, 2026";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Clovior home">
            <BrandMark />
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Log in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] flex-1 px-5 py-16 sm:px-8 sm:py-20">
        <p className="section-label">Legal</p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
          {title}
        </h1>
        <p className="section-label mt-4">Last updated · {LEGAL_LAST_UPDATED}</p>
        <div className="rich-content mt-10 text-[15px]">{children}</div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
          <BrandMark />
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <span className="font-mono text-xs">© 2026 Clovior</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
