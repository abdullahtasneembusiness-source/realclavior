import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // If they already belong to a workspace, skip onboarding.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  if (memberships && memberships.length > 0) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Name your business
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This creates your workspace — the operating layer your team runs
            inside.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  );
}
