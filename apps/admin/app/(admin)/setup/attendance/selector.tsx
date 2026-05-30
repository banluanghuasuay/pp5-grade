"use client";

import { Select } from "@pp5/ui";
import { useRouter } from "next/navigation";

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

  const navigate = (nextGrade: string, nextRoom: string) => {
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
            value={selectedRoomId}
            onChange={(e) => navigate(selectedGradeId, e.target.value)}
            className="w-36"
          >
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
