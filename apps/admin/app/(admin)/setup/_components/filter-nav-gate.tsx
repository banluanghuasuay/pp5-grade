"use client";

import type { ReactNode } from "react";
import { useFilterNav } from "./filter-nav-context";

/**
 * Generic in-page gate — swaps `children` for `fallback` the instant a
 * filter starts navigating (dropdown onChange or `<FilterNavLink>`
 * click). Unlike the per-page `NavigationGate`s that hard-code their own
 * skeleton, this one takes the fallback as a prop so a page can reuse
 * whatever loading UI it already has (e.g. the attendance grid's
 * `<GridLoadingFallback>`).
 *
 * Must be rendered inside a `<FilterNavProvider>`.
 */
export function FilterNavGate({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: ReactNode;
}) {
  const { pending } = useFilterNav();
  return <>{pending ? fallback : children}</>;
}
