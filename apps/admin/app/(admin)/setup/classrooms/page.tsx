import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { School } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/teacher-scope";
import { RoomCounter } from "./room-counter";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

// Next.js 16: searchParams is async
type Props = { searchParams: Promise<{ error?: string }> };

type Classroom = {
  id: string;
  grade_level_id: string;
  room_number: number;
  status: "open" | "closed";
};

/** Smart naming: 0=ปิดสอน, 1="ป.3", 2+="ป.3/1, ป.3/2" */
function formatClassroomNames(
  shortName: string,
  rooms: Classroom[],
): string {
  if (rooms.length === 0) return "—";
  if (rooms.length === 1) return shortName;
  return rooms
    .map((r) => `${shortName}/${r.room_number}`)
    .join(", ");
}

export default async function ClassroomsPage({ searchParams }: Props) {
  await requireAdmin();
  const { error: queryError } = await searchParams;
  const supabase = await createClient();

  // Resolve current academic year
  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("id, year_be")
    .eq("is_current", true)
    .maybeSingle();

  if (!currentYear) {
    return (
      <>
        <PageHeader
          icon={School}
          iconBg="bg-pink-100 text-pink-700"
          title="ตั้งค่าชั้นเรียน"
        />
        <Card variant="warning" padding="sm" className="text-sm text-amber-900">
          <p className="font-semibold">⚠️ ยังไม่มีปีปัจจุบันในระบบ</p>
          <p className="mt-1">
            กรุณาไปที่{" "}
            <Link
              href="/setup/academic-years"
              className="font-medium underline"
            >
              ตั้งค่าปีการศึกษา
            </Link>{" "}
            เพื่อเลือกปีปัจจุบันก่อน
          </p>
        </Card>
      </>
    );
  }

  // All 12 grade levels (master data — seeded in schema.sql)
  const { data: gradeLevels } = await supabase
    .from("grade_levels")
    .select("id, code, name_short, name_th, system")
    .order("sort_order");

  // Classrooms for this year (small, ~12-50 rows max)
  const { data: classrooms } = await supabase
    .from("classrooms")
    .select("id, grade_level_id, room_number, status")
    .eq("academic_year_id", currentYear.id)
    .order("room_number");

  // Group classrooms by grade_level_id
  const byGrade = new Map<string, Classroom[]>();
  for (const c of (classrooms ?? []) as Classroom[]) {
    const arr = byGrade.get(c.grade_level_id) ?? [];
    arr.push(c);
    byGrade.set(c.grade_level_id, arr);
  }

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
        icon={School}
        iconBg="bg-pink-100 text-pink-700"
        title="ตั้งค่าชั้นเรียน"
        description={
          <>
            กำหนดระดับชั้นที่เปิดสอน + จำนวนห้องต่อระดับ · ปีปัจจุบัน{" "}
            <strong className="font-mono">{currentYear.year_be}</strong>
          </>
        }
      />

      <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">ระดับชั้น</th>
              <th className="px-4 py-3 font-medium">ระบบ</th>
              <th className="px-4 py-3 text-center font-medium">จำนวนห้อง</th>
              <th className="px-4 py-3 font-medium">ชื่อห้อง</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {gradeLevels?.map((gl) => {
              const rooms = byGrade.get(gl.id) ?? [];
              const isOpen = rooms.length > 0;
              // Last room's display label (for the [−] confirm dialog)
              const lastRoom = rooms[rooms.length - 1];
              const removeLabel =
                rooms.length <= 1
                  ? gl.name_short
                  : `${gl.name_short}/${lastRoom?.room_number ?? ""}`;
              return (
                <tr key={gl.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">
                      {gl.name_short}
                    </div>
                    <div className="text-xs text-zinc-500">{gl.name_th}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-zinc-500">
                      {gl.system === "primary" ? "ประถม" : "มัธยม"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RoomCounter
                      gradeLevelId={gl.id}
                      count={rooms.length}
                      removeLabel={removeLabel}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {isOpen ? (
                      <span className="text-zinc-700">
                        {formatClassroomNames(gl.name_short, rooms)}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">
                        (ยังไม่เปิดสอน)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        💡 กด <strong>[+]</strong> เพื่อเพิ่มห้องใหม่ ·{" "}
        <strong>[−]</strong> ลบห้องสุดท้าย (room_number สูงสุด)
      </p>
    </>
  );
}
