"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useNavigationStatus } from "./navigation-status-context";
import { PageSkeleton } from "./page-skeleton";

/**
 * Covers the page-content area with a skeleton during a cross-page
 * navigation, so the stale previous page doesn't sit frozen on-screen
 * while the new route streams in (see navigation-status-context.tsx for
 * the full why).
 *
 * Lifecycle:
 *   1. Sidebar link clicked → `navToken` bumps → show skeleton (0ms,
 *      before the network request even starts).
 *   2. New route's RSC finishes + React commits → `usePathname()`
 *      changes → hide skeleton (the content underneath is now the NEW
 *      page, so there's no flash of the old one).
 *
 * The skeleton is an ABSOLUTE overlay rather than a replacement for
 * `children`: keeping the real children mounted lets React's navigation
 * transition proceed normally underneath; we just hide it visually. The
 * overlay sits inside the page's padded content wrapper, so `inset-0`
 * lines up with where real content renders.
 *
 * A 10s safety timeout clears the skeleton if a navigation is aborted
 * or fails, so it can never get permanently stuck.
 */
export function NavigationOverlay({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { navToken } = useNavigationStatus();
  const prevPathRef = useRef(pathname);
  const [navigating, setNavigating] = useState(false);

  // (1) A nav link reported pending → show the skeleton.
  useEffect(() => {
    if (navToken > 0) setNavigating(true);
  }, [navToken]);

  // (2) Pathname changed → the new page committed → hide the skeleton.
  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      setNavigating(false);
    }
  }, [pathname]);

  // Safety net — never let the overlay stick if a navigation is
  // cancelled (e.g. user clicks the same in-flight link again, or the
  // request errors before pathname changes).
  useEffect(() => {
    if (!navigating) return;
    const t = setTimeout(() => setNavigating(false), 10000);
    return () => clearTimeout(t);
  }, [navigating]);

  // `isolate` makes this wrapper its own stacking context so the overlay's
  // z-index is compared only against its siblings here — not against the
  // whole page. Without it, sticky table cells (the attendance grids pin
  // ชื่อ/รวม columns at inline zIndex:30 / z-20) would out-stack a low
  // overlay and bleed THROUGH the skeleton. z-40 sits above those sticky
  // cells but still below the mobile sidebar drawer (z-50).
  return (
    <div className="relative isolate">
      {children}
      {navigating && (
        <div className="absolute inset-0 z-40 bg-zinc-50">
          <PageSkeleton />
        </div>
      )}
    </div>
  );
}
