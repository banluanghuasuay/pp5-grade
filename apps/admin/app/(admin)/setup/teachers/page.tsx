import { createClient } from "@pp5/database/server";
import { Badge, Card, PageHeader } from "@pp5/ui";
import { Pencil, Users } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/teacher-scope";
import { FilterNavGate } from "../_components/filter-nav-gate";
import { FilterNavProvider } from "../_components/filter-nav-context";
import { DeleteTeacherForm } from "./delete-teacher-form";
import { TeachersFilters } from "./teachers-filters";
import { TeachersSkeleton } from "./teachers-skeleton";

export const metadata = {
  title: "จัดการครู · ระบบ ปพ.5",
};

// Next.js 16: searchParams is async
type Props = {
  searchParams: Promise<{
    error?: string;
    position?: string;
    department?: string;
    status?: string;
  }>;
};

// Position rank: 0 = ผอ., 1 = รองผอ., 2 = others (ครูผู้สอน + legacy).
// Shared by the sort AND the position filter ("ครูผู้สอน" = rank 2, which
// also catches legacy free-text positions like "ครู คศ.2").
const positionRank = (pos: string | null): number => {
  if (pos === "ผู้อำนวยการ") return 0;
  if (pos === "รองผู้อำนวยการ") return 1;
  return 2;
};

export default async function TeachersPage({ searchParams }: Props) {
  await requireAdmin();
  const {
    error: queryError,
    position: positionFilter,
    department: departmentFilter,
    status: statusFilter,
  } = await searchParams;
  // Status defaults to "active" (ใช้งาน) per user spec 2026-05-31.
  const status = statusFilter ?? "active";
  const supabase = await createClient();

  // Fetch teachers + learning_areas in parallel — learning_areas drives
  // both the ครูผู้สอน sort order (by กลุ่มสาระ) AND the กลุ่มสาระ filter
  // dropdown options.
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
      .select("name_th, sort_order")
      .order("sort_order"),
  ]);

  const teachers = teachersResult.data;
  const error = teachersResult.error;

  // กลุ่มสาระ list (in สพฐ. order) for the filter dropdown.
  const departments = (areasResult.data ?? []).map((a) => a.name_th);

  // Build the department → sort_order map (orders ครูผู้สอน rows).
  const deptOrder = new Map<string, number>();
  for (const a of areasResult.data ?? []) {
    deptOrder.set(a.name_th, a.sort_order);
  }

  const sorted = (teachers ?? [])
    .filter((t): t is typeof t & { user: NonNullable<typeof t.user> } => !!t.user)
    .sort((a, b) => {
      // 1. By position rank (ผอ. → รองผอ. → ครู)
      const rankA = positionRank(a.position);
      const rankB = positionRank(b.position);
      if (rankA !== rankB) return rankA - rankB;
      // 2. Within "ครู" tier, by department sort_order.
      if (rankA === 2) {
        const dA = deptOrder.get(a.department ?? "") ?? 999;
        const dB = deptOrder.get(b.department ?? "") ?? 999;
        if (dA !== dB) return dA - dB;
      }
      // 3. Within the same group, by Thai-locale full_name.
      return (a.user.full_name ?? "").localeCompare(b.user.full_name ?? "", "th");
    });

  // Apply filters (ตำแหน่ง / กลุ่มสาระ / สถานะ).
  const filtered = sorted.filter((t) => {
    if (positionFilter) {
      const rank = positionRank(t.position);
      if (positionFilter === "ผู้อำนวยการ" && rank !== 0) return false;
      if (positionFilter === "รองผู้อำนวยการ" && rank !== 1) return false;
      if (positionFilter === "ครูผู้สอน" && rank !== 2) return false;
    }
    if (departmentFilter && t.department !== departmentFilter) return false;
    if (status === "active" && !t.user.is_active) return false;
    if (status === "inactive" && t.user.is_active) return false;
    // status === "all" → no status filter
    return true;
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
        description="เพิ่ม/แก้ไขบัญชีครู · ปิดใช้งานได้ในหน้าแก้ไข · แต่ละครูมี username สำหรับ login"
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

      {!error && (
        <FilterNavProvider>
          <div className="mb-4">
            <TeachersFilters
              departments={departments}
              position={positionFilter ?? ""}
              department={departmentFilter ?? ""}
              status={status}
            />
          </div>

          <FilterNavGate fallback={<TeachersSkeleton />}>
            {filtered.length === 0 ? (
              <Card variant="dashed" padding={false} className="p-12 text-center">
                <p className="text-sm text-zinc-500">
                  {sorted.length === 0
                    ? "ยังไม่มีครูในระบบ"
                    : "ไม่พบครูตามตัวกรองที่เลือก"}
                </p>
                {sorted.length === 0 && (
                  <Link
                    href="/setup/teachers/new"
                    className="mt-3 inline-block text-sm font-medium text-zinc-900 underline"
                  >
                    เพิ่มครูคนแรก
                  </Link>
                )}
              </Card>
            ) : (
              <div className="rounded-md border border-zinc-200 bg-white">
                {/* table-fixed so the table fits a phone screen without
                    horizontal scroll. Mobile shows ชื่อ(+ตำแหน่ง) / กลุ่มสาระ /
                    จัดการ; md+ adds ชื่อผู้ใช้ + ตำแหน่ง + สถานะ columns.
                    User spec 2026-05-31. */}
                <table className="w-full table-fixed text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-3 font-medium sm:px-4">
                        ชื่อ-นามสกุล
                      </th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">
                        ชื่อผู้ใช้
                      </th>
                      <th className="hidden px-4 py-3 font-medium md:table-cell">
                        ตำแหน่ง
                      </th>
                      <th className="w-28 px-2 py-3 font-medium sm:w-36 sm:px-4">
                        กลุ่มสาระ
                      </th>
                      <th className="hidden w-24 px-4 py-3 font-medium md:table-cell">
                        สถานะ
                      </th>
                      <th className="w-24 px-2 py-3 text-right font-medium sm:w-28 sm:px-4">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {filtered.map((t) => (
                      <tr
                        key={t.id}
                        className={
                          t.user.is_active
                            ? "hover:bg-zinc-50"
                            : "bg-zinc-50/50 text-zinc-500 hover:bg-zinc-100/50"
                        }
                      >
                        <td className="px-3 py-3 sm:px-4">
                          <div className="truncate font-medium text-zinc-900">
                            {t.user.title}
                            {t.user.full_name}
                          </div>
                          {/* Mobile-only: ตำแหน่ง + (ถ้าปิด) สถานะ under the
                              name, since those columns are hidden on phones. */}
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 md:hidden">
                            {t.position && (
                              <span className="text-xs text-zinc-500">
                                {t.position}
                              </span>
                            )}
                            {!t.user.is_active && (
                              <Badge variant="neutral">ปิดใช้งาน</Badge>
                            )}
                          </div>
                          {t.is_department_head && (
                            <div className="mt-0.5">
                              <Badge variant="info">หัวหน้ากลุ่มสาระ</Badge>
                            </div>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-xs text-zinc-700 md:table-cell">
                          {t.user.username}
                        </td>
                        <td className="hidden px-4 py-3 text-zinc-700 md:table-cell">
                          {t.position ?? (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-zinc-700 sm:px-4">
                          <span className="block truncate">
                            {t.department ?? (
                              <span className="text-zinc-400">—</span>
                            )}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {t.user.is_active ? (
                            <Badge variant="success" withDot>
                              ใช้งาน
                            </Badge>
                          ) : (
                            <Badge variant="neutral">ปิดใช้งาน</Badge>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right sm:px-4">
                          <div className="flex items-center justify-end gap-1">
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
          </FilterNavGate>
        </FilterNavProvider>
      )}
    </>
  );
}
