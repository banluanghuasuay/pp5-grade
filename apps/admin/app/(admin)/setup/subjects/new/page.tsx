import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { BookOpen } from "lucide-react";
import { BackLink } from "../../../_components/back-link";
import { createSubject } from "../actions";
import {
  SubjectForm,
  type GradeLevelOption,
  type LearningAreaOption,
} from "../subject-form";

export const metadata = {
  title: "เพิ่มวิชา · ระบบ ปพ.5",
};

type Props = {
  searchParams: Promise<{ grade?: string; plan?: string }>;
};

export default async function NewSubjectPage({ searchParams }: Props) {
  const { grade: gradeParam, plan: planParam } = await searchParams;
  const supabase = await createClient();

  const [gradesResult, areasResult, planResult] = await Promise.all([
    supabase
      .from("grade_levels")
      .select("id, name_th, name_short, sort_order, system")
      .order("sort_order"),
    supabase
      .from("learning_areas")
      .select("id, name_th")
      .order("sort_order"),
    planParam
      ? supabase
          .from("study_plans")
          .select("id, name, grade_level_id")
          .eq("id", planParam)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const gradeLevels: GradeLevelOption[] = (gradesResult.data ?? []).map(
    (g) => ({
      id: g.id,
      display_name: `${g.name_short} (${g.name_th})`,
      system: g.system,
    }),
  );

  const learningAreas: LearningAreaOption[] = (areasResult.data ?? []).map(
    (a) => ({ id: a.id, name_th: a.name_th }),
  );

  // Plan context (if URL has ?plan=<id>) — lock grade + show in title
  const plan = planResult.data;
  const planContext = plan
    ? {
        id: plan.id,
        name: plan.name,
        grade_level_id: plan.grade_level_id,
      }
    : null;

  const effectiveGradeId = planContext?.grade_level_id ?? gradeParam ?? "";

  const backHref = planContext
    ? `/setup/subjects?grade=${planContext.grade_level_id}&plan=${planContext.id}`
    : effectiveGradeId
      ? `/setup/subjects?grade=${effectiveGradeId}`
      : "/setup/subjects";

  return (
    <>
      <div className="mb-4">
        <BackLink href={backHref} />
      </div>
      <PageHeader
        icon={BookOpen}
        iconBg="bg-amber-100 text-amber-700"
        title={planContext ? `เพิ่มวิชาในแผน ${planContext.name}` : "เพิ่มวิชา"}
        description={
          planContext
            ? `วิชาใหม่จะถูกผูกกับแผน "${planContext.name}" อัตโนมัติ`
            : `1 วิชา = 1 ระดับชั้น · เช่น "คณิตศาสตร์ ป.1" และ "คณิตศาสตร์ ป.2" เป็นคนละ record`
        }
      />

      <Card className="max-w-3xl">
        <SubjectForm
          action={createSubject}
          gradeLevels={gradeLevels}
          learningAreas={learningAreas}
          submitLabel="เพิ่มวิชา"
          lockGradeLevel={!!planContext}
          planId={planContext?.id}
          cancelHref={backHref}
          defaultValues={
            effectiveGradeId ? { grade_level_id: effectiveGradeId } : undefined
          }
        />
      </Card>
    </>
  );
}
