import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center">
            <BrandMark className="[&_span:last-child]:text-lg" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Sign in to Clovior
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your team, running without you.
          </p>
        </div>
        <LoginForm initialError={searchParams.error} />
        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link
            href="/terms"
            className="text-foreground underline underline-offset-2 hover:text-primary"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-foreground underline underline-offset-2 hover:text-primary"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
