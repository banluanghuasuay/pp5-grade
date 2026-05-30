import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { CalendarX } from "lucide-react";
import { notFound } from "next/navigation";
import { BackLink } from "../../../_components/back-link";
import { updateHoliday } from "../actions";
import { HolidayForm } from "../holiday-form";

export const metadata = {
  title: "แก้ไขวันหยุด · ระบบ ปพ.5",
};

type Props = { params: Promise<{ id: string }> };

export default async function EditHolidayPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: holiday } = await supabase
    .from("holidays")
    .select("id, date, name")
    .eq("id", id)
    .maybeSingle();

  if (!holiday) notFound();

  return (
    <>
      <div className="mb-4">
        <BackLink href="/setup/holidays" />
      </div>
      <PageHeader
        icon={CalendarX}
        iconBg="bg-purple-100 text-purple-700"
        title={`แก้ไขวันหยุด: ${holiday.name}`}
      />

      <Card className="max-w-3xl">
        <HolidayForm
          action={updateHoliday}
          variant="block"
          cancelHref="/setup/holidays"
          submitLabel="บันทึกการแก้ไข"
          defaultValues={{
            id: holiday.id,
            date: holiday.date,
            name: holiday.name,
          }}
        />
      </Card>
    </>
  );
}
