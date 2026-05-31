import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/teacher-scope";
import { FilterNavProvider } from "../_components/filter-nav-context";
import { ClassroomSelector } from "./classroom-selector";
import { NavigationGate } from "./navigation-gate";
import { TeachingSkeleton } from "./teaching-skeleton";
import { TeachingForm, type SubjectRow, type TeacherOption } from "./teaching-form";

const CATEGORY_ORDER: Record<string, number> = {
  core: 1,
  additional: 2,
  activity: 3,
};

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

type Props = {
  searchParams: Promise<{
    grade?: string;
    room?: string;
    saved?: string;
  }>;
};

export default async function TeachingPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const justSaved = params.saved === "1";
  const supabase = await createClient();

  // 1. Current academic year (+ semester, needed below to scope subjects)
  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("id, year_be, current_semester")
    .eq("is_current", true)
    .maybeSingle();

  if (!currentYear) {
    return (
      <>
        <PageHeader
          icon={ClipboardCheck}
          iconBg="bg-teal-100 text-teal-700"
          title="จัดครูเข้าสอน"
          description="มอบหมายครูสอนแต่ละวิชาในแต่ละห้อง × ภาคเรียน"
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

  // 2. All classrooms in current year (group by grade)
  const { data: classrooms } = await supabase
    .from("classrooms")
    .select(
      `
      id,
      room_number,
      grade_level_id,
      study_plan_id,
      grade_level:grade_levels!grade_level_id (
        id,
        name_short,
        name_th,
        sort_order,
        system
      )
    `,
    )
    .eq("academic_year_id", currentYear.id);

  // Build unique grade options (sorted by sort_order)
  type Grade = {
    id: string;
    name_short: string;
    sort_order: number;
    system: "primary" | "secondary";
  };
  const gradeMap = new Map<string, Grade>();
  for (const c of classrooms ?? []) {
    if (c.grade_level && !gradeMap.has(c.grade_level.id)) {
      gradeMap.set(c.grade_level.id, {
        id: c.grade_level.id,
        name_short: c.grade_level.name_short,
        sort_order: c.grade_level.sort_order,
        system: c.grade_level.system,
      });
    }
  }
  const sortedGrades = Array.from(gradeMap.values()).sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  if (sortedGrades.length === 0) {
    return (
      <>
        <PageHeader
          icon={ClipboardCheck}
          iconBg="bg-teal-100 text-teal-700"
          title="จัดครูเข้าสอน"
          description={`ปีปัจจุบัน ${currentYear.year_be}`}
        />
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            ยังไม่มีห้องเรียนในปีนี้ — สร้างห้องก่อนเพื่อมอบหมายครู
          </p>
          <Link
            href="/setup/classrooms"
            className="mt-3 inline-block text-sm font-medium text-zinc-900 underline"
          >
            ไปตั้งค่าชั้นเรียน
          </Link>
        </Card>
      </>
    );
  }

  // 3. Resolve selected grade (param or first)
  const selectedGrade =
    sortedGrades.find((g) => g.id === params.grade) ?? sortedGrades[0];

  // 4. Rooms in selected grade (sorted by room_number)
  const roomsInGrade = (classrooms ?? [])
    .filter((c) => c.grade_level_id === selectedGrade.id)
    .sort((a, b) => a.room_number - b.room_number);

  // 5. Resolve selected room (param or first)
  const selectedClassroom =
    roomsInGrade.find((r) => r.id === params.room) ?? roomsInGrade[0];

  // Subjects are now scoped per (academic_year_id, semester):
  //   primary   → semester=0 (year-wide; one set used for both terms)
  //   secondary → academic_year.current_semester (1 or 2 — sem 1 and sem 2
  //               are different subjects on the มัธยม side, so teaching page
  //               only shows the current term's subjects)
  const currentSemester: 1 | 2 =
    currentYear.current_semester === 2 ? 2 : 1;
  const effectiveSemester: 0 | 1 | 2 =
    selectedGrade.system === "secondary" ? currentSemester : 0;

  // 5b. Which semester's offerings to read for the "current teacher" display.
  //   primary   → offerings exist at BOTH sem 1 and sem 2 with the same
  //               teacher (save-side mirrors) → reading either works,
  //               we pick currentSemester for consistency.
  //   secondary → offering exists only at the subject's semester (=
  //               currentSemester) → MUST read that, otherwise the page
  //               shows "—ยังไม่กำหนด—" for every row even when teachers
  //               are actually assigned in DB.
  const readSemester: 1 | 2 = currentSemester;

  // 5c. Fetch plans for this grade (plan dropdown options)
  const { data: plansData } = await supabase
    .from("study_plans")
    .select("id, name, is_default")
    .eq("grade_level_id", selectedGrade.id);

  const planOptions = (plansData ?? [])
    .slice()
    .sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      return a.name.localeCompare(b.name, "th");
    })
    .map((p) => ({ id: p.id, label: p.name }));

  // Build labels
  const roomLabel = (n: number) =>
    roomsInGrade.length > 1
      ? `${selectedGrade.name_short}/${n}`
      : selectedGrade.name_short;

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        iconBg="bg-teal-100 text-teal-700"
        title="จัดครูเข้าสอน"
        description={
          <>
            มอบหมายครูสอนแต่ละวิชาในแต่ละห้อง · ปีปัจจุบัน{" "}
            <strong className="font-mono">{currentYear.year_be}</strong>
          </>
        }
      />

      {/* FilterNavProvider wraps BOTH the selector (calls startNav) and the
          gate (reads pending) so a ชั้น/ห้อง change paints the skeleton
          instantly. */}
      <FilterNavProvider>
      <div className="mb-6">
        <ClassroomSelector
          grades={sortedGrades.map((g) => ({
            id: g.id,
            label: g.name_short,
          }))}
          selectedGradeId={selectedGrade.id}
          rooms={roomsInGrade.map((r) => ({
            id: r.id,
            // Always use explicit "ป.X/Y" in the dropdown so each room is
            // unambiguous — even when a grade has only 1 room.
            label: `${selectedGrade.name_short}/${r.room_number}`,
          }))}
          selectedRoomId={selectedClassroom.id}
          plans={planOptions}
          selectedPlanId={selectedClassroom.study_plan_id ?? ""}
        />
      </div>

      {justSaved && (
        <div
          role="status"
          className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-900"
        >
          ✓ บันทึกการมอบหมายแล้ว
        </div>
      )}

      {/* 6. If room has no plan assigned, show notice */}
      {!selectedClassroom.study_plan_id ? (
        <Card variant="warning" padding="sm" className="text-sm text-amber-900">
          ⚠️ ห้องนี้ยังไม่ได้กำหนดแผนการเรียน ·{" "}
          <Link
            href={`/setup/subjects?grade=${selectedGrade.id}`}
            className="font-medium underline"
          >
            ไปกำหนดแผนการเรียน
          </Link>
        </Card>
      ) : (
        // Two-layer loading UX so admin sees the skeleton at 0ms:
        //   1. <NavigationGate> — flips to <TeachingSkeleton> the instant
        //      the selector calls startNav() (before any RSC request).
        //   2. <Suspense key={classroomId}> — when the new classroom's RSC
        //      streams in, React mounts a fresh tree (key change) and
        //      shows the same skeleton until TeachingTableSection resolves.
        // Both render the same skeleton → no visual jump between phases.
        <NavigationGate>
          <Suspense
            key={`teaching-${selectedClassroom.id}`}
            fallback={<TeachingSkeleton />}
          >
            <TeachingTableSection
              classroomId={selectedClassroom.id}
              planId={selectedClassroom.study_plan_id}
              readSemester={readSemester}
              gradeId={selectedGrade.id}
              roomId={selectedClassroom.id}
              roomLabel={roomLabel(selectedClassroom.room_number)}
              currentYearId={currentYear.id}
              effectiveSemester={effectiveSemester}
            />
          </Suspense>
        </NavigationGate>
      )}
      </FilterNavProvider>
    </>
  );
}

/**
 * Fetches subjects in the classroom's plan + existing offerings + active
 * teachers list, then renders the TeachingForm (client component with
 * dropdowns + save button).
 */
async function TeachingTableSection({
  classroomId,
  planId,
  readSemester,
  gradeId,
  roomId,
  roomLabel,
  currentYearId,
  effectiveSemester,
}: {
  classroomId: string;
  planId: string;
  /** Which semester's offerings to read for display. Saves write to both. */
  readSemester: 1 | 2;
  gradeId: string;
  roomId: string;
  roomLabel: string;
  /** Current academic year id — subjects join is filtered to this scope. */
  currentYearId: string;
  /** Subject semester scope:
   *    primary   → 0 (year-wide)
   *    secondary → academic_year.current_semester
   *  Anything else from study_plan_subjects (e.g. last year's leftovers
   *  still linked to the plan) is filtered out. */
  effectiveSemester: 0 | 1 | 2;
}) {
  const supabase = await createClient();

  const [planResult, offeringsResult, teachersResult, areasResult] =
    await Promise.all([
    supabase
      .from("study_plan_subjects")
      .select(
        `
        subject:subjects!subject_id (
          id,
          code,
          name_th,
          category,
          academic_year_id,
          semester,
          learning_area:learning_areas!learning_area_id (
            id,
            name_th,
            sort_order
          )
        )
      `,
      )
      .eq("study_plan_id", planId),
    supabase
      .from("subject_offerings")
      .select("subject_id, teacher_id")
      .eq("classroom_id", classroomId)
      .eq("semester", readSemester),
    supabase
      .from("teachers")
      .select(
        `
        id,
        position,
        department,
        user:users!user_id (
          full_name,
          title,
          is_active
        )
      `,
      ),
    supabase.from("learning_areas").select("name_th, sort_order"),
  ]);

  // Sort subjects: category → learning_area → code
  // Filter to current (year, semester) — study_plan_subjects accumulates
  // links across years, so we drop anything outside the current scope.
  const subjectRows: SubjectRow[] = (planResult.data ?? [])
    .map((sps) => sps.subject)
    .filter((s): s is NonNullable<typeof s> => !!s)
    .filter(
      (s) =>
        s.academic_year_id === currentYearId && s.semester === effectiveSemester,
    )
    .sort((a, b) => {
      const ac = CATEGORY_ORDER[a.category] ?? 99;
      const bc = CATEGORY_ORDER[b.category] ?? 99;
      if (ac !== bc) return ac - bc;
      const al = a.learning_area?.sort_order ?? 999;
      const bl = b.learning_area?.sort_order ?? 999;
      if (al !== bl) return al - bl;
      return a.code.localeCompare(b.code, "th");
    })
    .map((s) => ({
      id: s.id,
      code: s.code,
      name_th: s.name_th,
      category: s.category,
      assignedTeacherId: null, // filled below
    }));

  // Merge current teacher assignments
  const assignmentMap = new Map(
    (offeringsResult.data ?? []).map((o) => [o.subject_id, o.teacher_id]),
  );
  for (const row of subjectRows) {
    row.assignedTeacherId = assignmentMap.get(row.id) ?? null;
  }

  // Active teachers — sort matches /setup/teachers list page:
  //   1. ผอ. → 2. รองผอ. → 3. ครู (by learning_areas.sort_order, then name)
  // User spec 2026-05-22: dropdown order ต้องเหมือนหน้าจัดการครู.
  const deptOrder = new Map<string, number>();
  for (const a of areasResult.data ?? []) {
    deptOrder.set(a.name_th, a.sort_order);
  }
  const positionRank = (pos: string | null): number => {
    if (pos === "ผู้อำนวยการ") return 0;
    if (pos === "รองผู้อำนวยการ") return 1;
    return 2;
  };
  const teacherOptions: TeacherOption[] = (teachersResult.data ?? [])
    .filter((t) => t.user?.is_active)
    .sort((a, b) => {
      const rankA = positionRank(a.position);
      const rankB = positionRank(b.position);
      if (rankA !== rankB) return rankA - rankB;
      if (rankA === 2) {
        const dA = deptOrder.get(a.department ?? "") ?? 999;
        const dB = deptOrder.get(b.department ?? "") ?? 999;
        if (dA !== dB) return dA - dB;
      }
      return (a.user?.full_name ?? "").localeCompare(
        b.user?.full_name ?? "",
        "th",
      );
    })
    .map((t) => ({
      id: t.id,
      // Display ชื่อ-สกุล only — title prefix (นาย/นาง/นางสาว) เป็น
      // visual clutter ใน dropdown · admin จำได้จากชื่อ-สกุลอยู่แล้ว
      // User spec 2026-05-22.
      label: t.user?.full_name ?? "",
    }));

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-zinc-900">
          ห้อง <span className="text-teal-700">{roomLabel}</span>{" "}
          <span className="ml-2 text-xs font-normal text-zinc-500">
            ({subjectRows.length} วิชา ·{" "}
            {subjectRows.filter((s) => s.assignedTeacherId).length}{" "}
            กำหนดครูแล้ว · ใช้ครูเดียวกันทั้ง ภาค 1 และ ภาค 2)
          </span>
        </h3>
      </div>

      {subjectRows.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500">
          แผนของห้องนี้ยังไม่มีวิชา —{" "}
          <Link
            href="/setup/subjects"
            className="font-medium text-zinc-900 underline"
          >
            ไปเพิ่มวิชาในแผน
          </Link>
        </div>
      ) : teacherOptions.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500">
          ยังไม่มีครูในระบบ —{" "}
          <Link
            href="/setup/teachers/new"
            className="font-medium text-zinc-900 underline"
          >
            ไปเพิ่มครู
          </Link>
        </div>
      ) : (
        <TeachingForm
          classroomId={classroomId}
          gradeId={gradeId}
          roomId={roomId}
          subjects={subjectRows}
          teachers={teacherOptions}
        />
      )}
    </Card>
  );
}
