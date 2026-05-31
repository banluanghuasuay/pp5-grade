import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { CalendarDays } from "lucide-react";
import { notFound } from "next/navigation";
import { BackLink } from "../../../_components/back-link";
import { updateAcademicYear } from "../actions";
import { YearForm } from "../year-form";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

// Next.js 16: params is async
type Props = { params: Promise<{ id: string }> };

export default async function EditAcademicYearPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: year, error } = await supabase
    .from("academic_years")
    .select("id, year_be, is_current, current_semester, start_date, end_date")
    .eq("id", id)
    .maybeSingle();

  if (error || !year) notFound();

  return (
    <>
      <div className="mb-4">
        <BackLink href="/setup/academic-years" />
      </div>
      <PageHeader
        icon={CalendarDays}
        iconBg="bg-purple-100 text-purple-700"
        title={`แก้ไขปีการศึกษา ${year.year_be}`}
      />

      <Card className="max-w-xl">
        <YearForm
          action={updateAcademicYear}
          defaultValues={{
            id: year.id,
            year_be: year.year_be,
            is_current: year.is_current,
            current_semester: year.current_semester,
            start_date: year.start_date,
            end_date: year.end_date,
          }}
          submitLabel="บันทึกการแก้ไข"
        />
      </Card>
    </>
  );
}
