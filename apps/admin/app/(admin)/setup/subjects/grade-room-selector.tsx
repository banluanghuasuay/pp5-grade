"use client";

import { Select } from "@pp5/ui";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFilterNav } from "../_components/filter-nav-context";
import { useOptimisticValue } from "../_components/use-optimistic-value";

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
  /** Room explicitly selected via the dropdown (from ?room URL param). */
  selectedRoomId?: string;
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
  selectedRoomId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Fire the table skeleton at 0ms on selection — see filter-nav-context.
  const { startNav } = useFilterNav();
  // Optimistic mirror so the grade dropdown snaps to the picked value
  // instantly, instead of waiting for the RSC navigation to commit.
  const [gradeVal, setGradeOpt] = useOptimisticValue(selectedGradeId);

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
      // Include &room= so page.tsx knows which room is "active" and
      // clicking a plan card will assign that room to the plan.
      router.push(
        `/setup/subjects?grade=${selectedGradeId}&plan=${room.planId}&room=${roomId}`,
      );
    });
  };

  // Room to highlight: prefer explicit selectedRoomId (from URL ?room param),
  // fall back to inferring from which room uses the currently-displayed plan.
  const currentRoomId =
    selectedRoomId || (rooms.find((r) => r.planId === selectedPlanId)?.id ?? "");
  // Optimistic mirror for the (computed) room value so it snaps instantly too.
  const [roomVal, setRoomOpt] = useOptimisticValue(currentRoomId);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">เลือกชั้น:</label>
        <Select
          value={gradeVal}
          onChange={(e) => {
            setGradeOpt(e.target.value);
            onGradeChange(e.target.value);
          }}
          disabled={isPending}
          className="w-32"
        >
          {!gradeVal && <option value="">— เลือกชั้น —</option>}
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
            value={roomVal}
            onChange={(e) => {
              setRoomOpt(e.target.value);
              onRoomChange(e.target.value);
            }}
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
