import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { Activity } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentTerm, semesterStateOf } from "@/lib/current-term";
import { getTeacherScope } from "@/lib/teacher-scope";
import { DirectPrintButton } from "../../_components/direct-print-button";
import { FilterNavProvider } from "../_components/filter-nav-context";
import { FilterNavGate } from "../_components/filter-nav-gate";
import {
  FixedEvalGrid,
  type FixedColumn,
  type FixedStudentRow,
} from "../../_components/fixed-eval-grid";
import { abbreviateTitle } from "../score-structure/grading-utils";
import {
  saveCompetencyScore,
  setAllCompetencyForColumn,
} from "./actions";
import {
  CompetencySelector,
  type GradeOption,
  type RoomOption,
} from "./selector";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

/** The 5 competency dimensions (fixed per the curriculum). */
const COLUMNS: FixedColumn[] = [
  { field: "communication_score", label: "การสื่อสาร" },
  { field: "thinking_score", label: "การคิด" },
  { field: "problem_solving_score", label: "การแก้ปัญหา" },
  { field: "life_skills_score", label: "ทักษะชีวิต" },
  { field: "technology_score", label: "ใช้เทคโนโลยี" },
];

type Props = {
  searchParams: Promise<{
    grade?: string;
    room?: string;
  }>;
};

export default async function CompetencyPage({ searchParams }: Props) {
  const params = await searchParams;

  const supabase = await createClient();
  const term = await getCurrentTerm();

  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("id, year_be")
    .eq("is_current", true)
    .maybeSingle();

  if (!currentYear) {
    return (
      <>
        <PageHeader
          icon={Activity}
          iconBg="bg-emerald-100 text-emerald-700"
          title="ประเมินตามหลักสูตร · สมรรถนะสำคัญ"
          description="บันทึกผลการประเมินสมรรถนะสำคัญของผู้เรียน 5 ด้าน"
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

  // Teacher scope — homeroom only per user spec 2026-05-20.
  const scope = await getTeacherScope();

  const { data: classroomsRaw } = await supabase
    .from("classrooms")
    .select(
      `
      id,
      room_number,
      grade_level_id,
      grade_level:grade_levels!grade_level_id (id, name_short, sort_order)
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
          icon={Activity}
          iconBg="bg-emerald-100 text-emerald-700"
          title="ประเมินตามหลักสูตร · สมรรถนะสำคัญ"
        />
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            ยังไม่มีห้องเรียนในปีนี้ — สร้างห้องก่อน
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

  // Don't auto-pick — admin must choose ชั้น then ห้อง first (no auto even
  // for single-room grades). User spec 2026-05-31.
  const selectedGrade = params.grade
    ? (sortedGrades.find((g) => g.id === params.grade) ?? null)
    : null;
  const roomsInGrade = selectedGrade
    ? (classrooms ?? [])
        .filter((c) => c.grade_level_id === selectedGrade.id)
        .sort((a, b) => a.room_number - b.room_number)
    : [];
  const selectedClassroom = params.room
    ? (roomsInGrade.find((r) => r.id === params.room) ?? null)
    : null;

  // Homeroom teachers + room label — only once a room is chosen.
  let homeroomLabel: string | null = null;
  let roomShortLabel = "";
  if (selectedGrade && selectedClassroom) {
    const { data: homerooms } = await supabase
      .from("homeroom_assignments")
      .select(
        `role, teacher:teachers!teacher_id ( user:users!user_id (full_name, title) )`,
      )
      .eq("classroom_id", selectedClassroom.id)
      .order("role");
    const homeroomNames = (homerooms ?? [])
      .filter((h) => h.teacher?.user)
      .map(
        (h) => `${h.teacher!.user!.title ?? ""}${h.teacher!.user!.full_name}`,
      );
    homeroomLabel = homeroomNames.length > 0 ? homeroomNames.join(" · ") : null;
    roomShortLabel = `${selectedGrade.name_short}/${selectedClassroom.room_number}`;
  }

  const grades: GradeOption[] = sortedGrades.map((g) => ({
    id: g.id,
    label: g.name_short,
  }));
  const rooms: RoomOption[] = selectedGrade
    ? roomsInGrade.map((r) => ({
        id: r.id,
        label: `${selectedGrade.name_short}/${r.room_number}`,
      }))
    : [];

  return (
    <>
      <PageHeader
        icon={Activity}
        iconBg="bg-emerald-100 text-emerald-700"
        title="ประเมินตามหลักสูตร · สมรรถนะสำคัญ"
        description={
          selectedClassroom ? (
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
          ) : (
            "เลือกระดับชั้นและห้องเพื่อเริ่มประเมิน"
          )
        }
      />

      <FilterNavProvider>
        <Card padding="sm" className="mb-4">
          <CompetencySelector
            grades={grades}
            selectedGradeId={selectedGrade?.id ?? ""}
            rooms={rooms}
            selectedRoomId={selectedClassroom?.id ?? ""}
          />
        </Card>

        <FilterNavGate
          fallback={
            <Card padding={false} className="overflow-hidden">
              <div className="p-16 text-center text-sm text-zinc-400">
                กำลังโหลดข้อมูล…
              </div>
            </Card>
          }
        >
          {!selectedGrade ? (
            <Card variant="dashed" className="p-12 text-center">
              <p className="text-sm text-zinc-500">เลือกระดับชั้นก่อน</p>
            </Card>
          ) : !selectedClassroom ? (
            <Card variant="dashed" className="p-12 text-center">
              <p className="text-sm text-zinc-500">เลือกห้องเรียนก่อน</p>
            </Card>
          ) : (
            <Suspense
              key={`${selectedClassroom.id}-${term?.semester ?? 1}`}
              fallback={
                <Card padding={false} className="overflow-hidden">
                  <div className="p-16 text-center text-sm text-zinc-400">
                    กำลังโหลดข้อมูล…
                  </div>
                </Card>
              }
            >
              <GridSection
                classroomId={selectedClassroom.id}
                yearId={currentYear.id}
              />
            </Suspense>
          )}
        </FilterNavGate>
      </FilterNavProvider>
    </>
  );
}

async function GridSection({
  classroomId,
  yearId,
}: {
  classroomId: string;
  yearId: string;
}) {
  const supabase = await createClient();
  const term = await getCurrentTerm();
  const semester: 1 | 2 = term?.semester ?? 1;
  const semState = term ? semesterStateOf(semester, term) : "future";
  const readonly = semState !== "current";

  // Resolve enrollment semester scope (primary=0, secondary=current sem)
  const { data: classroomInfo } = await supabase
    .from("classrooms")
    .select(`grade_level:grade_levels!grade_level_id (system)`)
    .eq("id", classroomId)
    .maybeSingle();
  const isSecondary = classroomInfo?.grade_level?.system === "secondary";
  // Same eval scope as enrollments: primary → 0 (annual) · secondary →
  // current semester (1 or 2). Used for both `.eq("semester", ...)` calls
  // below + passed down to the grid for write-side action payloads.
  const evalSemester: 0 | 1 | 2 = isSecondary ? semester : 0;

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
      .from("competency_evaluations")
      .select(
        "student_id, communication_score, thinking_score, problem_solving_score, life_skills_score, technology_score",
      )
      .eq("academic_year_id", yearId)
      .eq("semester", evalSemester),
  ]);

  const scoresMap = new Map<string, Record<string, number | null>>();
  for (const r of scoresResult.data ?? []) {
    scoresMap.set(r.student_id, {
      communication_score: r.communication_score,
      thinking_score: r.thinking_score,
      problem_solving_score: r.problem_solving_score,
      life_skills_score: r.life_skills_score,
      technology_score: r.technology_score,
    });
  }

  const students: FixedStudentRow[] = (enrollResult.data ?? [])
    .filter((e) => e.student)
    .map((e) => ({
      id: e.student!.id,
      student_number: e.student_number,
      full_label: `${abbreviateTitle(e.student!.title)}${e.student!.first_name} ${e.student!.last_name}`,
      scores: scoresMap.get(e.student!.id) ?? {},
    }));

  if (students.length === 0) {
    return (
      <Card variant="dashed" className="p-12 text-center">
        <p className="text-sm text-zinc-500">
          ห้องนี้ยังไม่มีนักเรียน — ต้องจัดนักเรียนเข้าห้องก่อน
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
            แก้ไม่ได้ ·{" "}
            <Link
              href="/setup/academic-years"
              className="font-medium underline"
            >
              เปลี่ยน "ภาคเรียนปัจจุบัน"
            </Link>
          </div>
        </div>
      ) : null}
      <Card padding={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-700">
          <span>
            {students.length} คน ·{" "}
            {isSecondary ? `ภาคเรียนที่ ${semester}` : "ทั้งปี"}
          </span>
          <DirectPrintButton
            url={`/reports/student-eval?type=competency&classroom=${classroomId}&semester=${evalSemester}&embed=1`}
            title="พิมพ์รายงานสมรรถนะสำคัญ"
          />
        </div>
        <div className="p-3">
          <FixedEvalGrid
            students={students}
            columns={COLUMNS}
            classroomId={classroomId}
            yearId={yearId}
            semester={evalSemester}
            readonly={readonly}
            saveAction={saveCompetencyScore}
            bulkAction={setAllCompetencyForColumn}
          />
        </div>
      </Card>
    </>
  );
}
