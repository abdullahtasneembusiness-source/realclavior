/**
 * Generic loading skeleton for workspace pages. Rendered by each route's loading.tsx so
 * navigation feels instant: Next shows this the moment a link is clicked (inside the
 * persistent app shell) while the destination's server data loads, then swaps in the
 * real content. Purely decorative — hidden from assistive tech.
 */
export function PageSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-40 rounded-md bg-muted" />
        <div className="h-4 w-64 max-w-full rounded bg-muted/70" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 shrink-0 rounded-full bg-muted" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="h-3.5 w-1/3 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted/70" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
