"use client";

import { Menu } from "lucide-react";
import type { CurrentTerm } from "@/lib/current-term";
import { useMobileNav } from "./mobile-nav-context";
import { TermBadge } from "./term-badge";

/**
 * Compact top bar shown only on mobile (`md:hidden`).
 * Desktop uses the Sidebar instead.
 *
 * Left  → hamburger (opens the sidebar drawer — that's where logout now
 *         lives) + brand + user label.
 * Right → current-term badge (replaces the old logout button — user spec
 *         2026-06-01: on mobile, logout moves into the drawer and the green
 *         term badge takes its place here).
 */
export function MobileHeader({
  userLabel,
  term,
}: {
  userLabel: string;
  term: CurrentTerm | null;
}) {
  const { setOpen } = useMobileNav();
  return (
    <header className="no-print flex items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-3 md:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="เปิดเมนู"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary-600"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-zinc-900">
            ระบบบันทึกผลการเรียน
          </h1>
          <p className="truncate text-xs text-zinc-500">{userLabel}</p>
        </div>
      </div>
      <TermBadge term={term} className="shrink-0" />
    </header>
  );
}
