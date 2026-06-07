import { type NextRequest } from "next/server";
import { updateSession } from "@pp5/database/middleware";
import { getAccessLevel, type AccessInfo } from "./lib/license";
import { createClient } from "@supabase/supabase-js";

// Request headers ที่ส่งต่อให้ server components อ่านผ่าน headers()
export const ACCESS_HEADER = "x-pp5-access";       // "full" | "trial" | "readonly"
export const TRIAL_DAYS_HEADER = "x-pp5-trial-days"; // จำนวนวันที่เหลือ (trial เท่านั้น)

// Cookie cache — ลด DB query เหลือ query ทุก 5 นาที แทนทุก request
const ACCESS_COOKIE = "pp5-access";
const CACHE_TTL_SEC = 300;

function parseAccessCookie(val: string): AccessInfo | null {
  const [level, extra] = val.split(":");
  if (level === "full") return { level: "full", plan: "paid" };
  if (level === "trial" && extra) return { level: "trial", daysRemaining: parseInt(extra, 10) };
  if (level === "readonly" && extra) return { level: "readonly", expiredDaysAgo: parseInt(extra, 10) };
  return null;
}

function serializeAccessCookie(info: AccessInfo): string {
  if (info.level === "full") return "full";
  if (info.level === "trial") return `trial:${info.daysRemaining}`;
  return `readonly:${info.expiredDaysAgo}`;
}

function applyAccessHeaders(request: NextRequest, info: AccessInfo) {
  request.headers.set(ACCESS_HEADER, info.level);
  if (info.level === "trial") {
    request.headers.set(TRIAL_DAYS_HEADER, String(info.daysRemaining));
  }
}

export async function proxy(request: NextRequest) {
  // ── 1. Access level (cache → DB) ────────────────────────────────────────
  let accessInfo: AccessInfo | null = null;
  let needsCache = false;

  const cached = request.cookies.get(ACCESS_COOKIE)?.value;
  if (cached) {
    accessInfo = parseAccessCookie(cached);
  }

  if (!accessInfo) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
      accessInfo = await getAccessLevel(supabase);
      needsCache = true;
    }
  }

  // ส่ง access level ไปให้ server components ผ่าน request headers
  // (updateSession forwards request headers downstream via NextResponse.next)
  if (accessInfo) applyAccessHeaders(request, accessInfo);

  // ── 2. Surface ?embed=1 ─────────────────────────────────────────────────
  // updateSession internally calls `NextResponse.next({ request })`, which
  // forwards request headers downstream — so the (admin) layout will see
  // this header on the server and can skip rendering chrome (sidebar /
  // mobile header / page-context-bar). Without this, the iframe used by
  // /reports/pp5's selector flashes the admin chrome on initial load
  // before the page's <style display:none> rules apply.
  if (request.nextUrl.searchParams.get("embed") === "1") {
    request.headers.set("x-pp5-embed", "1");
  }

  // ── 3. Auth check ────────────────────────────────────────────────────────
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

  // ── 4. บันทึก cache cookie ──────────────────────────────────────────────
  if (needsCache && accessInfo) {
    response.cookies.set(ACCESS_COOKIE, serializeAccessCookie(accessInfo), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: CACHE_TTL_SEC,
      path: "/",
    });
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
