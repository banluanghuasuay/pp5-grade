import type { NextRequest } from "next/server";
import { updateSession } from "@pp5/database/middleware";

export async function proxy(request: NextRequest) {
  // Surface `?embed=1` as a request header BEFORE updateSession runs.
  // updateSession internally calls `NextResponse.next({ request })`, which
  // forwards request headers downstream — so the (admin) layout will see
  // this header on the server and can skip rendering chrome (sidebar /
  // mobile header / page-context-bar). Without this, the iframe used by
  // /reports/pp5's selector flashes the admin chrome on initial load
  // before the page's <style display:none> rules apply.
  if (request.nextUrl.searchParams.get("embed") === "1") {
    request.headers.set("x-pp5-embed", "1");
  }

  return updateSession(request, {
    // This app is for admin + ครู — session is only valid if:
    //   1. There's a matching row in `users` (= valid for this app)
    //   2. The row has `is_active = true` (= not deactivated by admin)
    // Deactivated users are treated as logged out.
    validateSession: async (supabase, user) => {
      const { data } = await supabase
        .from("users")
        .select("id, is_active")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      return !!data && data.is_active === true;
    },
  });
}

export const config = {
  matcher: [
    // Exclude PWA assets (manifest.webmanifest, sw.js) so the browser can
    // fetch them anonymously — otherwise the auth proxy 307-redirects them
    // to /login and the app can't be installed.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
