"use client";

import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

/**
 * Hides children + shows a spinner the instant the URL's `grade` or
 * `plan` param diverges from what the server-rendered children were
 * built for. Bridges the gap between
 *   (1) user clicks dropdown → URL updates immediately (client-side),
 *       but RSC for the new tree hasn't streamed yet
 *   (2) new RSC arrives → React Suspense fallback kicks in
 *
 * Without this gate, the OLD subjects list stays on-screen during (1)
 * and only blanks out at (2), which the user perceives as "delay
 * before spinner appears". User spec 2026-05-22: "เมื่อเลือกชั้นแล้ว
 * รายวิชาหายไปแล้วแสดง spinner ตรงนั้นเลย".
 */
export function NavigationGate({
  renderedGradeId,
  renderedPlanId,
  children,
}: {
  /** The grade id the children were server-rendered for. */
  renderedGradeId: string;
  /** The plan id the children were server-rendered for. */
  renderedPlanId: string;
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  const targetGrade = params.get("grade");
  const targetPlan = params.get("plan");

  // A URL param being null = "user hasn't specified" = use whatever
  // the server resolved → no mismatch. Only flag in-flight when the
  // user-specified value DIVERGES from what we rendered.
  const inFlight =
    (targetGrade != null && targetGrade !== renderedGradeId) ||
    (targetPlan != null && targetPlan !== renderedPlanId);

  if (inFlight) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        กำลังโหลดรายวิชา…
      </div>
    );
  }
  return <>{children}</>;
}
