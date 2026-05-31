import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { BookOpen } from "lucide-react";
import { notFound } from "next/navigation";
import { BackLink } from "../../../_components/back-link";
import { updateSubject } from "../actions";
import {
  SubjectForm,
  type GradeLevelOption,
  type LearningAreaOption,
} from "../subject-form";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ grade?: string; plan?: string }>;
};

export default async function EditSubjectPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { grade: gradeParam, plan: planParam } = await searchParams;
  const supabase = await createClient();

  const [subjectResult, gradesResult, areasResult] = await Promise.all([
    supabase
      .from("subjects")
      .select(
        "id, code, name_th, learning_area_id, grade_level_id, category, credit_hours, hours_per_year",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("grade_levels")
      .select("id, name_th, name_short, sort_order, system")
      .order("sort_order"),
    supabase
      .from("learning_areas")
      .select("id, name_th")
      .order("sort_order"),
  ]);

  const subject = subjectResult.data;
  if (subjectResult.error || !subject) notFound();

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

  // Build URL back to plan context (or just to grade) for cancel + post-save redirect
  const fromGrade = gradeParam ?? subject.grade_level_id;
  const backHref = planParam
    ? `/setup/subjects?grade=${fromGrade}&plan=${planParam}`
    : `/setup/subjects?grade=${fromGrade}`;

  return (
    <>
      <div className="mb-4">
        <BackLink href={backHref} />
      </div>
      <PageHeader
        icon={BookOpen}
        iconBg="bg-amber-100 text-amber-700"
        title={`แก้ไขวิชา: ${subject.code} ${subject.name_th}`}
      />

      <Card className="max-w-3xl">
        <SubjectForm
          action={updateSubject}
          gradeLevels={gradeLevels}
          learningAreas={learningAreas}
          submitLabel="บันทึกการแก้ไข"
          lockGradeLevel
          planId={planParam}
          cancelHref={backHref}
          defaultValues={{
            id: subject.id,
            code: subject.code,
            name_th: subject.name_th,
            learning_area_id: subject.learning_area_id,
            grade_level_id: subject.grade_level_id,
            category: subject.category,
            credit_hours: subject.credit_hours,
            hours_per_year: subject.hours_per_year,
          }}
        />
      </Card>
    </>
  );
}
