import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { BackLink } from "../../../_components/back-link";
import { createStudent } from "../actions";
import { StudentForm, type ClassroomOption } from "../student-form";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

export default async function NewStudentPage() {
  const supabase = await createClient();

  // Resolve current year + its classrooms
  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("id, year_be, current_semester")
    .eq("is_current", true)
    .maybeSingle();

  const currentSemester: 1 | 2 =
    currentYear?.current_semester === 2 ? 2 : 1;

  let classrooms: ClassroomOption[] = [];

  if (currentYear) {
    const { data: classroomData } = await supabase
      .from("classrooms")
      .select(
        `
        id,
        room_number,
        grade_level_id,
        grade_level:grade_levels!grade_level_id (
          name_short,
          sort_order,
          system
        )
      `,
      )
      .eq("academic_year_id", currentYear.id);

    // Count rooms per grade for smart naming
    const roomCountByGrade = new Map<string, number>();
    for (const c of classroomData ?? []) {
      roomCountByGrade.set(
        c.grade_level_id,
        (roomCountByGrade.get(c.grade_level_id) ?? 0) + 1,
      );
    }

    classrooms = (classroomData ?? [])
      .map((c) => ({
        id: c.id,
        grade_order: c.grade_level?.sort_order ?? 999,
        room_number: c.room_number,
        display_name:
          (roomCountByGrade.get(c.grade_level_id) ?? 1) > 1
            ? `${c.grade_level?.name_short ?? "?"}/${c.room_number}`
            : c.grade_level?.name_short ?? "?",
        system: (c.grade_level?.system === "secondary"
          ? "secondary"
          : "primary") as "primary" | "secondary",
      }))
      .sort((a, b) => {
        if (a.grade_order !== b.grade_order)
          return a.grade_order - b.grade_order;
        return a.room_number - b.room_number;
      })
      .map(({ id, display_name, system }) => ({ id, display_name, system }));
  }

  return (
    <>
      <div className="mb-4">
        <BackLink href="/setup/students" />
      </div>
      <PageHeader
        icon={GraduationCap}
        iconBg="bg-sky-100 text-sky-700"
        title="เพิ่มนักเรียน"
        description={
          <>
            ระบบจะสร้างบัญชี login (email{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">
              {"<student_code>@student.pp5.local"}
            </code>
            ) ให้อัตโนมัติ · login ผ่าน apps/parent (port 3001)
          </>
        }
      />

      {!currentYear && (
        <Card variant="warning" padding="sm" className="mb-4 max-w-3xl text-sm text-amber-900">
          ⚠️ ยังไม่มีปีปัจจุบัน — สร้างนักเรียนได้ แต่จะ assign ห้องไม่ได้ ·{" "}
          <Link
            href="/setup/academic-years"
            className="font-medium underline"
          >
            ตั้งค่าปีการศึกษา
          </Link>
        </Card>
      )}

      <Card className="max-w-3xl">
        <StudentForm
          action={createStudent}
          classrooms={classrooms}
          submitLabel="เพิ่มนักเรียน"
          currentSemester={currentSemester}
        />
      </Card>
    </>
  );
}
