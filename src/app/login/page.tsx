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
          <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
            C
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to Clovior
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your team, running without you.
          </p>
        </div>
        <LoginForm initialError={searchParams.error} />
      </div>
    </main>
  );
}
