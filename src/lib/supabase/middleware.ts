import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and gates access to the
 * authenticated app. Unauthenticated users hitting a protected route are sent to
 * /login; signed-in users are never left on /login.
 *
 * Follows Supabase's recommended App Router SSR pattern: the same cookie mutations
 * must be applied to both the request (for downstream server components) and the
 * response (so the browser gets refreshed tokens).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run any logic between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Backward compatibility: old /w/<uuid> links (bookmarks, shared URLs) permanently
  // redirect to the new /w/<slug> URL. The UUID regex means slug URLs skip this lookup
  // entirely, so normal navigation pays no extra query. Runs as the signed-in user, so
  // the slug is only revealed for a workspace they belong to.
  const legacyMatch = pathname.match(
    /^\/w\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/.*)?$/i,
  );
  if (user && legacyMatch) {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", legacyMatch[1])
      .maybeSingle();
    const slug = (ws as { slug: string } | null)?.slug;
    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/w/${slug}${legacyMatch[2] ?? ""}`;
      return NextResponse.redirect(url, 308);
    }
  }

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/auth");
  // The cron endpoints authenticate themselves with a Bearer secret and have no user
  // session, so the login gate must not swallow them into a /login redirect — they need
  // to reach their handler and return their own JSON status (e.g. 401 on a bad secret).
  const isCronRoute = pathname.startsWith("/api/cron");
  const isPublicRoute = pathname === "/" || isAuthRoute || isCronRoute;

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
