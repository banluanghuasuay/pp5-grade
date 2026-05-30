import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { Heart } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentTerm, semesterStateOf } from "@/lib/current-term";
import { getTeacherScope } from "@/lib/teacher-scope";
import { DirectPrintButton } from "../../_components/direct-print-button";
import { abbreviateTitle } from "../score-structure/grading-utils";
import {
  CharacteristicEvalGrid,
  type CharCol,
  type StudentRow,
} from "./eval-grid";
import {
  CharacteristicsSelector,
  type GradeOption,
  type RoomOption,
} from "./selector";
import {
  CharacteristicsSettings,
  type Characteristic,
} from "./settings-tab";

export const metadata = {
  title: "คุณลักษณะอันพึงประสงค์ · ระบบ ปพ.5",
};

type Tab = "settings" | "evaluate";

type Props = {
  searchParams: Promise<{
    grade?: string;
    room?: string;
    tab?: string;
  }>;
};

export default async function CharacteristicsPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab: Tab = params.tab === "evaluate" ? "evaluate" : "settings";

  const supabase = await createClient();
  const term = await getCurrentTerm();

  // 1. Current academic year
  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("id, year_be")
    .eq("is_current", true)
    .maybeSingle();

  if (!currentYear) {
    return (
      <>
        <PageHeader
          icon={Heart}
          iconBg="bg-rose-100 text-rose-700"
          title="ประเมินตามหลักสูตร · คุณลักษณะอันพึงประสงค์"
          description="ตั้งค่าหัวข้อ + บันทึกผลการประเมินคุณลักษณะอันพึงประสงค์"
        />
        <Card variant="warning" padding="sm" className="text-sm text-amber-900">
          ⚠️ ยังไม่มีปีการศึกษาปัจจุบัน ·{" "}
          <Link href="/setup/academic-years" className="font-medium underline">
            ไปตั้งค่าปีการศึกษา
          </Link>
        </Card>
      </>
    );
  }

  // Teacher scope — eval pages are HOMEROOM only per user spec 2026-05-20:
  // "ให้ยึดตามครูประจำชั้น ไม่เกี่ยวว่าครูประจำชั้นคนที่ 1 หรือ 2".
  // homeroomClassroomIds already covers both role slots (helper doesn't
  // filter by role). Subject teachers don't get access — they record
  // scores in their own pages, not student-wide evaluations.
  const scope = await getTeacherScope();

  // 2. Classrooms in current year (for selector)
  const { data: classroomsRaw } = await supabase
    .from("classrooms")
    .select(
      `
      id,
      room_number,
      grade_level_id,
      grade_level:grade_levels!grade_level_id (
        id,
        name_short,
        sort_order
      )
    `,
    )
    .eq("academic_year_id", currentYear.id);

  const classrooms = scope
    ? (classroomsRaw ?? []).filter((c) =>
        scope.homeroomClassroomIds.has(c.id),
      )
    : classroomsRaw;

  type GradeBucket = { id: string; name_short: string; sort_order: number };
  const gradeMap = new Map<string, GradeBucket>();
  for (const c of classrooms ?? []) {
    if (c.grade_level && !gradeMap.has(c.grade_level.id)) {
      gradeMap.set(c.grade_level.id, {
        id: c.grade_level.id,
        name_short: c.grade_level.name_short,
        sort_order: c.grade_level.sort_order,
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
          icon={Heart}
          iconBg="bg-rose-100 text-rose-700"
          title="ประเมินตามหลักสูตร · คุณลักษณะอันพึงประสงค์"
          description={`ปีปัจจุบัน ${currentYear.year_be}`}
        />
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            ยังไม่มีห้องเรียนในปีนี้ — สร้างห้องก่อนเพื่อประเมินคุณลักษณะอันพึงประสงค์
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

  // 3. Resolve grade + room
  const selectedGrade =
    sortedGrades.find((g) => g.id === params.grade) ?? sortedGrades[0];
  const roomsInGrade = (classrooms ?? [])
    .filter((c) => c.grade_level_id === selectedGrade.id)
    .sort((a, b) => a.room_number - b.room_number);
  const selectedClassroom =
    roomsInGrade.find((r) => r.id === params.room) ?? roomsInGrade[0];

  // 4. Homeroom teachers for the subheader. Per user spec the 2 homeroom
  //    slots are EQUAL STATUS (not primary/secondary hierarchy) — fetch
  //    both rows + show both names joined with " · ". Order by `role`
  //    just to keep "slot 1" listed first when both are filled.
  const { data: homerooms } = await supabase
    .from("homeroom_assignments")
    .select(
      `
      role,
      teacher:teachers!teacher_id (
        user:users!user_id (full_name, title)
      )
    `,
    )
    .eq("classroom_id", selectedClassroom.id)
    .order("role");
  const homeroomNames = (homerooms ?? [])
    .filter((h) => h.teacher?.user)
    .map(
      (h) =>
        `${h.teacher!.user!.title ?? ""}${h.teacher!.user!.full_name}`,
    );
  const homeroomLabel =
    homeroomNames.length > 0 ? homeroomNames.join(" · ") : null;

  const roomShortLabel =
    roomsInGrade.length > 1
      ? `${selectedGrade.name_short}/${selectedClassroom.room_number}`
      : selectedGrade.name_short;

  // 5. Active characteristics (global, doesn't depend on classroom)
  const { data: charactersRaw } = await supabase
    .from("characteristics")
    .select("id, name, sort_order, source")
    .eq("is_active", true)
    .order("sort_order");
  const characteristics: Characteristic[] = (charactersRaw ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    sort_order: c.sort_order,
    source: c.source,
  }));

  const grades: GradeOption[] = sortedGrades.map((g) => ({
    id: g.id,
    label: g.name_short,
  }));
  const rooms: RoomOption[] = roomsInGrade.map((r) => ({
    id: r.id,
    label: `${selectedGrade.name_short}/${r.room_number}`,
  }));

  return (
    <>
      <PageHeader
        icon={Heart}
        iconBg="bg-rose-100 text-rose-700"
        title="ประเมินตามหลักสูตร · คุณลักษณะอันพึงประสงค์"
        description={
          <>
            ห้อง <strong>{roomShortLabel}</strong>
            {term ? (
              <>
                {" "}· ภาคเรียนที่{" "}
                <strong>
                  {term.semester}/{currentYear.year_be}
                </strong>
              </>
            ) : null}
            {homeroomLabel ? (
              <>
                {" "}· ครูประจำชั้น <strong>{homeroomLabel}</strong>
              </>
            ) : null}
          </>
        }
      />

      {/* Selector */}
      <Card padding="sm" className="mb-4">
        <CharacteristicsSelector
          grades={grades}
          selectedGradeId={selectedGrade.id}
          rooms={rooms}
          selectedRoomId={selectedClassroom.id}
          tab={tab}
        />
      </Card>

      {/* Tab nav (2 tabs) */}
      <TabNav
        gradeId={selectedGrade.id}
        roomId={selectedClassroom.id}
        currentTab={tab}
        characteristicCount={characteristics.length}
      />

      {/* Body */}
      {tab === "settings" ? (
        <CharacteristicsSettings items={characteristics} />
      ) : (
        <Suspense
          key={`${selectedClassroom.id}-${term?.semester ?? 1}`}
          fallback={
            <Card padding={false} className="overflow-hidden">
              <div className="flex items-center justify-center gap-3 p-16 text-zinc-400">
                <span className="text-sm">กำลังโหลดข้อมูล…</span>
              </div>
            </Card>
          }
        >
          <EvalSection
            classroomId={selectedClassroom.id}
            yearId={currentYear.id}
            characteristics={characteristics}
          />
        </Suspense>
      )}
    </>
  );
}

/**
 * Tab 2 body — async server component that fetches enrolled students +
 * their existing scores, then renders the interactive grid.
 *
 * Semester defaults to the school's current_semester. If there's no current
 * term at all, we still render but the grid is forced readonly (no writes
 * make sense without a year/term context).
 */
async function EvalSection({
  classroomId,
  yearId,
  characteristics,
}: {
  classroomId: string;
  yearId: string;
  characteristics: Characteristic[];
}) {
  const supabase = await createClient();
  const term = await getCurrentTerm();
  const semester: 1 | 2 = term?.semester ?? 1;
  const semState = term ? semesterStateOf(semester, term) : "future";
  const readonly = semState !== "current";

  // Resolve eval scope by grade-level system:
  //   - primary  → semester=0 (one set per year, used both terms)
  //   - secondary → semester=current_semester (1 or 2, separate per term)
  // Same value is used for `enrollments.semester` (the existing pattern)
  // AND for `characteristic_evaluations.semester` (after migration
  // 20260518a_evals_annual_for_primary.sql relaxed CHECK).
  const { data: classroomInfo } = await supabase
    .from("classrooms")
    .select(`grade_level:grade_levels!grade_level_id (system)`)
    .eq("id", classroomId)
    .maybeSingle();
  const isSecondary = classroomInfo?.grade_level?.system === "secondary";
  const evalSemester: 0 | 1 | 2 = isSecondary ? semester : 0;

  // Parallel: students + their existing scores for this (year, evalSemester)
  const [enrollResult, scoresResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        `
        student_number,
        student:students!student_id (id, title, first_name, last_name)
      `,
      )
      .eq("classroom_id", classroomId)
      .eq("semester", evalSemester)
      .order("student_number"),
    supabase
      .from("characteristic_evaluations")
      .select("student_id, characteristic_id, score")
      .eq("academic_year_id", yearId)
      .eq("semester", evalSemester),
  ]);

  const scoresMap = new Map<string, Record<string, number | null>>();
  for (const s of scoresResult.data ?? []) {
    if (!scoresMap.has(s.student_id)) scoresMap.set(s.student_id, {});
    scoresMap.get(s.student_id)![s.characteristic_id] =
      s.score == null ? null : Number(s.score);
  }

  const students: StudentRow[] = (enrollResult.data ?? [])
    .filter((e) => e.student)
    .map((e) => ({
      id: e.student!.id,
      student_number: e.student_number,
      full_label: `${abbreviateTitle(e.student!.title)}${e.student!.first_name} ${e.student!.last_name}`,
      scores: scoresMap.get(e.student!.id) ?? {},
    }));

  const cols: CharCol[] = characteristics.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  if (students.length === 0) {
    return (
      <Card variant="dashed" className="p-12 text-center">
        <p className="text-sm text-zinc-500">
          ห้องนี้ยังไม่มีนักเรียน — ต้องจัดนักเรียนเข้าห้องก่อน
        </p>
        <Link
          href="/setup/students"
          className="mt-3 inline-block text-sm font-medium text-zinc-900 underline"
        >
          ไปจัดการนักเรียน
        </Link>
      </Card>
    );
  }

  if (cols.length === 0) {
    return (
      <Card variant="dashed" className="p-12 text-center">
        <p className="text-sm text-zinc-500">
          ยังไม่มีหัวข้อคุณลักษณะ — ไปที่{" "}
          <strong>"ตั้งค่าคุณลักษณะ"</strong> เพื่อโหลดค่า สพฐ.
        </p>
      </Card>
    );
  }

  return (
    <>
      {readonly ? (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span aria-hidden>🔒</span>
          <div>
            <strong>ภาคเรียนที่ {semester} ไม่ใช่ภาคปัจจุบัน</strong> · ดูได้
            แก้ไม่ได้ · admin เปลี่ยน "ภาคเรียนปัจจุบัน" ที่{" "}
            <Link
              href="/setup/academic-years"
              className="font-medium underline"
            >
              /setup/academic-years
            </Link>
          </div>
        </div>
      ) : null}
      <Card padding={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-700">
          <span>
            {students.length} คน · {cols.length} หัวข้อ ·{" "}
            {/* Scope label: ประถม = "ทั้งปี" · มัธยม = "ภาคเรียนที่ N" */}
            {isSecondary ? `ภาคเรียนที่ ${semester}` : "ทั้งปี"}
          </span>
          <DirectPrintButton
            url={`/reports/student-eval?type=characteristics&classroom=${classroomId}&semester=${evalSemester}&embed=1`}
            title="พิมพ์รายงานคุณลักษณะอันพึงประสงค์"
          />
        </div>
        <div className="p-3">
          <CharacteristicEvalGrid
            students={students}
            characteristics={cols}
            classroomId={classroomId}
            yearId={yearId}
            semester={evalSemester}
            readonly={readonly}
          />
        </div>
      </Card>
    </>
  );
}

/** Horizontal tab nav above the body. */
function TabNav({
  gradeId,
  roomId,
  currentTab,
  characteristicCount,
}: {
  gradeId: string;
  roomId: string;
  currentTab: Tab;
  characteristicCount: number;
}) {
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    {
      id: "settings",
      label: "ตั้งค่าคุณลักษณะ",
      badge: characteristicCount,
    },
    { id: "evaluate", label: "ประเมินคุณลักษณะอันพึงประสงค์" },
  ];

  return (
    <div className="mb-4 flex gap-1 border-b border-zinc-200">
      {tabs.map((t) => {
        const isActive = t.id === currentTab;
        const params = new URLSearchParams();
        if (gradeId) params.set("grade", gradeId);
        if (roomId) params.set("room", roomId);
        params.set("tab", t.id);
        return (
          <Link
            key={t.id}
            href={`/setup/characteristics?${params.toString()}`}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "-mb-px inline-flex items-center gap-1.5 border-b-2 border-rose-600 px-4 py-2.5 text-sm font-semibold text-rose-700"
                : "-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
            }
          >
            {t.label}
            {t.badge != null ? (
              <span
                className={
                  isActive
                    ? "rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                    : "rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600"
                }
              >
                {t.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
