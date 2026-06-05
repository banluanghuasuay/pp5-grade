"use client";

import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { UpdateStatus } from "@/lib/version-check";

/**
 * Dismissible "new version available" banner.
 *
 * Dismissal is per-version (localStorage key includes the latest version) — so
 * dismissing v1.1.0 hides it until v1.2.0 ships, then it shows again. Starts
 * hidden and reveals after mount so there's no SSR/hydration mismatch (the
 * server can't read localStorage).
 */
export function UpdateBannerClient({ status }: { status: UpdateStatus }) {
  const storageKey = `pp5-update-dismissed-${status.latest}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  if (hidden) return null;

  return (
    <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <Sparkles className="size-5 shrink-0 text-emerald-600" />
        <div className="flex-1">
          <span className="font-medium">
            มีเวอร์ชันใหม่ {status.latest} พร้อมให้อัปเดต
          </span>
          {status.notes && (
            <span className="text-emerald-700"> · {status.notes}</span>
          )}
          <span className="ml-1 text-emerald-600">
            (กำลังใช้ {status.current} — กรุณา Sync fork แล้ว Redeploy
            หรือติดต่อผู้ดูแลระบบ)
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(storageKey, "1");
            setHidden(true);
          }}
          className="shrink-0 rounded p-1 text-emerald-600 hover:bg-emerald-100"
          aria-label="ปิดการแจ้งเตือน"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
