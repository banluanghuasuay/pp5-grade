import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { History } from "lucide-react";
import Link from "next/link";
import { ImportPreviousWizard } from "./wizard";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

type Props = {
  searchParams: Promise<{ mode?: string }>;
};

export default async function ImportPreviousPage({ searchParams }: Props) {
  const { mode: modeParam } = await searchParams;
  const mode: "year" | "semester" =
    modeParam === "semester" ? "semester" : "year";
  const supabase = await createClient();

  // Resolve current + previous academic years (sources differ by mode).
  const { data: years } = await supabase
    .from("academic_years")
    .select("id, year_be, is_current, current_semester");

  const currentYear = (years ?? []).find((y) => y.is_current === true);
  const previousYear = currentYear
    ? (years ?? []).find((y) => y.year_be === currentYear.year_be - 1)
    : undefined;
  const currentSemester: 1 | 2 =
    currentYear?.current_semester === 2 ? 2 : 1;

  // Resolve source + target as (yearId, year_be, semester) tuples per mode:
  //
  // mode=year (ประถม / cross-year):
  //   source = previousYear, semester=0
  //   target = currentYear, semester=0
  //
  // mode=semester (มัธยม):
  //   current_sem == 2 → source = currentYear sem 1, target = currentYear sem 2  (intra-year)
  //   current_sem == 1 → source = previousYear sem 2, target = currentYear sem 1  (cross-year, last sem of prev year)
  let source:
    | { id: string; year_be: number; semester: 0 | 1 | 2 }
    | null = null;
  let target:
    | { id: string; year_be: number; semester: 0 | 1 | 2 }
    | null = null;
  let missingReason: "no_current" | "no_previous" | null = null;

  if (!currentYear) {
    missingReason = "no_current";
  } else if (mode === "year") {
    if (!previousYear) {
      missingReason = "no_previous";
    } else {
      source = {
        id: previousYear.id,
        year_be: previousYear.year_be,
        semester: 0,
      };
      target = {
        id: currentYear.id,
        year_be: currentYear.year_be,
        semester: 0,
      };
    }
  } else {
    // semester mode
    if (currentSemester === 2) {
      // intra-year: sem 1 → sem 2 of same year
      source = {
        id: currentYear.id,
        year_be: currentYear.year_be,
        semester: 1,
      };
      target = {
        id: currentYear.id,
        year_be: currentYear.year_be,
        semester: 2,
      };
    } else if (previousYear) {
      // cross-year: prev year sem 2 → current year sem 1
      source = {
        id: previousYear.id,
        year_be: previousYear.year_be,
        semester: 2,
      };
      target = {
        id: currentYear.id,
        year_be: currentYear.year_be,
        semester: 1,
      };
    } else {
      missingReason = "no_previous";
    }
  }

  const titleText =
    mode === "semester"
      ? "นำเข้าจากเทอมที่แล้ว"
      : "นำเข้าจากปีที่แล้ว";
  const descText =
    mode === "semester"
      ? "สำหรับมัธยม — ดึงนักเรียนจากภาคเรียนก่อนหน้าเข้าภาคเรียนปัจจุบัน · ตัดเกรดรายภาค"
      : "ดึงนักเรียนจากปีที่แล้วเข้าปีปัจจุบัน · ระบบแมปห้องเดิม-ชั้นถัดไปอัตโนมัติ · ม.3 จบการศึกษา (ข้าม)";

  return (
    <>
      <PageHeader
        icon={History}
        iconBg="bg-emerald-100 text-emerald-700"
        title={titleText}
        description={descText}
        action={
          <Link
            href="/setup/students"
            className="shrink-0 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            ← กลับไปหน้านักเรียน
          </Link>
        }
      />

      {missingReason === "no_current" ? (
        <Card variant="warning" padding="md" className="text-sm text-amber-900">
          ⚠️ ยังไม่ได้ตั้ง <strong>ปีการศึกษาปัจจุบัน</strong> ·{" "}
          <Link
            href="/setup/academic-years"
            className="font-medium underline"
          >
            ไปตั้งค่าปีการศึกษา
          </Link>
        </Card>
      ) : missingReason === "no_previous" ? (
        <Card variant="warning" padding="md" className="text-sm text-amber-900">
          ⚠️ ไม่พบ{" "}
          <strong>ปีการศึกษา {(currentYear?.year_be ?? 0) - 1}</strong>{" "}
          (ปีที่แล้ว) ในระบบ — ไม่มีข้อมูลให้นำเข้า ·{" "}
          <Link
            href="/setup/academic-years"
            className="font-medium underline"
          >
            ไปสร้างปีการศึกษา
          </Link>
        </Card>
      ) : (
        source &&
        target && (
          <SourceClassroomsLoader
            source={source}
            target={target}
            mode={mode}
          />
        )
      )}
    </>
  );
}

async function SourceClassroomsLoader({
  source,
  target,
  mode,
}: {
  source: { id: string; year_be: number; semester: 0 | 1 | 2 };
  target: { id: string; year_be: number; semester: 0 | 1 | 2 };
  mode: "year" | "semester";
}) {
  const supabase = await createClient();
  const { data: classrooms } = await supabase
    .from("classrooms")
    .select(
      `
      id, room_number, grade_level_id,
      grade_level:grade_levels!grade_level_id (id, name_short, sort_order, system)
    `,
    )
    .eq("academic_year_id", source.id);

  // Filter grades by system: year mode → primary only, semester mode → secondary only
  const wantSystem: "primary" | "secondary" =
    mode === "semester" ? "secondary" : "primary";

  // Group classrooms by grade for the dropdowns
  type Grade = {
    id: string;
    label: string;
    sort: number;
    rooms: Array<{ id: string; room_number: number }>;
  };
  const map = new Map<string, Grade>();
  for (const c of classrooms ?? []) {
    if (!c.grade_level) continue;
    if (c.grade_level.system !== wantSystem) continue;
    let g = map.get(c.grade_level.id);
    if (!g) {
      g = {
        id: c.grade_level.id,
        label: c.grade_level.name_short,
        sort: c.grade_level.sort_order ?? 999,
        rooms: [],
      };
      map.set(c.grade_level.id, g);
    }
    g.rooms.push({ id: c.id, room_number: c.room_number });
  }
  const grades = Array.from(map.values())
    .sort((a, b) => a.sort - b.sort)
    .map((g) => ({
      id: g.id,
      label: g.label,
      rooms: g.rooms.sort((a, b) => a.room_number - b.room_number),
    }));

  if (grades.length === 0) {
    return (
      <Card variant="warning" padding="md" className="text-sm text-amber-900">
        ⚠️ ปีการศึกษา {source.year_be} ไม่มี
        {wantSystem === "secondary" ? "ชั้นมัธยม" : "ชั้นประถม"} —
        ไม่มีข้อมูลให้นำเข้า
      </Card>
    );
  }

  return (
    <ImportPreviousWizard
      source={source}
      target={target}
      mode={mode}
      grades={grades}
    />
  );
}
