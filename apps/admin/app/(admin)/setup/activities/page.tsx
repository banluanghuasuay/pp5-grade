import { createAdminClient } from "@pp5/database/admin";
import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { Award, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentTerm, semesterStateOf } from "@/lib/current-term";
import { getTeacherScope } from "@/lib/teacher-scope";
import { FilterNavProvider } from "../_components/filter-nav-context";
import { FilterNavGate } from "../_components/filter-nav-gate";
import {
  PassFailGridSection,
  TabNav,
} from "../score-structure/page";
import { ScoreSelector, type SubjectOption } from "../score-structure/score-selector";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

// ===================================================================
// กิจกรรมพัฒนาผู้เรียน — split from /setup/score-structure per user spec
// 2026-05-20: "แยกการบันทึกคะแนนของวิชากิจกรรม(ผ่าน/ไม่ผ่าน) ออกมาจากเมนู
// บันทึกคะแนน เป็นเมนู กิจกรรมพัฒนาผู้เรียน".
//
// This page mirrors the /setup/score-structure flow (grade → room →
// subject selector + per-semester tabs) but:
//   - Filters subjects to grading_mode = "pass_fail" ONLY
//   - Body is always PassFailGridSection (no numeric grid branching)
//   - Page title + breadcrumb say "กิจกรรมพัฒนาผู้เรียน" instead of
//     "บันทึกคะแนน"
// ===================================================================

type Tab = "1" | "2" | "summary";

type Props = {
  searchParams: Promise<{
    grade?: string;
    room?: string;
    subject?: string;
    tab?: string;
  }>;
};

const PAGE_BASE = "/setup/activities";

export default async function ActivitiesPage({ searchParams }: Props) {
  const params = await searchParams;

  const currentTerm = await getCurrentTerm();
  const currentSemester: 1 | 2 = currentTerm?.semester ?? 1;
  const defaultTab: Tab = currentSemester === 2 ? "2" : "1";

  const requestedTab: Tab =
    params.tab === "1"
      ? "1"
      : params.tab === "2"
        ? "2"
        : params.tab === "summary"
          ? "summary"
          : defaultTab;

  const supabase = await createClient();

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
          icon={Award}
          iconBg="bg-emerald-100 text-emerald-700"
          title="กิจกรรมพัฒนาผู้เรียน"
          description="บันทึกผ่าน / ไม่ผ่าน · แนะแนว / ลูกเสือ / ชุมนุม ฯลฯ"
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

  // Teacher scope — filter classrooms + subjects to only what they teach
  const scope = await getTeacherScope();

  // Activity-specific scope: teacher.scope.teachingClassroomIds includes
  // classrooms where they teach numeric subjects too — but on the
  // activities page we only want classrooms where they teach a pass_fail
  // (activity) subject. Re-derive by fetching only their pass_fail
  // offerings in current year. User report 2026-05-20: "ป.5 ป.6 ไม่ได้
  // จัดครูคนนี้เข้าสอน [กิจกรรม]" — they teach numeric there but no
  // activity, so those rooms shouldn't show on this page.
  let activityClassroomIds: Set<string> | null = null;
  if (scope) {
    const { data: passFailOfferings } = await supabase
      .from("subject_offerings")
      .select(
        "classroom_id, subject:subjects!subject_id (grading_mode, academic_year_id)",
      )
      .eq("teacher_id", scope.teacherId);
    activityClassroomIds = new Set();
    for (const o of passFailOfferings ?? []) {
      if (
        o.subject?.grading_mode === "pass_fail" &&
        o.subject.academic_year_id === currentYear.id
      ) {
        activityClassroomIds.add(o.classroom_id);
      }
    }
  }

  // 2. Classrooms + grade levels in current year
  const { data: allClassroomsRaw } = await supabase
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
        sort_order,
        system
      )
    `,
    )
    .eq("academic_year_id", currentYear.id);

  const classrooms = activityClassroomIds
    ? (allClassroomsRaw ?? []).filter((c) => activityClassroomIds!.has(c.id))
    : allClassroomsRaw;

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
          icon={Award}
          iconBg="bg-emerald-100 text-emerald-700"
          title="กิจกรรมพัฒนาผู้เรียน"
          description={`ปีปัจจุบัน ${currentYear.year_be}`}
        />
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            ยังไม่มีห้องเรียนในปีนี้ — สร้างห้องและจัดครูเข้าสอนก่อน
          </p>
        </Card>
      </>
    );
  }

  // 3. Resolve grade
  const selectedGrade =
    sortedGrades.find((g) => g.id === params.grade) ?? sortedGrades[0];
  const isPrimary = selectedGrade.system === "primary";
  const tab: Tab = !isPrimary ? defaultTab : requestedTab;
  const semester: 1 | 2 = tab === "2" ? 2 : 1;
  const semesterState =
    tab === "summary" ? "current" : semesterStateOf(semester, currentTerm);

  // 4. Rooms in selected grade
  const roomsInGrade = (classrooms ?? [])
    .filter((c) => c.grade_level_id === selectedGrade.id)
    .sort((a, b) => a.room_number - b.room_number);

  const selectedClassroom =
    roomsInGrade.find((r) => r.id === params.room) ?? roomsInGrade[0];

  // 5. Subject options — FILTER TO pass_fail ONLY. Primary uses
  //    semester=0 (year-wide); secondary uses currentSemester.
  const effectiveSubjectSemester: 0 | 1 | 2 = isPrimary ? 0 : currentSemester;
  const planId = selectedClassroom.study_plan_id;

  type PlanSubject = {
    id: string;
    code: string;
    name_th: string;
    grading_mode: "numeric" | "pass_fail";
    learning_area_sort: number;
  };

  let planSubjects: PlanSubject[] = [];
  if (planId) {
    const { data: planRows } = await supabase
      .from("study_plan_subjects")
      .select(
        `
        subject:subjects!subject_id (
          id,
          code,
          name_th,
          grading_mode,
          academic_year_id,
          semester,
          learning_area:learning_areas!learning_area_id (sort_order)
        )
      `,
      )
      .eq("study_plan_id", planId);

    planSubjects = (planRows ?? [])
      .map((r) => r.subject)
      .filter((s): s is NonNullable<typeof s> => !!s)
      .filter(
        (s) =>
          s.academic_year_id === currentYear.id &&
          s.semester === effectiveSubjectSemester &&
          // Activities page = pass_fail ONLY
          s.grading_mode === "pass_fail",
      )
      .map((s) => ({
        id: s.id,
        code: s.code,
        name_th: s.name_th,
        grading_mode: s.grading_mode,
        learning_area_sort: s.learning_area?.sort_order ?? 999,
      }));
  }

  // 6. Existing offerings for the active semester
  const { data: allOfferings } = await supabase
    .from("subject_offerings")
    .select("id, subject_id, teacher_id")
    .eq("classroom_id", selectedClassroom.id)
    .eq("semester", semester);

  const offeringBySubject = new Map<
    string,
    { id: string; teacher_id: string | null }
  >();
  for (const o of allOfferings ?? []) {
    offeringBySubject.set(o.subject_id, {
      id: o.id,
      teacher_id: o.teacher_id,
    });
  }

  // Teacher filter — keep only subjects assigned to this teacher
  const teacherFilteredSubjects = scope
    ? planSubjects.filter(
        (s) => offeringBySubject.get(s.id)?.teacher_id === scope.teacherId,
      )
    : planSubjects;

  // Sort by learning_area → code (activity subjects all share category="activity")
  const sortedSubjects = teacherFilteredSubjects.slice().sort((a, b) => {
    if (a.learning_area_sort !== b.learning_area_sort) {
      return a.learning_area_sort - b.learning_area_sort;
    }
    return a.code.localeCompare(b.code, "th");
  });

  const subjectOptions: SubjectOption[] = sortedSubjects.map((s) => ({
    id: s.id,
    label: `[${s.code}] ${s.name_th}`,
    hasTeacher: !!offeringBySubject.get(s.id)?.teacher_id,
  }));

  const selectedSubject =
    sortedSubjects.find((s) => s.id === params.subject) ??
    sortedSubjects[0] ??
    null;

  // Auto-create offering if missing — same pattern as score-structure
  if (selectedSubject && !offeringBySubject.has(selectedSubject.id)) {
    const admin = createAdminClient();
    const { data: created } = await admin
      .from("subject_offerings")
      .insert({
        classroom_id: selectedClassroom.id,
        subject_id: selectedSubject.id,
        semester,
        teacher_id: null,
      })
      .select("id")
      .single();
    if (created) {
      offeringBySubject.set(selectedSubject.id, {
        id: created.id,
        teacher_id: null,
      });
    }
  }

  return (
    <>
      <PageHeader
        icon={Award}
        iconBg="bg-emerald-100 text-emerald-700"
        title="กิจกรรมพัฒนาผู้เรียน"
        description={
          <>
            บันทึกผ่าน / ไม่ผ่าน · ปีปัจจุบัน{" "}
            <strong className="font-mono">{currentYear.year_be}</strong>
          </>
        }
      />

      <FilterNavProvider>
      <Card padding="sm" className="mb-4">
        <ScoreSelector
          grades={sortedGrades.map((g) => ({
            id: g.id,
            label: g.name_short,
          }))}
          selectedGradeId={selectedGrade.id}
          rooms={roomsInGrade.map((r) => ({
            id: r.id,
            label: `${selectedGrade.name_short}/${r.room_number}`,
          }))}
          selectedRoomId={selectedClassroom.id}
          subjects={subjectOptions}
          selectedSubjectId={selectedSubject?.id ?? ""}
          tab={tab}
          basePath={PAGE_BASE}
        />
      </Card>

      {/* Tabs for primary only (mirror score-structure pattern) */}
      {isPrimary && (
        <TabNav
          gradeId={selectedGrade.id}
          roomId={selectedClassroom.id}
          subjectId={selectedSubject?.id ?? ""}
          currentTab={tab}
          currentSemester={currentSemester}
          basePath={PAGE_BASE}
        />
      )}

      <FilterNavGate
        fallback={
          <Card padding={false} className="overflow-hidden">
            <div className="flex items-center justify-center gap-3 p-16 text-zinc-400">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-sm">กำลังโหลดข้อมูล…</span>
            </div>
          </Card>
        }
      >
      {!selectedSubject ? (
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            ห้องนี้ยังไม่มีวิชากิจกรรมในแผนการเรียน
          </p>
          <Link
            href={`/setup/subjects?grade=${selectedGrade.id}`}
            className="mt-3 inline-block text-sm font-medium text-zinc-900 underline"
          >
            ไปเพิ่มวิชากิจกรรมในแผน
          </Link>
        </Card>
      ) : tab === "summary" ? (
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            หน้าสรุปกิจกรรมยังไม่พร้อมใช้งาน — กลับไปที่{" "}
            <Link
              href={`${PAGE_BASE}?grade=${selectedGrade.id}&room=${selectedClassroom.id}&subject=${selectedSubject.id}&tab=1`}
              className="font-medium underline"
            >
              ภาคเรียนที่ 1
            </Link>{" "}
            หรือ{" "}
            <Link
              href={`${PAGE_BASE}?grade=${selectedGrade.id}&room=${selectedClassroom.id}&subject=${selectedSubject.id}&tab=2`}
              className="font-medium underline"
            >
              ภาคเรียนที่ 2
            </Link>{" "}
            เพื่อบันทึก
          </p>
        </Card>
      ) : (
        <Suspense
          key={`${tab}-${selectedSubject.id}-${selectedClassroom.id}`}
          fallback={
            <Card padding={false} className="overflow-hidden">
              <div className="flex items-center justify-center gap-3 p-16 text-zinc-400">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-sm">กำลังโหลดข้อมูล…</span>
              </div>
            </Card>
          }
        >
          <PassFailGridSection
            classroomId={selectedClassroom.id}
            subjectId={selectedSubject.id}
            semester={semester}
            isPrimary={isPrimary}
            readonly={semesterState === "past"}
          />
        </Suspense>
      )}
      </FilterNavGate>
      </FilterNavProvider>
    </>
  );
}
