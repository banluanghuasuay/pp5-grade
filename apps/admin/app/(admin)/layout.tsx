import { createClient } from "@pp5/database/server";
import { getCurrentUser } from "@pp5/database/queries";
import { getCurrentTerm } from "@/lib/current-term";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logoutAction } from "../_actions/auth";
import { MobileHeader } from "./_components/mobile-header";
import { MobileNavProvider } from "./_components/mobile-nav-context";
import { NavigationOverlay } from "./_components/navigation-overlay";
import { NavigationStatusProvider } from "./_components/navigation-status-context";
import { PageContextBar } from "./_components/page-context-bar";
import { Sidebar } from "./_components/sidebar";

const ROLE_LABEL: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  teacher: "ครู",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defensive — proxy.ts should already redirect
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");

  // Embed mode (set by proxy.ts when URL has `?embed=1`) → render the
  // page bare-bones, NO admin chrome. Used by /reports/pp5's iframe
  // preview so the report shows alone. Without this, the chrome would
  // flash on initial iframe load before the page's <style display:none>
  // rules parse and hide it. This guarantees zero chrome from server-
  // render onwards.
  const embed = (await headers()).get("x-pp5-embed") === "1";
  if (embed) return <>{children}</>;

  // School logo for the sidebar brand. Single-tenant table, so one row.
  // Fetched alongside auth so it's available on every admin page load.
  // Cache invalidation: `uploadSchoolLogo` / `removeSchoolLogo` actions
  // call `revalidatePath("/", "layout")` so this refetches.
  const supabase = await createClient();
  const { data: school } = await supabase
    .from("schools")
    .select("logo_url")
    .limit(1)
    .maybeSingle();
  const schoolLogoUrl = school?.logo_url ?? null;

  // Current term — fetched once here, then passed to BOTH the mobile header
  // (badge in place of the old logout button) and the page context bar
  // (desktop). Avoids a duplicate getCurrentTerm query.
  const term = await getCurrentTerm();

  const isAdmin = auth.profile.role === "admin";
  const roleLabel = ROLE_LABEL[auth.profile.role] ?? auth.profile.role;
  const userLabel = `${auth.profile.title ?? ""}${auth.profile.full_name} · ${roleLabel}`;

  return (
    <MobileNavProvider>
      <NavigationStatusProvider>
        <div className="flex min-h-screen flex-col bg-zinc-50 md:flex-row">
          <Sidebar
            isAdmin={isAdmin}
            user={{
              title: auth.profile.title,
              fullName: auth.profile.full_name,
              roleLabel,
              username: auth.profile.username,
            }}
            logoutAction={logoutAction}
            schoolLogoUrl={schoolLogoUrl}
          />

          <MobileHeader userLabel={userLabel} term={term} />

          <main className="flex-1 overflow-x-hidden">
            {/* Phase 2.6 — top context strip on every page (breadcrumb + term) */}
            <PageContextBar term={term} />
            <div className="mx-auto max-w-6xl p-6 sm:p-8">
              {/* Skeleton overlay during cross-page menu navigation, so the
                  stale page doesn't sit frozen while the new route streams
                  in. In-page filters (ชั้น/ห้อง dropdowns) use their own
                  per-page gates instead. */}
              <NavigationOverlay>{children}</NavigationOverlay>
            </div>
          </main>
        </div>
      </NavigationStatusProvider>
    </MobileNavProvider>
  );
}
