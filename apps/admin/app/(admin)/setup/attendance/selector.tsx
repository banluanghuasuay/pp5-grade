"use client";

import { Select } from "@pp5/ui";
import { useRouter } from "next/navigation";
import { useFilterNav } from "../_components/filter-nav-context";

export type GradeOption = { id: string; label: string };
export type RoomOption = { id: string; label: string };

type Props = {
  grades: GradeOption[];
  selectedGradeId: string;
  rooms: RoomOption[];
  selectedRoomId: string;
  term: "1" | "2" | "summary";
  month: number;
};

/**
 * Top selector for /setup/attendance.
 *
 * Just grade + room (room hidden when 1 room) — term + month live in URL via
 * the tab links below the selector.
 */
export function AttendanceSelector({
  grades,
  selectedGradeId,
  rooms,
  selectedRoomId,
  term,
  month,
}: Props) {
  const router = useRouter();
  // Fire the grid skeleton at 0ms on selection — see filter-nav-context.
  const { startNav } = useFilterNav();

  const navigate = (nextGrade: string, nextRoom: string) => {
    startNav();
    const params = new URLSearchParams();
    if (nextGrade) params.set("grade", nextGrade);
    if (nextRoom) params.set("room", nextRoom);
    params.set("term", term);
    params.set("month", String(month));
    router.push(`/setup/attendance?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">เลือกชั้น:</label>
        <Select
          value={selectedGradeId}
          onChange={(e) => navigate(e.target.value, "")}
          className="w-32"
        >
          <option value="">— เลือกชั้น —</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Room dropdown only when the grade has 2+ rooms — single-room grades
          auto-select server-side (user spec 2026-05-31, revised). */}
      {selectedGradeId && rooms.length > 1 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-700">เลือกห้อง:</label>
          <Select
            value={selectedRoomId}
            onChange={(e) => navigate(selectedGradeId, e.target.value)}
            className="w-36"
          >
            <option value="">— เลือกห้อง —</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
