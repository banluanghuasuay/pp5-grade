"use client";

import { Select } from "@pp5/ui";
import { useRouter } from "next/navigation";
import { useFilterNav } from "../_components/filter-nav-context";
import { useOptimisticValue } from "../_components/use-optimistic-value";

export type GradeOption = { id: string; label: string };
export type RoomOption = { id: string; label: string };
export type SubjectOption = {
  id: string;
  label: string;
  /** If false, the dropdown appends "(ยังไม่จัดครูเข้าสอน)" to the label.
   *  Admin can still record scores — the page auto-creates an offering with
   *  teacher_id=NULL so the score chain works. */
  hasTeacher: boolean;
};

type Props = {
  grades: GradeOption[];
  selectedGradeId: string;
  rooms: RoomOption[];
  selectedRoomId: string;
  subjects: SubjectOption[];
  selectedSubjectId: string;
  tab: "1" | "2" | "summary";
  /** Base URL path the selector navigates to — defaults to score-structure.
   *  /setup/activities passes its own path to stay within the activities
   *  page when navigating between grade/room/subject. */
  basePath?: string;
};

/**
 * Top selector for /setup/score-structure (and /setup/activities).
 *
 * - ระดับชั้น dropdown (always)
 * - เลือกห้อง dropdown (only when 2+ rooms)
 * - รายวิชา dropdown (offerings in this classroom — any semester)
 *
 * Auto-loads on every change (URL navigation).
 */
export function ScoreSelector({
  grades,
  selectedGradeId,
  rooms,
  selectedRoomId,
  subjects,
  selectedSubjectId,
  tab,
  basePath = "/setup/score-structure",
}: Props) {
  const router = useRouter();
  const { startNav } = useFilterNav();
  // Optimistic mirrors so each dropdown snaps to the picked value instantly,
  // instead of waiting for the RSC navigation to commit.
  const [gradeVal, setGradeOpt] = useOptimisticValue(selectedGradeId);
  const [roomVal, setRoomOpt] = useOptimisticValue(selectedRoomId);
  const [subjectVal, setSubjectOpt] = useOptimisticValue(selectedSubjectId);

  const navigate = (
    grade: string,
    room: string,
    subject: string,
    nextTab: string,
  ) => {
    startNav();
    const params = new URLSearchParams();
    if (grade) params.set("grade", grade);
    if (room) params.set("room", room);
    if (subject) params.set("subject", subject);
    params.set("tab", nextTab);
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">ระดับชั้น:</label>
        <Select
          value={gradeVal}
          onChange={(e) => {
            setGradeOpt(e.target.value);
            navigate(e.target.value, "", "", tab);
          }}
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
              navigate(selectedGradeId, e.target.value, "", tab);
            }}
            className="w-36"
          >
            {!roomVal && <option value="">— เลือกห้อง —</option>}
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex flex-1 items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">รายวิชา:</label>
        <Select
          value={subjectVal}
          onChange={(e) => {
            setSubjectOpt(e.target.value);
            navigate(selectedGradeId, selectedRoomId, e.target.value, tab);
          }}
          className="min-w-[280px] flex-1"
          disabled={subjects.length === 0}
        >
          {subjects.length === 0 ? (
            <option value="">— ไม่มีวิชาในห้องนี้ —</option>
          ) : (
            <>
              {!subjectVal && (
                <option value="">— เลือกวิชา —</option>
              )}
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                  {!s.hasTeacher && " · (ยังไม่จัดครูเข้าสอน)"}
                </option>
              ))}
            </>
          )}
        </Select>
      </div>
    </div>
  );
}
