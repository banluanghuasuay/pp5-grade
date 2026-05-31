"use client";

import { useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Drives an instant in-page skeleton when a filter dropdown (ชั้น / ห้อง /
 * แผน) navigates via `router.push`.
 *
 * Why this exists — the previous approach compared `useSearchParams()`
 * against the server-rendered props inside a gate. That never fired,
 * because `router.push` runs inside a React transition: `useSearchParams`
 * doesn't update when the click happens, it updates when the navigation
 * COMMITS (after the server RSC is ready). By then the server props have
 * changed too, so target === rendered and the gate saw no mismatch.
 *
 * The fix is imperative: the dropdown calls `startNav()` synchronously in
 * its `onChange` (before `router.push`), which flips `pending` true at
 * 0ms — independent of when `useSearchParams` catches up.
 *
 * How `pending` clears: we snapshot the search-param string at
 * `startNav()` time. `pending` is a DERIVED value — true while the live
 * search-param string still equals that snapshot (URL hasn't committed
 * yet). The instant the navigation commits, `useSearchParams` returns the
 * new string, the snapshot no longer matches, and `pending` flips false
 * in the SAME render the new content arrives — no flash of skeleton over
 * already-loaded content.
 */
const FilterNavContext = createContext<{
  pending: boolean;
  startNav: () => void;
}>({ pending: false, startNav: () => {} });

export function FilterNavProvider({ children }: { children: ReactNode }) {
  const sp = useSearchParams().toString();
  // The search-param string captured when a filter nav started, or null
  // when idle.
  const [navFrom, setNavFrom] = useState<string | null>(null);

  const startNav = useCallback(() => setNavFrom(sp), [sp]);

  // Derived: we're still waiting if the URL hasn't moved off the snapshot.
  const pending = navFrom !== null && navFrom === sp;

  // Cleanup — once the URL has committed to a new value, drop the marker
  // so the next nav can re-arm. (`pending` already read false this render;
  // this just resets the latch.)
  useEffect(() => {
    if (navFrom !== null && navFrom !== sp) setNavFrom(null);
  }, [navFrom, sp]);

  // Safety net — never let the skeleton stick if a navigation is aborted
  // (e.g. selecting a value that resolves to the same URL).
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setNavFrom(null), 10000);
    return () => clearTimeout(t);
  }, [pending]);

  return (
    <FilterNavContext.Provider value={{ pending, startNav }}>
      {children}
    </FilterNavContext.Provider>
  );
}

export function useFilterNav() {
  return useContext(FilterNavContext);
}
