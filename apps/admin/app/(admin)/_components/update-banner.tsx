import { checkForUpdate } from "@/lib/version-check";
import { UpdateBannerClient } from "./update-banner-client";

/**
 * Async server component — checks for a newer upstream version and renders a
 * dismissible banner when one exists. Mount inside <Suspense fallback={null}>
 * so the GitHub fetch never blocks the page's first paint.
 *
 * Admin-only by convention (the layout guards with `isAdmin`): only the person
 * who can sync the fork + redeploy needs to see it.
 */
export async function UpdateBanner() {
  const status = await checkForUpdate();
  if (!status) return null;
  return <UpdateBannerClient status={status} />;
}
