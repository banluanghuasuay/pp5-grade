"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { UpdateStatus } from "@/lib/version-check";

/**
 * "New version available" banner.
 *
 * Dismiss is SESSION-STATE ONLY (not persisted) — closing it hides the banner
 * for the current app session, but it reappears on the next full load / app
 * reopen, so an outdated school keeps getting nudged. Within a session the
 * (admin) layout stays mounted across client navigation, so this state survives
 * page-to-page moves but resets on reload. The dashboard VersionStatus line is
 * the always-on backstop.
 */
export function UpdateBannerClient({ status }: { status: UpdateStatus }) {
  const [hidden, setHidden] = useState(false);

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
          onClick={() => setHidden(true)}
          className="shrink-0 rounded p-1 text-emerald-600 hover:bg-emerald-100"
          aria-label="ปิดการแจ้งเตือน (จะแสดงอีกเมื่อเปิดแอปใหม่)"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
