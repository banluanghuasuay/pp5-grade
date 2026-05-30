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
  tab: "settings" | "evaluate";
};

/**
 * Top selector for /setup/characteristics — grade + room dropdowns.
 *
 * The classroom context is shared across both sub-tabs (settings + evaluate)
 * even though settings is technically global — keeps the URL pattern
 * consistent and lets admin switch room → click "ประเมิน" tab in one breath.
 */
export function CharacteristicsSelector({
  grades,
  selectedGradeId,
  rooms,
  selectedRoomId,
  tab,
}: Props) {
  const router = useRouter();

  const navigate = (grade: string, room: string) => {
    const params = new URLSearchParams();
    if (grade) params.set("grade", grade);
    if (room) params.set("room", room);
    params.set("tab", tab);
    router.push(`/setup/characteristics?${params.toString()}`);
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
