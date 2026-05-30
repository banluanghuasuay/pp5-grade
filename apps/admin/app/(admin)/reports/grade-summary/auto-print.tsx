"use client";

import { useEffect } from "react";

/**
 * Triggers the browser's print dialog as soon as the page mounts. Used by
 * `/reports/grade-summary` so clicking "พิมพ์รายงาน" on the summary tab
 * jumps straight to the print dialog without the user having to click
 * "พิมพ์" again on the loaded page.
 *
 * Mount delay: a single `requestAnimationFrame` is enough — the page is
 * server-rendered so the body is already in place by the time we mount,
 * but the rAF tick gives the browser a paint cycle so the print preview
 * captures the FULLY laid-out table (not an intermediate state where the
 * <table> hasn't measured its column widths yet).
 *
 * Renders nothing.
 */
export function AutoPrint() {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      window.print();
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}
