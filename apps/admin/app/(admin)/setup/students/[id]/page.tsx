import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { GraduationCap } from "lucide-react";
import { notFound } from "next/navigation";
import { BackLink } from "../../../_components/back-link";
import { updateStudent } from "../actions";
import { ResetPasswordForm } from "../reset-password-form";
import { StudentForm, type ClassroomOption } from "../student-form";

export const metadata = {
  title: "แก้ไขนักเรียน · ระบบ ปพ.5",
};

// Next.js 16: params is async
type Props = { params: Promise<{ id: string }> };

export default async function EditStudentPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  // Fetch student + their enrollments + current academic year
  const [studentResult, currentYearResult] = await Promise.all([
    supabase
      .from("students")
      .select(
        `
        id,
        student_code,
        title,
        first_name,
        last_name,
        gender,
        birth_date,
        national_id,
        enrollments (
          id,
          classroom_id,
          semester,
          classroom:classrooms!classroom_id (academic_year_id)
        )
      `,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("academic_years")
      .select("id, year_be, current_semester")
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  const student = studentResult.data;
  if (studentResult.error || !student) {
    notFound();
  }

  const currentYear = currentYearResult.data;
  const currentSemester: 1 | 2 =
    currentYear?.current_semester === 2 ? 2 : 1;

  // Find current-year enrollment to pre-select classroom + semester
  const currentEnr =
    currentYear &&
    student.enrollments?.find(
      (e) => e.classroom?.academic_year_id === currentYear.id,
    );
  const currentEnrollmentClassroomId = currentEnr?.classroom_id ?? null;
  const currentEnrollmentSemester: 1 | 2 =
    currentEnr?.semester === 2 ? 2 : currentEnr?.semester === 1 ? 1 : currentSemester;

  // Build classroom options for the dropdown (only if there's a current year)
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
        title={`แก้ไขนักเรียน: ${student.title ?? ""}${student.first_name} ${student.last_name}`}
        description="รหัสนักเรียนแก้ไม่ได้ · เปลี่ยนรหัสผ่านในส่วนด้านล่าง"
      />

      <Card className="max-w-3xl">
        <StudentForm
          action={updateStudent}
          classrooms={classrooms}
          showPassword={false}
          lockStudentCode={true}
          submitLabel="บันทึกการแก้ไข"
          currentSemester={currentSemester}
          defaultValues={{
            id: student.id,
            student_code: student.student_code,
            title: student.title,
            first_name: student.first_name,
            last_name: student.last_name,
            gender: student.gender,
            birth_date: student.birth_date,
            national_id: student.national_id,
            classroom_id: currentEnrollmentClassroomId,
            semester: currentEnrollmentSemester,
          }}
        />
      </Card>

      <Card variant="warning" className="mt-8 max-w-3xl">
        <h3 className="text-base font-semibold text-zinc-900">
          เปลี่ยนรหัสผ่าน
        </h3>
        <p className="mt-1 mb-4 text-xs text-zinc-600">
          Admin ตั้งรหัสผ่านใหม่ให้นักเรียน · ไม่ต้องรู้รหัสผ่านเดิม ·
          แจ้งผู้ปกครองตอนพบกัน
        </p>
        <ResetPasswordForm studentId={student.id} />
      </Card>
    </>
  );
}
