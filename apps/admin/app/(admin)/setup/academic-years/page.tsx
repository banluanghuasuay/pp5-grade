import { createClient } from "@pp5/database/server";
import { Badge, Card, PageHeader } from "@pp5/ui";
import { CalendarDays, Pencil } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/teacher-scope";
import { setCurrentAcademicYear, setCurrentSemester } from "./actions";
import { ChangeSemesterButton } from "./change-semester-button";
import { DeleteForm } from "./delete-form";
import { SetCurrentButton } from "./set-current-button";

export const metadata = {
  title: "ตั้งค่าปีการศึกษา · ระบบ ปพ.5",
};

/** Format YYYY-MM-DD → DD/MM/YYYY (Buddhist year display = same calendar year here). */
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Next.js 16: searchParams is async
type Props = { searchParams: Promise<{ error?: string }> };

export default async function AcademicYearsPage({ searchParams }: Props) {
  await requireAdmin();
  const { error: queryError } = await searchParams;

  const supabase = await createClient();
  const { data: years, error } = await supabase
    .from("academic_years")
    .select("id, year_be, is_current, current_semester, start_date, end_date")
    .order("year_be", { ascending: false });

  return (
    <>
      {queryError && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          ❌ {queryError}
        </div>
      )}

      <PageHeader
        icon={CalendarDays}
        iconBg="bg-purple-100 text-purple-700"
        title="ตั้งค่าปีการศึกษา"
        description="จัดการปีการศึกษาของโรงเรียน · กำหนดปีปัจจุบัน · ตั้งวันเปิด/ปิดเทอม"
        action={
          <Link
            href="/setup/academic-years/new"
            className="shrink-0 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1"
          >
            + เพิ่มปีการศึกษา
          </Link>
        }
      />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
          <p className="font-semibold">❌ Error:</p>
          <pre className="mt-2 text-sm">{error.message}</pre>
        </div>
      )}

      {!error && years && years.length === 0 && (
        <Card variant="dashed" padding={false} className="p-12 text-center">
          <p className="text-sm text-zinc-500">ยังไม่มีปีการศึกษาในระบบ</p>
          <Link
            href="/setup/academic-years/new"
            className="mt-3 inline-block text-sm font-medium text-zinc-900 underline"
          >
            เพิ่มปีการศึกษาแรก
          </Link>
        </Card>
      )}

      {!error && years && years.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">ปีการศึกษา (พ.ศ.)</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">ภาคเรียนปัจจุบัน</th>
                <th className="px-4 py-3 font-medium">วันเริ่มภาคเรียนที่ 1</th>
                <th className="px-4 py-3 font-medium">วันเริ่มภาคเรียนที่ 2</th>
                <th className="px-4 py-3 text-right font-medium">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {years.map((y) => (
                <tr key={y.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-zinc-900">
                    {y.year_be}
                  </td>
                  <td className="px-4 py-3">
                    {y.is_current ? (
                      <Badge variant="success" withDot>
                        ปีปัจจุบัน
                      </Badge>
                    ) : (
                      <form action={setCurrentAcademicYear}>
                        <input type="hidden" name="id" value={y.id} />
                        {/*
                          Hidden field populated by the SetCurrentButton's
                          dialog before form.requestSubmit(). Default value
                          is "1" so the form is valid even if JS is disabled.
                        */}
                        <input
                          type="hidden"
                          name="current_semester"
                          value="1"
                        />
                        <SetCurrentButton yearBe={y.year_be} />
                      </form>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {/* Only the current year's semester is meaningful; for
                        other years we hide it because admin will pick a fresh
                        semester at the moment they switch current. */}
                    {y.is_current ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="info">
                          ภาคเรียนที่ {y.current_semester}
                        </Badge>
                        <form action={setCurrentSemester}>
                          <input type="hidden" name="id" value={y.id} />
                          <input
                            type="hidden"
                            name="current_semester"
                            value={y.current_semester ?? 1}
                          />
                          <ChangeSemesterButton
                            yearBe={y.year_be}
                            current={y.current_semester === 2 ? 2 : 1}
                          />
                        </form>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {formatDate(y.start_date)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {formatDate(y.end_date)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/setup/academic-years/${y.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1"
                        title="แก้ไข"
                        aria-label={`แก้ไข ${y.year_be}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <DeleteForm id={y.id} yearBe={y.year_be} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
