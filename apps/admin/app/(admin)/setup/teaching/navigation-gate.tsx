"use client";

import { useFilterNav } from "../_components/filter-nav-context";
import { TeachingSkeleton } from "./teaching-skeleton";

/**
 * Swaps the teaching table for a skeleton the instant the ชั้น / ห้อง
 * selector starts navigating — driven by `<FilterNavProvider>`'s
 * imperative `startNav()`, NOT by `useSearchParams` (which only updates
 * on navigation commit, far too late; see filter-nav-context.tsx).
 */
export function NavigationGate({ children }: { children: React.ReactNode }) {
  const { pending } = useFilterNav();
  if (pending) return <TeachingSkeleton />;
  return <>{children}</>;
}
