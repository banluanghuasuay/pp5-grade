"use client";

import { Button, Select } from "@pp5/ui";
import { saveOfferingAssignments } from "./actions";
import { useFormStatus } from "react-dom";

export type TeacherOption = {
  id: string;
  /** Display label: "อ.สมชาย ใจดี" */
  label: string;
};

export type SubjectRow = {
  id: string;
  code: string;
  name_th: string;
  category: string;
  /** Currently-assigned teacher_id, or null if no offering exists yet. */
  assignedTeacherId: string | null;
};

type Props = {
  classroomId: string;
  gradeId: string;
  roomId: string;
  subjects: SubjectRow[];
  teachers: TeacherOption[];
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" pending={pending}>
      {pending ? "กำลังบันทึก..." : "บันทึกการมอบหมาย"}
    </Button>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  core: "พื้นฐาน",
  additional: "เพิ่มเติม",
  activity: "กิจกรรม",
};

const CATEGORY_BADGE: Record<string, string> = {
  core: "bg-sky-100 text-sky-800",
  additional: "bg-emerald-100 text-emerald-800",
  activity: "bg-amber-100 text-amber-800",
};

export function TeachingForm({
  classroomId,
  gradeId,
  roomId,
  subjects,
  teachers,
}: Props) {
  return (
    <form action={saveOfferingAssignments}>
      <input type="hidden" name="classroom_id" value={classroomId} />
      {/* No semester input — save action upserts BOTH ภาค 1 และ ภาค 2 */}
      <input type="hidden" name="grade_id" value={gradeId} />
      <input type="hidden" name="room_id" value={roomId} />

      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-white text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            {/* Mobile: รวม ชื่อ + รหัส + ประเภท ใน 1 คอลัมน์ (stacked) ·
                Desktop (md+): แยก 3 คอลัมน์เหมือนเดิม.
                User spec 2026-05-22. */}
            <th className="px-2 py-2.5 font-medium sm:px-4 md:hidden">วิชา</th>
            <th className="hidden px-4 py-2.5 font-medium md:table-cell">
              รหัส
            </th>
            <th className="hidden px-4 py-2.5 font-medium md:table-cell">
              ชื่อรายวิชา
            </th>
            <th className="hidden px-4 py-2.5 font-medium md:table-cell">
              ประเภท
            </th>
            <th className="px-2 py-2.5 font-medium sm:px-4">ครูผู้สอน</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {subjects.map((s) => (
            <tr key={s.id} className="hover:bg-zinc-50">
              {/* Mobile combined: ชื่อ (บรรทัดบน) + รหัส & ประเภท (บรรทัดล่าง) */}
              <td className="px-2 py-2 align-top sm:px-4 md:hidden">
                <div className="font-medium text-zinc-900">{s.name_th}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-primary-700">{s.code}</span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 font-medium ${CATEGORY_BADGE[s.category] ?? "bg-zinc-100 text-zinc-700"}`}
                  >
                    {CATEGORY_LABEL[s.category] ?? s.category}
                  </span>
                </div>
              </td>
              {/* Desktop separate */}
              <td className="hidden px-4 py-2 font-mono text-xs text-primary-700 md:table-cell">
                {s.code}
              </td>
              <td className="hidden px-4 py-2 font-medium text-zinc-900 md:table-cell">
                {s.name_th}
              </td>
              <td className="hidden px-4 py-2 md:table-cell">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[s.category] ?? "bg-zinc-100 text-zinc-700"}`}
                >
                  {CATEGORY_LABEL[s.category] ?? s.category}
                </span>
              </td>
              <td className="px-2 py-2 align-top sm:px-4">
                <Select
                  name={`teacher_${s.id}`}
                  defaultValue={s.assignedTeacherId ?? ""}
                  className="w-full md:min-w-[200px]"
                >
                  <option value="">— ยังไม่กำหนด —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
        <p className="mr-auto text-xs text-zinc-500">
          เลือก "— ยังไม่กำหนด —" เพื่อลบครูออกจากวิชานั้น
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}
