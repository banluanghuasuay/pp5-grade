import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { Users } from "lucide-react";
import { BackLink } from "../../../_components/back-link";
import { createTeacher } from "../actions";
import { TeacherForm } from "../teacher-form";

export const metadata = {
  title: "เพิ่มครู · ระบบ ปพ.5",
};

export default async function NewTeacherPage() {
  const supabase = await createClient();
  const { data: areas } = await supabase
    .from("learning_areas")
    .select("name_th")
    .order("sort_order");

  const departments = (areas ?? []).map((a) => a.name_th);

  return (
    <>
      <div className="mb-4">
        <BackLink href="/setup/teachers" />
      </div>
      <PageHeader
        icon={Users}
        iconBg="bg-emerald-100 text-emerald-700"
        title="เพิ่มครู"
        description={
          <>
            ระบบจะสร้างบัญชี login (email{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">
              {"<username>@teacher.pp5.local"}
            </code>
            ) ให้อัตโนมัติ
          </>
        }
      />

      <Card className="max-w-3xl">
        <TeacherForm
          action={createTeacher}
          departments={departments}
          submitLabel="เพิ่มครู"
        />
      </Card>
    </>
  );
}
