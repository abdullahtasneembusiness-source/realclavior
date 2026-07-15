import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getDefaultWorkspaceId } from "@/lib/workspace";

/**
 * Entry-point resolver, not a real screen. Sends the user to their default
 * workspace's home (/w/[workspaceId]) or into onboarding if they have none yet.
 * The auth callback and sign-in redirect land here rather than guessing a
 * workspace id directly.
 */
export default async function AppEntry() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspaceId = await getDefaultWorkspaceId(user.id);

  if (!workspaceId) {
    redirect("/onboarding");
  }

  redirect(`/w/${workspaceId}`);
}
