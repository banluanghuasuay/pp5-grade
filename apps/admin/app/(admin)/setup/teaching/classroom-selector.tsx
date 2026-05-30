"use client";

import { Select } from "@pp5/ui";
import { useRouter } from "next/navigation";
import { ChangePlanButton } from "./change-plan-button";

export type GradeOption = { id: string; label: string };
export type RoomOption = { id: string; label: string };
export type PlanOption = { id: string; label: string };

type Props = {
  grades: GradeOption[];
  selectedGradeId: string;
  rooms: RoomOption[];
  selectedRoomId: string;
  plans: PlanOption[];
  selectedPlanId: string;
};

/**
 * Top-bar selector for /setup/teaching.
 *
 * - Grade dropdown — URL navigation
 * - Room dropdown — URL navigation, hidden if 1 room
 * - Plan dropdown — server action (updates classrooms.study_plan_id)
 *
 * No semester selector: one teacher assignment covers BOTH ภาค 1 และ ภาค 2.
 * Score entry (in /setup/score-structure) still separates ภาค 1/2 because
 * scores differ per semester.
 */
export function ClassroomSelector({
  grades,
  selectedGradeId,
  rooms,
  selectedRoomId,
  plans,
  selectedPlanId,
}: Props) {
  const router = useRouter();

  const navigate = (nextGrade: string, nextRoom: string) => {
    const params = new URLSearchParams();
    if (nextGrade) params.set("grade", nextGrade);
    if (nextRoom) params.set("room", nextRoom);
    router.push(`/setup/teaching?${params.toString()}`);
  };

  const onGradeChange = (gradeId: string) => {
    // Grade changed → reset room (will be defaulted server-side)
    navigate(gradeId, "");
  };

  const onRoomChange = (roomId: string) => {
    navigate(selectedGradeId, roomId);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">เลือกชั้น:</label>
        <Select
          value={selectedGradeId}
          onChange={(e) => onGradeChange(e.target.value)}
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
            onChange={(e) => onRoomChange(e.target.value)}
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

      {/* Plan — clear display + explicit "change" button (no auto-switching) */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-700">แผนการเรียน:</span>
        <span className="rounded-md bg-rose-50 px-2.5 py-1 text-sm font-semibold text-rose-800 ring-1 ring-rose-200">
          {plans.find((p) => p.id === selectedPlanId)?.label ?? "ยังไม่กำหนด"}
        </span>
        <ChangePlanButton
          classroomId={selectedRoomId}
          currentPlanId={selectedPlanId}
          currentPlanName={
            plans.find((p) => p.id === selectedPlanId)?.label ?? "—"
          }
          availablePlans={plans}
          gradeId={selectedGradeId}
          roomLabel={rooms.find((r) => r.id === selectedRoomId)?.label ?? ""}
        />
      </div>
    </div>
  );
}
