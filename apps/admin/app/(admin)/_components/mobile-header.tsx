"use client";

import { LogOut } from "lucide-react";

/**
 * Compact top bar shown only on mobile (`md:hidden`).
 * Desktop uses the Sidebar instead.
 */
export function MobileHeader({
  userLabel,
  logoutAction,
}: {
  userLabel: string;
  logoutAction: () => Promise<void>;
}) {
  return (
    <header className="no-print flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
      <div>
        <h1 className="text-base font-bold text-zinc-900">ระบบ ปพ.5</h1>
        <p className="truncate text-xs text-zinc-500">{userLabel}</p>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          aria-label="ออกจากระบบ"
          className="flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          ออกจากระบบ
        </button>
      </form>
    </header>
  );
}
