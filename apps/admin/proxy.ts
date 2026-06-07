import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@pp5/database/middleware";
import { verifyToken } from "./lib/license";
import { createClient } from "@supabase/supabase-js";

const LICENSE_COOKIE = "pp5-lic";
const CACHE_TTL_SEC = 300; // 5 นาที

async function checkLicense(request: NextRequest): Promise<"ok" | "missing" | "invalid" | "expired" | "school_mismatch"> {
  // 1. ตรวจ cookie ก่อน — ถ้ายังไม่หมดอายุ ผ่านเลย
  const cached = request.cookies.get(LICENSE_COOKIE)?.value;
  if (cached) {
    const result = await verifyToken(cached);
    if (result.valid) return "ok";
  }

  // 2. cookie หมดหรือไม่มี — query DB
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return "missing";

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data } = await supabase
    .from("schools")
    .select("license_key, name_th")
    .maybeSingle();

  if (!data?.license_key) return "missing";

  const result = await verifyToken(data.license_key);
  if (!result.valid) return result.reason;

  if (data.name_th && result.payload.school_name !== data.name_th) {
    return "school_mismatch";
  }

  return "ok";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow /license page — avoids infinite redirect loop
  if (!pathname.startsWith("/license")) {
    const status = await checkLicense(request);

    if (status !== "ok") {
      const url = request.nextUrl.clone();
      url.pathname = "/license";
      url.searchParams.set("reason", status);
      return NextResponse.redirect(url);
    }
  }

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

  const response = await updateSession(request, {
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

  // หลังผ่าน license check แล้ว ต่ออายุ cookie cache
  const cached = request.cookies.get(LICENSE_COOKIE)?.value;
  if (!cached) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
      const { data } = await supabase
        .from("schools")
        .select("license_key")
        .maybeSingle();
      if (data?.license_key) {
        response.cookies.set(LICENSE_COOKIE, data.license_key, {
          httpOnly: true,
          sameSite: "lax",
          maxAge: CACHE_TTL_SEC,
          path: "/",
        });
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Exclude PWA assets (manifest.webmanifest, sw.js) so the browser can
    // fetch them anonymously — otherwise the auth proxy 307-redirects them
    // to /login and the app can't be installed.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
