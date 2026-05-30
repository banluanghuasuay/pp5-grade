"use client";

import { Select } from "@pp5/ui";
import { useRouter } from "next/navigation";

export type GradeOption = { id: string; label: string };
export type RoomOption = { id: string; label: string };
export type SubjectOption = {
  id: string;
  label: string;
  credit_hours: number | null;
  /** If false, the dropdown appends "(ยังไม่จัดครูเข้าสอน)" to the label
   *  so the admin can see at a glance which subjects still need a teacher.
   *  Attendance can still be recorded — the page auto-creates an offering
   *  with teacher_id=NULL. */
  hasTeacher: boolean;
};

type Props = {
  grades: GradeOption[];
  selectedGradeId: string;
  rooms: RoomOption[];
  selectedRoomId: string;
  subjects: SubjectOption[];
  selectedSubjectId: string;
  /** 4 tabs · 5 weeks per tab (1-5 / 6-10 / 11-15 / 16-20) */
  tab: "1" | "2" | "3" | "4";
};

/**
 * Top selector for /setup/attendance/by-subject.
 *
 * Grade + room + subject. Tab (week range) lives in URL via the secondary
 * tab nav inside the grid card.
 *
 * Note: when grade changes we reset room/subject so the URL doesn't carry
 * an id that no longer exists in the new context.
 */
export function BySubjectSelector({
  grades,
  selectedGradeId,
  rooms,
  selectedRoomId,
  subjects,
  selectedSubjectId,
  tab,
}: Props) {
  const router = useRouter();

  const navigate = (next: {
    grade?: string;
    room?: string;
    subject?: string;
  }) => {
    const params = new URLSearchParams();
    const gradeId = next.grade ?? selectedGradeId;
    if (gradeId) params.set("grade", gradeId);

    // Reset room+subject when grade changes; reset subject when room changes
    if (next.grade !== undefined) {
      // grade changed → drop room + subject
    } else if (next.room !== undefined) {
      params.set("room", next.room);
    } else {
      if (selectedRoomId) params.set("room", selectedRoomId);
      const subjectId = next.subject ?? selectedSubjectId;
      if (subjectId) params.set("subject", subjectId);
    }

    params.set("tab", tab);
    router.push(`/setup/attendance/by-subject?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">เลือกชั้น:</label>
        <Select
          value={selectedGradeId}
          onChange={(e) => navigate({ grade: e.target.value })}
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
            onChange={(e) => navigate({ room: e.target.value })}
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

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">เลือกวิชา:</label>
        <Select
          value={selectedSubjectId}
          onChange={(e) => navigate({ subject: e.target.value })}
          className="min-w-[20rem]"
          disabled={subjects.length === 0}
        >
          {subjects.length === 0 ? (
            <option value="">(ไม่มีวิชาในห้องนี้)</option>
          ) : (
            subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
                {s.credit_hours != null && ` · ${s.credit_hours} นก.`}
                {!s.hasTeacher && " · (ยังไม่จัดครูเข้าสอน)"}
              </option>
            ))
          )}
        </Select>
      </div>
    </div>
  );
}
