import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { Brain } from "lucide-react";
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
  saveReadingThinkingScore,
  setAllReadingThinkingForColumn,
} from "./actions";
import {
  ReadingThinkingSelector,
  type GradeOption,
  type RoomOption,
} from "./selector";

export const metadata = {
  title: "การอ่าน คิดวิเคราะห์ และเขียน · ระบบ ปพ.5",
};

/** The 3 dimensions of การอ่าน คิดวิเคราะห์ และเขียน (fixed per the curriculum). */
const COLUMNS: FixedColumn[] = [
  { field: "reading_score", label: "การอ่าน" },
  { field: "thinking_score", label: "การคิดวิเคราะห์" },
  { field: "writing_score", label: "การเขียน" },
];

type Props = {
  searchParams: Promise<{
    grade?: string;
    room?: string;
  }>;
};

export default async function ReadingThinkingPage({ searchParams }: Props) {
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
          icon={Brain}
          iconBg="bg-indigo-100 text-indigo-700"
          title="ประเมินตามหลักสูตร · การอ่าน คิดวิเคราะห์ และเขียน"
          description="บันทึกผลการประเมินการอ่าน · คิดวิเคราะห์ · เขียน"
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

  // Classrooms (similar logic to /setup/characteristics)
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
          icon={Brain}
          iconBg="bg-indigo-100 text-indigo-700"
          title="ประเมินตามหลักสูตร · การอ่าน คิดวิเคราะห์ และเขียน"
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

  const selectedGrade =
    sortedGrades.find((g) => g.id === params.grade) ?? sortedGrades[0];
  const roomsInGrade = (classrooms ?? [])
    .filter((c) => c.grade_level_id === selectedGrade.id)
    .sort((a, b) => a.room_number - b.room_number);
  const selectedClassroom =
    roomsInGrade.find((r) => r.id === params.room) ?? roomsInGrade[0];

  // Homeroom teachers (both slots — equal status per user spec).
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
      (h) =>
        `${h.teacher!.user!.title ?? ""}${h.teacher!.user!.full_name}`,
    );
  const homeroomLabel =
    homeroomNames.length > 0 ? homeroomNames.join(" · ") : null;

  const roomShortLabel =
    roomsInGrade.length > 1
      ? `${selectedGrade.name_short}/${selectedClassroom.room_number}`
      : selectedGrade.name_short;

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
        icon={Brain}
        iconBg="bg-indigo-100 text-indigo-700"
        title="ประเมินตามหลักสูตร · การอ่าน คิดวิเคราะห์ และเขียน"
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

      <FilterNavProvider>
        <Card padding="sm" className="mb-4">
          <ReadingThinkingSelector
            grades={grades}
            selectedGradeId={selectedGrade.id}
            rooms={rooms}
            selectedRoomId={selectedClassroom.id}
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
      .from("reading_thinking_evaluations")
      .select(
        "student_id, reading_score, thinking_score, writing_score",
      )
      .eq("academic_year_id", yearId)
      .eq("semester", evalSemester),
  ]);

  const scoresMap = new Map<string, Record<string, number | null>>();
  for (const r of scoresResult.data ?? []) {
    scoresMap.set(r.student_id, {
      reading_score: r.reading_score,
      thinking_score: r.thinking_score,
      writing_score: r.writing_score,
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
            url={`/reports/student-eval?type=reading-thinking&classroom=${classroomId}&semester=${evalSemester}&embed=1`}
            title="พิมพ์รายงานการอ่าน คิดวิเคราะห์ และเขียน"
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
            saveAction={saveReadingThinkingScore}
            bulkAction={setAllReadingThinkingForColumn}
          />
        </div>
      </Card>
    </>
  );
}
