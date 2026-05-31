"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useFilterNav } from "./filter-nav-context";

/**
 * A `<Link>` that also fires `startNav()` on click — so tab / เดือน /
 * สัปดาห์ navigations (which use `<Link href>` rather than a dropdown's
 * onChange) paint the loading state instantly via `<FilterNavGate>`,
 * exactly like the grade/room dropdowns do.
 *
 * Drop-in replacement for `next/link` — forwards every prop, just wraps
 * onClick. Use inside a `<FilterNavProvider>`; harmless (no-op startNav)
 * outside one.
 */
export function FilterNavLink({
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const { startNav } = useFilterNav();
  return (
    <Link
      {...props}
      onClick={(e) => {
        startNav();
        onClick?.(e);
      }}
    />
  );
}
