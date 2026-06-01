"use client";

import { Select } from "@pp5/ui";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFilterNav } from "../_components/filter-nav-context";

export type GradeOption = {
  id: string;
  label: string; // e.g. "ป.1"
};

export type RoomOption = {
  id: string;
  /** Display, e.g. "ป.1/1" */
  label: string;
  /** The plan this room currently uses — set by ensureRoomsLinked on page load. */
  planId: string | null;
};

type Props = {
  grades: GradeOption[];
  selectedGradeId: string;
  rooms: RoomOption[];
  /** The plan currently displayed — used to highlight which room matches it. */
  selectedPlanId: string;
};

/**
 * Top-bar selector for /setup/subjects.
 *
 * - Grade dropdown always visible
 * - Room dropdown only shown when grade has 2+ rooms (1 room = auto-select)
 *
 * Selecting a grade jumps to that grade (default plan).
 * Selecting a room jumps to that room's plan.
 *
 * `useTransition` only powers the `disabled` state here (prevents
 * double-clicks during navigation). The visual spinner now lives in
 * the subjects area itself via `NavigationGate` — keys off the URL
 * params, so the old subject list blanks out immediately on click.
 * User spec 2026-05-22: "รายวิชาหายไปแล้วแสดง spinner ตรงนั้นเลย
 * ไม่ต้องแสดงข้างดร็อปดาวน์".
 */
export function GradeRoomSelector({
  grades,
  selectedGradeId,
  rooms,
  selectedPlanId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Fire the table skeleton at 0ms on selection — see filter-nav-context.
  const { startNav } = useFilterNav();

  const onGradeChange = (gradeId: string) => {
    if (!gradeId) return;
    startNav();
    startTransition(() => {
      router.push(`/setup/subjects?grade=${gradeId}`);
    });
  };

  const onRoomChange = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room?.planId) return; // room has no plan yet — nothing to navigate to
    startNav();
    startTransition(() => {
      router.push(
        `/setup/subjects?grade=${selectedGradeId}&plan=${room.planId}`,
      );
    });
  };

  // Which room (if any) is using the currently-displayed plan
  const currentRoomId =
    rooms.find((r) => r.planId === selectedPlanId)?.id ?? "";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">เลือกชั้น:</label>
        <Select
          value={selectedGradeId}
          onChange={(e) => onGradeChange(e.target.value)}
          disabled={isPending}
          className="w-32"
        >
          {!selectedGradeId && <option value="">— เลือกชั้น —</option>}
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </Select>
      </div>

      {rooms.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-700">เลือกห้อง:</label>
          <Select
            value={currentRoomId}
            onChange={(e) => onRoomChange(e.target.value)}
            disabled={isPending}
            className="w-36"
          >
            <option value="">— เลือกห้อง —</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id} disabled={!r.planId}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
