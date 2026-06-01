"use client";

import { FilterNavLink } from "./filter-nav-link";
import { useOptimisticValue } from "./use-optimistic-value";

type TabItem = { id: string; label: string; href: string };

/**
 * A tab bar whose ACTIVE highlight updates INSTANTLY on click (optimistic),
 * instead of waiting for the RSC navigation to commit. Without this, the
 * active tab styling lags by the full page-load time even though the grid
 * skeleton (via FilterNavGate) already swapped in.
 *
 * Mirrors `currentTab` with `useOptimisticValue`; each FilterNavLink sets the
 * optimistic tab on click (and still fires startNav via FilterNavLink). When
 * the navigation commits and `currentTab` changes, the optimistic value
 * auto-resets so the server value wins.
 */
export function OptimisticTabs({
  tabs,
  currentTab,
  activeClass,
  inactiveClass,
}: {
  tabs: TabItem[];
  currentTab: string;
  activeClass: string;
  inactiveClass: string;
}) {
  const [tabVal, setTabOpt] = useOptimisticValue(currentTab);
  return (
    <>
      {tabs.map((t) => {
        const isActive = t.id === tabVal;
        return (
          <FilterNavLink
            key={t.id}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={isActive ? activeClass : inactiveClass}
            onClick={() => setTabOpt(t.id)}
          >
            {t.label}
          </FilterNavLink>
        );
      })}
    </>
  );
}
