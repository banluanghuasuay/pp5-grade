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
};

/** Top selector for /setup/reading-thinking — grade + room dropdowns. */
export function ReadingThinkingSelector({
  grades,
  selectedGradeId,
  rooms,
  selectedRoomId,
}: Props) {
  const router = useRouter();
  const { startNav } = useFilterNav();

  const navigate = (grade: string, room: string) => {
    startNav();
    const params = new URLSearchParams();
    if (grade) params.set("grade", grade);
    if (room) params.set("room", room);
    router.push(`/setup/reading-thinking?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">ระดับชั้น:</label>
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

      {/* Room dropdown appears once a grade is picked. Shown even for a
          single-room grade — user spec 2026-05-31: "เลือกห้องทุกครั้ง". */}
      {selectedGradeId && (
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
