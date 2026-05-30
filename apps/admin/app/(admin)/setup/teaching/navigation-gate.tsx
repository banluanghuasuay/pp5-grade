"use client";

import { useSearchParams } from "next/navigation";
import { TeachingSkeleton } from "./teaching-skeleton";

/**
 * Hides children + shows the teaching-table skeleton the instant the
 * URL's `grade` or `room` param diverges from what the server-rendered
 * children were built for.
 *
 * Same pattern as `/setup/subjects/navigation-gate.tsx` — bridges the
 * gap between client-side URL update and RSC streaming so admin sees
 * the new "loading" state at 0ms instead of after the network round-
 * trip. User spec 2026-05-22: "เมื่อเลือกชั้นอื่น ให้แสดง skeleton ที่
 * ตารางแสดงข้อมูล".
 */
export function NavigationGate({
  renderedGradeId,
  renderedRoomId,
  children,
}: {
  /** The grade id the children were server-rendered for. */
  renderedGradeId: string;
  /** The room id the children were server-rendered for. */
  renderedRoomId: string;
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  const targetGrade = params.get("grade");
  const targetRoom = params.get("room");

  const inFlight =
    (targetGrade != null && targetGrade !== renderedGradeId) ||
    (targetRoom != null && targetRoom !== renderedRoomId);

  if (inFlight) {
    return <TeachingSkeleton />;
  }
  return <>{children}</>;
}
