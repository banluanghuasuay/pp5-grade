import { createClient } from "@pp5/database/server";
import { Badge, Card, PageHeader } from "@pp5/ui";
import { Pencil, Users } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/teacher-scope";
import { DeleteTeacherForm } from "./delete-teacher-form";
import { ToggleActiveForm } from "./toggle-active-form";

export const metadata = {
  title: "จัดการครู · ระบบ ปพ.5",
};

// Next.js 16: searchParams is async
type Props = { searchParams: Promise<{ error?: string }> };

export default async function TeachersPage({ searchParams }: Props) {
  await requireAdmin();
  const { error: queryError } = await searchParams;
  const supabase = await createClient();

  // Fetch teachers + learning_areas in parallel — the latter is just
  // needed to build a sort_order map so the "ครูผู้สอน" rows below the
  // executives are grouped by กลุ่มสาระ following สพฐ. order.
  const [teachersResult, areasResult] = await Promise.all([
    supabase
      .from("teachers")
      .select(
        `
        id,
        position,
        department,
        is_department_head,
        user:users!user_id (
          id,
          username,
          full_name,
          title,
          email,
          phone,
          is_active
        )
      `,
      ),
    supabase
      .from("learning_areas")
      .select("name_th, sort_order"),
  ]);

  const teachers = teachersResult.data;
  const error = teachersResult.error;

  // Build the department → sort_order map (used to order ครูผู้สอน
  // rows within the "ครู" group; executives sit above this group).
  const deptOrder = new Map<string, number>();
  for (const a of areasResult.data ?? []) {
    deptOrder.set(a.name_th, a.sort_order);
  }

  // Position rank: 0 = ผอ., 1 = รองผอ., 2 = others (ครูผู้สอน + legacy).
  // User spec 2026-05-22: "แสดง ผอ. ก่อน · ตามด้วย รอง.ผอ · ตามด้วยครู ·
  // ครูให้เรียงตามกลุ่มสาระ".
  const positionRank = (pos: string | null): number => {
    if (pos === "ผู้อำนวยการ") return 0;
    if (pos === "รองผู้อำนวยการ") return 1;
    return 2;
  };

  const sorted = (teachers ?? [])
    .filter((t): t is typeof t & { user: NonNullable<typeof t.user> } => !!t.user)
    .sort((a, b) => {
      // 1. By position rank (ผอ. → รองผอ. → ครู)
      const rankA = positionRank(a.position);
      const rankB = positionRank(b.position);
      if (rankA !== rankB) return rankA - rankB;
      // 2. Within "ครู" tier, by department sort_order. (Executives
      //    don't typically have a department, but if they do we just
      //    fall through to name sort to keep things stable.)
      if (rankA === 2) {
        const dA = deptOrder.get(a.department ?? "") ?? 999;
        const dB = deptOrder.get(b.department ?? "") ?? 999;
        if (dA !== dB) return dA - dB;
      }
      // 3. Within the same group, by Thai-locale full_name.
      return (a.user.full_name ?? "").localeCompare(b.user.full_name ?? "", "th");
    });

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
        icon={Users}
        iconBg="bg-emerald-100 text-emerald-700"
        title="จัดการครู"
        description="เพิ่ม/แก้ไข/ปิดใช้งานบัญชีครู · แต่ละครูมี username สำหรับ login"
        action={
          <Link
            href="/setup/teachers/new"
            className="shrink-0 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1"
          >
            + เพิ่มครู
          </Link>
        }
      />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
          <p className="font-semibold">❌ Error:</p>
          <pre className="mt-2 text-sm">{error.message}</pre>
        </div>
      )}

      {!error && sorted.length === 0 && (
        <Card variant="dashed" padding={false} className="p-12 text-center">
          <p className="text-sm text-zinc-500">ยังไม่มีครูในระบบ</p>
          <Link
            href="/setup/teachers/new"
            className="mt-3 inline-block text-sm font-medium text-zinc-900 underline"
          >
            เพิ่มครูคนแรก
          </Link>
        </Card>
      )}

      {!error && sorted.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3 font-medium">ชื่อผู้ใช้</th>
                <th className="px-4 py-3 font-medium">ตำแหน่ง</th>
                <th className="px-4 py-3 font-medium">กลุ่มสาระ</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 text-right font-medium">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {sorted.map((t) => (
                <tr
                  key={t.id}
                  className={
                    t.user.is_active
                      ? "hover:bg-zinc-50"
                      : "bg-zinc-50/50 text-zinc-500 hover:bg-zinc-100/50"
                  }
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">
                      {t.user.title}
                      {t.user.full_name}
                    </div>
                    {t.is_department_head && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        <Badge variant="info">หัวหน้ากลุ่มสาระ</Badge>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                    {t.user.username}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {t.position ?? <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {t.department ?? <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {t.user.is_active ? (
                      <Badge variant="success" withDot>
                        ใช้งาน
                      </Badge>
                    ) : (
                      <Badge variant="neutral">ปิดใช้งาน</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <ToggleActiveForm
                        teacherId={t.id}
                        currentlyActive={t.user.is_active ?? true}
                        teacherName={`${t.user.title ?? ""}${t.user.full_name}`}
                      />
                      <Link
                        href={`/setup/teachers/${t.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1"
                        title="แก้ไข"
                        aria-label={`แก้ไข ${t.user.title ?? ""}${t.user.full_name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <DeleteTeacherForm
                        teacherId={t.id}
                        teacherName={`${t.user.title ?? ""}${t.user.full_name}`}
                      />
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
