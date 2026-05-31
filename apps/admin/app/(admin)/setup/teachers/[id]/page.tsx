import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { Users } from "lucide-react";
import { notFound } from "next/navigation";
import { BackLink } from "../../../_components/back-link";
import { updateTeacher } from "../actions";
import { ResetPasswordForm } from "../reset-password-form";
import { TeacherForm } from "../teacher-form";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

// Next.js 16: params is async
type Props = { params: Promise<{ id: string }> };

export default async function EditTeacherPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const [teacherResult, areasResult] = await Promise.all([
    supabase
      .from("teachers")
      .select(
        `
        id,
        position,
        department,
        is_department_head,
        user:users!user_id (
          id,
          username,
          full_name,
          title,
          email,
          phone,
          role,
          is_active
        )
      `,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("learning_areas")
      .select("name_th")
      .order("sort_order"),
  ]);

  const teacher = teacherResult.data;
  if (teacherResult.error || !teacher || !teacher.user) {
    notFound();
  }

  const departments = (areasResult.data ?? []).map((a) => a.name_th);

  return (
    <>
      <div className="mb-4">
        <BackLink href="/setup/teachers" />
      </div>
      <PageHeader
        icon={Users}
        iconBg="bg-emerald-100 text-emerald-700"
        title={`แก้ไขข้อมูลครู: ${teacher.user.title ?? ""}${teacher.user.full_name}`}
        description="ชื่อผู้ใช้แก้ไม่ได้ · เปลี่ยนรหัสผ่านในส่วนด้านล่าง"
      />

      <Card className="max-w-3xl">
        <TeacherForm
          action={updateTeacher}
          departments={departments}
          showPassword={false}
          lockUsername={true}
          showStatus={true}
          submitLabel="บันทึกการแก้ไข"
          defaultValues={{
            id: teacher.id,
            username: teacher.user.username,
            full_name: teacher.user.full_name,
            title: teacher.user.title,
            email: teacher.user.email,
            phone: teacher.user.phone,
            is_admin: teacher.user.role === "admin",
            position: teacher.position,
            department: teacher.department,
            is_department_head: teacher.is_department_head,
            is_active: teacher.user.is_active,
          }}
        />
      </Card>

      <Card variant="warning" className="mt-8 max-w-3xl">
        <h3 className="text-base font-semibold text-zinc-900">
          เปลี่ยนรหัสผ่าน
        </h3>
        <p className="mt-1 mb-4 text-xs text-zinc-600">
          Admin ตั้งรหัสผ่านใหม่ให้ครู · ไม่ต้องรู้รหัสผ่านเดิม · แจ้งครูตอนพบกัน
        </p>
        <ResetPasswordForm teacherId={teacher.id} />
      </Card>
    </>
  );
}
