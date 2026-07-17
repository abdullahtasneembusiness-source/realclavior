import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for trusted, server-only jobs that must act across every
 * workspace with no signed-in user — today, the launch cron (/api/cron/launches).
 *
 * It uses the service-role key, which BYPASSES Row-Level Security, so it must never be
 * imported into anything that runs with a user's privileges: only into endpoints that
 * authenticate the caller by a server secret first. The key is server-only (no
 * NEXT_PUBLIC_ prefix) and must never reach the browser. No session is persisted — this
 * client is stateless and per-request.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // Next.js patches global fetch and caches it inside Route Handlers / RSC. Left
    // alone, the cron's supabase-js SELECTs get served stale from the Data Cache — so
    // the job re-reads a just-flipped launch as still 'armed' and spawns its runs again.
    // Force every admin-client request to hit the database fresh.
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
