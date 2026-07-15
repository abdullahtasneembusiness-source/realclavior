function Bar({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
  );
}

/**
 * Covers /w/[workspaceId]'s layout + page while membership/role resolves, so there's
 * no flash of unstyled content or a bare spinner — this shape mirrors the real shell.
 */
export default function WorkspaceLoading() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden h-screen w-60 shrink-0 flex-col gap-1 border-r border-border p-3 lg:flex">
        <Bar className="mb-3 h-9 w-full" />
        <Bar className="h-8 w-full" />
        <Bar className="h-8 w-full" />
        <Bar className="h-8 w-full" />
        <Bar className="h-8 w-full" />
        <Bar className="h-8 w-full" />
        <div className="mt-auto border-t border-border pt-2">
          <Bar className="h-10 w-full" />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex h-14 items-center border-b border-border px-4 lg:hidden">
          <Bar className="h-6 w-32" />
        </div>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
            <Bar className="h-8 w-64" />
            <Bar className="h-4 w-96 max-w-full" />
            <Bar className="mt-4 h-32 w-full" />
            <Bar className="h-32 w-full" />
          </div>
        </main>
      </div>
    </div>
  );
}
