import { CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { getVersionStatus } from "@/lib/version-check";

/**
 * Quiet "current version" indicator for the bottom of the dashboard. Always
 * renders (unlike the banner, which only shows when outdated):
 *   - up to date → "เวอร์ชัน 1.0.0 · เป็นเวอร์ชันล่าสุด" (emerald)
 *   - outdated   → "เวอร์ชัน 1.0.0 · มีเวอร์ชันใหม่ 1.1.0" (amber)
 *   - offline    → "เวอร์ชัน 1.0.0" (can't confirm latest — neutral)
 *
 * Mount inside <Suspense fallback={null}> so the GitHub check never blocks the
 * dashboard's first paint.
 */
export async function VersionStatus() {
  const { current, latest, updateAvailable, notes } = await getVersionStatus();

  if (updateAvailable) {
    return (
      <div className="mt-8 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
          <Sparkles className="size-3.5" aria-hidden />
          เวอร์ชัน {current} · มีเวอร์ชันใหม่ {latest} พร้อมอัปเดต
          {notes ? ` (${notes})` : ""}
        </span>
      </div>
    );
  }

  // Up to date (latest confirmed equal) vs offline (latest unknown).
  const confirmed = latest !== null;
  return (
    <div className="mt-8 flex justify-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-500">
        {confirmed ? (
          <>
            <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
            เวอร์ชัน {current} · เป็นเวอร์ชันล่าสุด
          </>
        ) : (
          <>
            <RefreshCw className="size-3.5 text-zinc-400" aria-hidden />
            เวอร์ชัน {current}
          </>
        )}
      </span>
    </div>
  );
}
