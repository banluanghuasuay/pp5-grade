import { Card, PageHeader } from "@pp5/ui";
import { CalendarDays } from "lucide-react";
import { BackLink } from "../../../_components/back-link";
import { createAcademicYear } from "../actions";
import { YearForm } from "../year-form";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

export default function NewAcademicYearPage() {
  return (
    <>
      <div className="mb-4">
        <BackLink href="/setup/academic-years" />
      </div>
      <PageHeader
        icon={CalendarDays}
        iconBg="bg-purple-100 text-purple-700"
        title="เพิ่มปีการศึกษา"
      />

      <Card className="max-w-xl">
        <YearForm action={createAcademicYear} submitLabel="บันทึก" />
      </Card>
    </>
  );
}
