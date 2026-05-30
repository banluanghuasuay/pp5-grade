"use client";

import { LogOut, Menu } from "lucide-react";
import { useMobileNav } from "./mobile-nav-context";

/**
 * Compact top bar shown only on mobile (`md:hidden`).
 * Desktop uses the Sidebar instead.
 *
 * Includes a hamburger button (left) that opens the sidebar as a
 * slide-in drawer — without it the menu would be unreachable on
 * mobile (the sidebar uses `hidden md:flex`). User spec 2026-05-22:
 * "เมื่อย่อแล้วเมนูหาย หาที่กดไม่ได้".
 */
export function MobileHeader({
  userLabel,
  logoutAction,
}: {
  userLabel: string;
  logoutAction: () => Promise<void>;
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
      <form action={logoutAction}>
        <button
          type="submit"
          aria-label="ออกจากระบบ"
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          ออกจากระบบ
        </button>
      </form>
    </header>
  );
}
