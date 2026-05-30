import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { UserCheck } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/teacher-scope";
import { abbreviateTitle } from "../score-structure/grading-utils";
import { HomeroomRow } from "./homeroom-row";

export const metadata = {
  title: "ครูประจำชั้น · ระบบ ปพ.5",
};

/**
 * Homeroom-teacher assignments page.
 *
 * One row per classroom (in the current academic year), two dropdowns
 * each (ครูประจำชั้นหลัก / ครูประจำชั้นรอง). Optional — admin can leave
 * either or both unassigned. Same teacher can't be in both roles of
 * the same room (DB enforces via UNIQUE; UI filters dropdown options
 * to make it impossible to pick the conflict).
 *
 * Schema:
 *   - homeroom_assignments: (classroom_id, teacher_id, role)
 *     UNIQUE (classroom_id, role)        — 1 primary + 1 secondary/ห้อง
 *     UNIQUE (classroom_id, teacher_id)  — ครูคนเดียวกันลงห้องเดียวกัน
 *                                          2 ตำแหน่งไม่ได้
 *   - role enum: 'primary' | 'secondary'
 *
 * Page groups classrooms visually by ระดับชั้น (ป.1 / ป.2 / ม.1 …) with
 * a subheading + rows beneath, since schools usually think "ครูประจำชั้น
 * ของ ป.1/1" rather than "ของห้อง #abc-123".
 */
export default async function HomeroomsPage() {
  await requireAdmin();
  const supabase = await createClient();

  // 1. Current academic year — needed to scope classroom list
  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("id, year_be")
    .eq("is_current", true)
    .maybeSingle();

  if (!currentYear) {
    return (
      <>
        <PageHeader
          icon={UserCheck}
          iconBg="bg-amber-100 text-amber-700"
          title="ครูประจำชั้น"
          description="จัดครูประจำชั้น (หลัก / รอง) ให้แต่ละห้อง"
        />
        <Card variant="warning" padding="sm" className="text-sm text-amber-900">
          ⚠️ ยังไม่มีปีการศึกษาปัจจุบัน ·{" "}
          <Link
            href="/setup/academic-years"
            className="font-medium underline"
          >
            ไปตั้งค่าปีการศึกษา
          </Link>
        </Card>
      </>
    );
  }

  // 2. Classrooms in current year, with grade_level for grouping/labelling
  const { data: classroomsRaw } = await supabase
    .from("classrooms")
    .select(
      `
      id,
      room_number,
      grade_level:grade_levels!grade_level_id (
        id,
        name_short,
        name_th,
        sort_order
      )
    `,
    )
    .eq("academic_year_id", currentYear.id);

  // 3. Active teachers + learning_areas (for sort_order map). Sorted to
  //    match /setup/teachers: ผอ. → รองผอ. → ครู (by กลุ่มสาระ, then name).
  //    User spec 2026-05-22: dropdown order ต้องเหมือนหน้าจัดการครู.
  const [teachersResult, areasResult] = await Promise.all([
    supabase
      .from("teachers")
      .select(
        `
        id,
        position,
        department,
        user:users!user_id (
          full_name,
          title,
          is_active
        )
      `,
      ),
    supabase.from("learning_areas").select("name_th, sort_order"),
  ]);

  const deptOrder = new Map<string, number>();
  for (const a of areasResult.data ?? []) {
    deptOrder.set(a.name_th, a.sort_order);
  }
  const positionRank = (pos: string | null): number => {
    if (pos === "ผู้อำนวยการ") return 0;
    if (pos === "รองผู้อำนวยการ") return 1;
    return 2;
  };

  const teachers = (teachersResult.data ?? [])
    .filter((t) => t.user?.is_active)
    .sort((a, b) => {
      const rankA = positionRank(a.position);
      const rankB = positionRank(b.position);
      if (rankA !== rankB) return rankA - rankB;
      if (rankA === 2) {
        const dA = deptOrder.get(a.department ?? "") ?? 999;
        const dB = deptOrder.get(b.department ?? "") ?? 999;
        if (dA !== dB) return dA - dB;
      }
      return (a.user?.full_name ?? "").localeCompare(
        b.user?.full_name ?? "",
        "th",
      );
    })
    .map((t) => ({
      id: t.id,
      label: `${abbreviateTitle(t.user!.title)}${t.user!.full_name}`,
    }));

  // 4. Existing assignments — keyed by `${classroom_id}|${role}`
  const { data: assignments } = await supabase
    .from("homeroom_assignments")
    .select("classroom_id, teacher_id, role");

  const assignmentMap = new Map<string, string>(); // "classroom|role" → teacher_id
  for (const a of assignments ?? []) {
    assignmentMap.set(`${a.classroom_id}|${a.role}`, a.teacher_id);
  }

  // 5. Group classrooms by grade for visual organization
  type ClassroomRow = {
    id: string;
    room_number: number;
    grade_id: string;
    grade_name_short: string;
    grade_name_th: string;
    grade_sort: number;
  };
  const classrooms: ClassroomRow[] = (classroomsRaw ?? [])
    .filter((c) => c.grade_level)
    .map((c) => ({
      id: c.id,
      room_number: c.room_number,
      grade_id: c.grade_level!.id,
      grade_name_short: c.grade_level!.name_short,
      grade_name_th: c.grade_level!.name_th,
      grade_sort: c.grade_level!.sort_order,
    }))
    .sort((a, b) => {
      if (a.grade_sort !== b.grade_sort) return a.grade_sort - b.grade_sort;
      return a.room_number - b.room_number;
    });

  // Per user spec — labels use the OPPOSITE form of what name_th/name_short
  // suggest at first glance:
  //   - Section subheading ("ประถมศึกษาปีที่ 1") → name_th (long form)
  //   - Row label ("ป.1/1")                       → name_short (short form)
  // Rationale: the subheading is a heading so spelling out the full name
  // reads better; row labels appear in a dense table so the abbreviation
  // saves horizontal space + matches how teachers refer to their rooms.
  type GradeGroup = {
    gradeId: string;
    gradeLabel: string; // full name for subheading ("ประถมศึกษาปีที่ 1")
    gradeShort: string; // short name for row labels ("ป.1")
    rows: ClassroomRow[];
  };
  const groups: GradeGroup[] = [];
  for (const c of classrooms) {
    const last = groups[groups.length - 1];
    if (last && last.gradeId === c.grade_id) {
      last.rows.push(c);
    } else {
      groups.push({
        gradeId: c.grade_id,
        gradeLabel: c.grade_name_th,
        gradeShort: c.grade_name_short,
        rows: [c],
      });
    }
  }

  return (
    <>
      <PageHeader
        icon={UserCheck}
        iconBg="bg-amber-100 text-amber-700"
        title="ครูประจำชั้น"
        description={
          <>
            จัดครูประจำชั้น 2 คนต่อห้อง · ปีการศึกษา{" "}
            <strong>{currentYear.year_be}</strong>
          </>
        }
      />

      {classrooms.length === 0 ? (
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            ยังไม่มีห้องเรียนในปีนี้ — สร้างห้องก่อน
          </p>
          <Link
            href="/setup/classrooms"
            className="mt-3 inline-block text-sm font-medium text-zinc-900 underline"
          >
            ไปตั้งค่าชั้นเรียน
          </Link>
        </Card>
      ) : teachers.length === 0 ? (
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            ยังไม่มีรายชื่อครู — เพิ่มครูก่อน
          </p>
          <Link
            href="/setup/teachers"
            className="mt-3 inline-block text-sm font-medium text-zinc-900 underline"
          >
            ไปจัดการครู
          </Link>
        </Card>
      ) : (
        <Card padding={false} className="overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="w-32 px-3 py-2.5 text-left">ห้อง</th>
                {/* Both teacher columns have equal status per user spec —
                    the "primary/secondary" enum in DB is just a slot
                    identifier, NOT a seniority ranking. */}
                <th className="px-3 py-2.5 text-left">ครูประจำชั้นคนที่ 1</th>
                <th className="px-3 py-2.5 text-left">ครูประจำชั้นคนที่ 2</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <GradeGroupSection
                  key={g.gradeId}
                  group={g}
                  teachers={teachers}
                  assignmentMap={assignmentMap}
                />
              ))}
            </tbody>
          </table>
          <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-500">
            บันทึกอัตโนมัติเมื่อเลือก · ครูคนเดียวกันลงห้องเดียวกัน 2 ตำแหน่ง
            ไม่ได้ (ระบบกรองตัวเลือกให้)
          </div>
        </Card>
      )}
    </>
  );
}

/**
 * Render rows for one grade level, prefixed by a subheading row that
 * groups visually (e.g. "ประถมศึกษาปีที่ 1" header above the rooms).
 * The subheading row uses colSpan=3 to span the whole table.
 *
 * Label form follows user spec:
 *   - subheading       → grade.name_th  (long: "ประถมศึกษาปีที่ 1")
 *   - multi-room rows  → name_short + "/" + room_number ("ป.1/1", "ป.1/2")
 *   - single-room row  → name_short only ("ป.2") — drop the "/1" suffix
 *                        when there's no other room to disambiguate from
 */
function GradeGroupSection({
  group,
  teachers,
  assignmentMap,
}: {
  group: {
    gradeId: string;
    gradeLabel: string;
    gradeShort: string;
    rows: Array<{ id: string; room_number: number }>;
  };
  teachers: Array<{ id: string; label: string }>;
  assignmentMap: Map<string, string>;
}) {
  const isSingleRoom = group.rows.length === 1;
  return (
    <>
      <tr className="border-b border-t border-zinc-200 bg-zinc-100/70">
        <td
          colSpan={3}
          className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-600"
        >
          {group.gradeLabel}
        </td>
      </tr>
      {group.rows.map((r) => {
        const label = isSingleRoom
          ? group.gradeShort
          : `${group.gradeShort}/${r.room_number}`;
        return (
          <HomeroomRow
            key={r.id}
            classroomId={r.id}
            classroomLabel={label}
            teachers={teachers}
            current={{
              primary: assignmentMap.get(`${r.id}|primary`) ?? null,
              secondary: assignmentMap.get(`${r.id}|secondary`) ?? null,
            }}
          />
        );
      })}
    </>
  );
}
