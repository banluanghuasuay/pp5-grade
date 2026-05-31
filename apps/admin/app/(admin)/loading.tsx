import { PageSkeleton } from "./_components/page-skeleton";

/**
 * Route-level fallback for the (admin) group — shown on a hard load /
 * refresh / external navigation, while the page's server data is
 * fetched. Sidebar stays visible (this only replaces <main>'s children).
 *
 * Uses the same <PageSkeleton> as the client-navigation overlay so the
 * loading appearance is identical whether you refresh the page or click
 * a menu item.
 */
export default function Loading() {
  return <PageSkeleton />;
}
