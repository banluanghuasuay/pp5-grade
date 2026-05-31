import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { ClipboardList } from "lucide-react";
import { notFound } from "next/navigation";
import { BackLink } from "../../../../_components/back-link";
import { updatePlan } from "../../actions";
import { PlanForm } from "../../plan-form";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

type Props = { params: Promise<{ id: string }> };

export default async function EditPlanPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("study_plans")
    .select(
      `
      id,
      name,
      description,
      is_default,
      grade_level_id,
      grade_level:grade_levels!grade_level_id (
        id,
        name_short,
        name_th
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (!plan || !plan.grade_level) notFound();

  const backHref = `/setup/subjects?grade=${plan.grade_level.id}&plan=${plan.id}`;
  const gradeLabel = `${plan.grade_level.name_short} (${plan.grade_level.name_th})`;

  return (
    <>
      <div className="mb-4">
        <BackLink href={backHref} />
      </div>
      <PageHeader
        icon={ClipboardList}
        iconBg="bg-amber-100 text-amber-700"
        title={`แก้ไขแผน: ${plan.name} ${plan.grade_level.name_short}`}
      />

      <Card className="max-w-2xl">
        <PlanForm
          action={updatePlan}
          gradeLevelId={plan.grade_level.id}
          gradeLabel={gradeLabel}
          cancelHref={backHref}
          submitLabel="บันทึกการแก้ไข"
          defaultValues={{
            id: plan.id,
            name: plan.name,
            description: plan.description,
            is_default: plan.is_default,
          }}
        />
      </Card>
    </>
  );
}
