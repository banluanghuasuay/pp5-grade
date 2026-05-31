"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

/**
 * Bridges sidebar links ↔ the page-content overlay so a skeleton can
 * appear the INSTANT a nav link is clicked — before the new route's RSC
 * has streamed in.
 *
 * Why this exists (Next.js 16 behaviour): on a client-side navigation
 * between two routes that share the `(admin)` layout, React keeps the
 * OLD page content mounted inside the shared Suspense boundary (a
 * concurrent-rendering optimisation that avoids flicker). The result is
 * the old table stays frozen on-screen until the new page is fully
 * ready — which users read as lag. `loading.tsx` doesn't help here
 * because it sits ABOVE the shared layout and is invisible to sibling
 * navigations (see node_modules/next/.../instant-navigation.md).
 *
 * The fix: sidebar `<Link>` descendants call `bumpNav()` the moment
 * their `useLinkStatus().pending` flips true. `navToken` increments,
 * the overlay sees it and covers the stale content with a skeleton
 * until `usePathname()` changes (= new content committed).
 *
 * We use a monotonic counter rather than a boolean so repeated
 * navigations each register as a distinct "start" event (a boolean that
 * is already true wouldn't re-fire the overlay's effect).
 */
const NavigationStatusContext = createContext<{
  navToken: number;
  bumpNav: () => void;
}>({ navToken: 0, bumpNav: () => {} });

export function NavigationStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [navToken, setNavToken] = useState(0);
  const bumpNav = useCallback(() => setNavToken((t) => t + 1), []);
  return (
    <NavigationStatusContext.Provider value={{ navToken, bumpNav }}>
      {children}
    </NavigationStatusContext.Provider>
  );
}

export function useNavigationStatus() {
  return useContext(NavigationStatusContext);
}
