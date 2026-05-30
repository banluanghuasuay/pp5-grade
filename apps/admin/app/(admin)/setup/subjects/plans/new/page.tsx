import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { ClipboardList } from "lucide-react";
import { notFound } from "next/navigation";
import { BackLink } from "../../../../_components/back-link";
import { createPlan } from "../../actions";
import { PlanForm } from "../../plan-form";

export const metadata = {
  title: "เพิ่มแผนการเรียน · ระบบ ปพ.5",
};

type Props = { searchParams: Promise<{ grade?: string }> };

export default async function NewPlanPage({ searchParams }: Props) {
  const { grade: gradeId } = await searchParams;
  if (!gradeId) notFound();

  const supabase = await createClient();
  const { data: grade } = await supabase
    .from("grade_levels")
    .select("id, name_short, name_th")
    .eq("id", gradeId)
    .maybeSingle();

  if (!grade) notFound();

  const backHref = `/setup/subjects?grade=${grade.id}`;
  const gradeLabel = `${grade.name_short} (${grade.name_th})`;

  return (
    <>
      <div className="mb-4">
        <BackLink href={backHref} />
      </div>
      <PageHeader
        icon={ClipboardList}
        iconBg="bg-amber-100 text-amber-700"
        title={`เพิ่มแผนการเรียน · ${grade.name_short}`}
        description={`เช่น "EP", "วิทย์-คณิต" · ของระดับชั้น ${grade.name_short}`}
      />

      <Card className="max-w-2xl">
        <PlanForm
          action={createPlan}
          gradeLevelId={grade.id}
          gradeLabel={gradeLabel}
          cancelHref={backHref}
          submitLabel="เพิ่มแผน"
        />
      </Card>
    </>
  );
}
