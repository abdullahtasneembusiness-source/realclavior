import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="bg-destructive/15 mb-4 inline-flex size-10 items-center justify-center rounded-xl text-destructive">
          <AlertTriangle className="size-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          That sign-in link didn&apos;t work
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have expired or already been used. Request a fresh one and try
          again.
        </p>
        {searchParams.reason ? (
          <p className="mt-3 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            {searchParams.reason}
          </p>
        ) : null}
        <Button asChild className="mt-6 w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    </main>
  );
}
