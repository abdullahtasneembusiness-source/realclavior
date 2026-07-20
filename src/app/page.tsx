import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Landing } from "@/components/landing";

export const metadata: Metadata = {
  title: "Clovior — Hand off work. It stays handed off.",
  description:
    "Playbooks your operators run like checklists. Corrections that stick. One view of everything, without chasing anyone.",
};

/**
 * Root route. Logged-out visitors see the public marketing landing page; anyone
 * signed in is sent into the app (which resolves their workspace / Command View).
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return <Landing />;
}
