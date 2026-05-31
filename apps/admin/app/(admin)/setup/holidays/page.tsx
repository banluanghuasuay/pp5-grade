import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { CalendarX, Pencil } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/teacher-scope";
import { createHoliday } from "./actions";
import { DeleteHolidayForm } from "./delete-holiday-form";
import { HolidayForm } from "./holiday-form";
import { SeedThaiHolidaysButton } from "./seed-button";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

const THAI_MONTH_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/** Format YYYY-MM-DD → "22 พ.ค. 2569" (Thai short month + BE year). */
function formatThaiDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((s) => Number.parseInt(s, 10));
  if (!y || !m || !d) return iso;
  const monthLabel = THAI_MONTH_SHORT[m - 1] ?? "";
  const yearBe = y + 543;
  return `${d} ${monthLabel} ${yearBe}`;
}

export default async function HolidaysPage() {
  await requireAdmin();
  const supabase = await createClient();

  // 1. Resolve current academic year
  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("id, year_be, start_date, end_date")
    .eq("is_current", true)
    .maybeSingle();

  if (!currentYear) {
    return (
      <>
        <PageHeader
          icon={CalendarX}
          iconBg="bg-purple-100 text-purple-700"
          title="ตั้งค่าวันหยุด"
          description="วันหยุดราชการไทย + วันหยุดพิเศษของโรงเรียน"
        />
        <Card variant="warning" padding="sm" className="text-sm text-amber-900">
          ⚠️ ยังไม่มีปีการศึกษาปัจจุบัน ·{" "}
          <Link
            href="/setup/academic-years"
            className="font-medium underline"
          >
            ไปตั้งค่าปีการศึกษา
          </Link>
        </Card>
      </>
    );
  }

  // 2. Fetch holidays for this academic year, sorted by date
  const { data: holidays } = await supabase
    .from("holidays")
    .select("id, date, name, type")
    .eq("academic_year_id", currentYear.id)
    .order("date");

  const rows = holidays ?? [];

  return (
    <>
      <PageHeader
        icon={CalendarX}
        iconBg="bg-purple-100 text-purple-700"
        title="ตั้งค่าวันหยุด"
        description={
          <>
            วันหยุดในปีการศึกษา{" "}
            <strong className="font-mono">{currentYear.year_be}</strong> ·
            ใช้ในหน้าบันทึกเวลาเรียน (วันหยุดจะ disable)
          </>
        }
      />

      {/* Top: Seed button + count label */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SeedThaiHolidaysButton yearBe={currentYear.year_be} />
        <span className="text-sm text-zinc-600">
          วันหยุดราชการไทย{" "}
          <strong>
            {rows.filter((r) => r.type === "government").length}
          </strong>{" "}
          รายการ
        </span>
      </div>

      {/* Inline add form */}
      <Card padding="sm" className="mb-4">
        <HolidayForm
          action={createHoliday}
          variant="inline"
          submitLabel="เพิ่ม"
        />
      </Card>

      {/* List table */}
      {rows.length === 0 ? (
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            ยังไม่มีวันหยุดในปีนี้ — กด "ดึงวันหยุดมาตรฐาน" เพื่อเริ่มต้น
          </p>
        </Card>
      ) : (
        <Card padding={false} className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="w-44 px-4 py-3 font-medium">วันที่</th>
                <th className="px-4 py-3 font-medium">ชื่อวันหยุด</th>
                <th className="w-24 px-4 py-3 text-right font-medium">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {rows.map((h) => (
                <tr key={h.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-900">
                    {formatThaiDate(h.date)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{h.name}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/setup/holidays/${h.id}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-primary-600"
                        title="แก้ไข"
                        aria-label={`แก้ไข ${h.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <DeleteHolidayForm id={h.id} name={h.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
