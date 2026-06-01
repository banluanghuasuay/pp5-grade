import { createAdminClient } from "@pp5/database/admin";
import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { ClipboardList, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentTerm, semesterStateOf } from "@/lib/current-term";
import { getTeacherScope } from "@/lib/teacher-scope";
import { DirectPrintButton } from "../../_components/direct-print-button";
import { FilterNavProvider } from "../_components/filter-nav-context";
import { FilterNavGate } from "../_components/filter-nav-gate";
import { FilterNavLink } from "../_components/filter-nav-link";
import {
  ensureCategorySlots,
  ensureSecondaryCategorySlots,
} from "./actions";
import { abbreviateTitle } from "./grading-utils";
import {
  PassFailBulkButton,
  PassFailGrid,
  type PassFailStudent,
} from "./pass-fail-grid";
import { ScoreGrid, type Category, type StudentRow } from "./score-grid";
import { ScoreSelector, type SubjectOption } from "./score-selector";
import { SecondaryScoreGrid } from "./secondary-score-grid";
import { SummarySection } from "./summary-section";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

// Subject category sort order — same as /setup/subjects and /setup/teaching
const CATEGORY_ORDER: Record<string, number> = {
  core: 1,
  additional: 2,
  activity: 3,
};

type Tab = "1" | "2" | "summary";

type Props = {
  searchParams: Promise<{
    grade?: string;
    room?: string;
    subject?: string;
    tab?: string;
  }>;
};

export default async function ScoresPage({ searchParams }: Props) {
  const params = await searchParams;

  // Phase 2.6 — read the school's current term to drive default tab + lock state
  const currentTerm = await getCurrentTerm();
  const currentSemester: 1 | 2 = currentTerm?.semester ?? 1;
  const defaultTab: Tab = currentSemester === 2 ? "2" : "1";

  // Pick tab: explicit param wins; otherwise fall back to the current semester.
  // Phase 4 — secondary mode resolves the summary tab back to a semester since
  // grades render inline in the score grid there (resolved below after we
  // know the selected grade's `system`).
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
          icon={ClipboardList}
          iconBg="bg-violet-100 text-violet-700"
          title="บันทึกคะแนน"
          description="ตั้งคะแนนเต็ม + กรอกคะแนนนักเรียน · ภาคเรียนที่ 1 / ภาคเรียนที่ 2 / สรุปผล"
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

  // Teacher scope (Phase 2) — null for admins (= no filter), or a Set of
  // (teaching classrooms / offering ids) for teachers.
  const scope = await getTeacherScope();

  // Numeric-only scope: scope.teachingClassroomIds includes pass_fail
  // (activity) classrooms too — but on the scoring page we only want
  // classrooms where the teacher teaches a NUMERIC subject. Otherwise a
  // teacher who only teaches activity in ป.X would see ป.X here with an
  // empty subject dropdown.
  let numericClassroomIds: Set<string> | null = null;
  if (scope) {
    const { data: numericOfferings } = await supabase
      .from("subject_offerings")
      .select(
        "classroom_id, subject:subjects!subject_id (grading_mode, academic_year_id)",
      )
      .eq("teacher_id", scope.teacherId);
    numericClassroomIds = new Set();
    for (const o of numericOfferings ?? []) {
      if (
        o.subject?.grading_mode === "numeric" &&
        o.subject.academic_year_id === currentYear.id
      ) {
        numericClassroomIds.add(o.classroom_id);
      }
    }
  }

  // 2. Open grades + classrooms in current year
  // (Phase 4) Need `system` to branch the page between primary (3-tab view)
  // and secondary (single-semester redesign per the Phase 4 mockup).
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

  // Teacher filter — show ONLY classrooms where the teacher has at least
  // one NUMERIC subject offering.
  const classrooms = numericClassroomIds
    ? (allClassroomsRaw ?? []).filter((c) => numericClassroomIds!.has(c.id))
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
          icon={ClipboardList}
          iconBg="bg-violet-100 text-violet-700"
          title="บันทึกคะแนน"
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
  // Phase 4 Plan B — branch UI on the grade level's system field
  const isPrimary = selectedGrade.system === "primary";
  // Phase 4B — secondary has no semester switcher at all. The page always
  // renders the school's current_semester (set in /setup/academic-years).
  // Any `?tab=` param is ignored for secondary; primary keeps its 3-tab
  // navigation (ภาค 1 / ภาค 2 / สรุปผล).
  const tab: Tab = !isPrimary ? defaultTab : requestedTab;
  const semester: 1 | 2 = tab === "2" ? 2 : 1; // for "summary" we use 1 just as default

  // State of the active semester relative to the school's "current":
  //   - "past"    → readonly (banner: ภาคเรียนนี้ปิดแล้ว)
  //   - "current" → editable
  //   - "future"  → disabled (banner: ยังไม่เริ่มภาคเรียนนี้)
  const semesterState =
    tab === "summary" ? "current" : semesterStateOf(semester, currentTerm);

  // 4. Rooms in selected grade
  const roomsInGrade = (classrooms ?? [])
    .filter((c) => c.grade_level_id === selectedGrade.id)
    .sort((a, b) => a.room_number - b.room_number);

  const selectedClassroom =
    roomsInGrade.find((r) => r.id === params.room) ?? roomsInGrade[0];

  // 5. Subject options = ALL subjects in this classroom's PLAN (in current
  //    scope), not just ones with an offering. This way the dropdown shows
  //    every subject even before a teacher is assigned ("ยังไม่จัดครู").
  //    Offerings are looked up separately to attach hasTeacher flag and
  //    auto-create as needed.
  //
  //    Effective subject-semester scope:
  //      primary  → 0 (year-wide; sem 1 & 2 share subjects)
  //      secondary → currentSemester (sem 1 and sem 2 = DIFFERENT subjects;
  //                                   page locks to current_semester)
  const effectiveSubjectSemester: 0 | 1 | 2 = isPrimary ? 0 : currentSemester;
  const planId = selectedClassroom.study_plan_id;

  type PlanSubject = {
    id: string;
    code: string;
    name_th: string;
    category: "core" | "additional" | "activity";
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
          category,
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
          // Exclude activity (pass_fail) subjects — they now live on the
          // dedicated /setup/activities page per user spec 2026-05-20:
          // "แยกการบันทึกคะแนนของวิชากิจกรรม(ผ่าน/ไม่ผ่าน) ออกมาจากเมนู
          // บันทึกคะแนน เป็นเมนู กิจกรรมพัฒนาผู้เรียน".
          s.grading_mode === "numeric",
      )
      .map((s) => ({
        id: s.id,
        code: s.code,
        name_th: s.name_th,
        category: s.category,
        grading_mode: s.grading_mode,
        learning_area_sort: s.learning_area?.sort_order ?? 999,
      }));
  }

  // Existing offerings at the ACTIVE tab's semester. We use STRICT matching
  // (no fallback to other semesters) to avoid stale offerings at the wrong
  // semester (e.g., leftovers from before subjects became per-(year, semester))
  // misleadingly hiding the "ยังไม่จัดครูเข้าสอน" badge for secondary subjects.
  //
  // For primary: same teacher mirrors across sem 1 and sem 2 (per teaching
  // save-side), so reading at `semester` returns the right teacher.
  // For secondary: subject's only valid offering is at currentSemester
  // (= active tab); any offering at the OTHER semester for the same subject_id
  // is stale and should be ignored.
  const { data: allOfferings } = await supabase
    .from("subject_offerings")
    .select("id, subject_id, semester, teacher_id")
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

  // Teacher filter — keep only subjects where the offering is assigned to
  // this teacher (teacher_id matches). Admin (scope=null) sees all.
  const teacherFilteredSubjects = scope
    ? planSubjects.filter(
        (s) => offeringBySubject.get(s.id)?.teacher_id === scope.teacherId,
      )
    : planSubjects;

  // Sort like the rest of the app: category → learning_area → code
  const sortedSubjects = teacherFilteredSubjects.slice().sort((a, b) => {
    const ac = CATEGORY_ORDER[a.category] ?? 99;
    const bc = CATEGORY_ORDER[b.category] ?? 99;
    if (ac !== bc) return ac - bc;
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

  const selectedSubjectRecord =
    sortedSubjects.find((s) => s.id === params.subject) ??
    sortedSubjects[0] ??
    null;
  const selectedSubject = selectedSubjectRecord
    ? {
        id: selectedSubjectRecord.id,
        label: `[${selectedSubjectRecord.code}] ${selectedSubjectRecord.name_th}`,
        grading_mode: selectedSubjectRecord.grading_mode,
      }
    : null;

  // Auto-create offering for the selected subject if missing — keeps
  // downstream code (categories, scores, grades) working without forcing
  // admin to assign a teacher first. teacher_id stays NULL; teaching page
  // UPDATEs it later.
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
        icon={ClipboardList}
        iconBg="bg-violet-100 text-violet-700"
        title="บันทึกคะแนน"
        description={
          <>
            ตั้งคะแนนเต็ม + กรอกคะแนนนักเรียน · ปีปัจจุบัน{" "}
            <strong className="font-mono">{currentYear.year_be}</strong>
          </>
        }
      />

      <FilterNavProvider>
      {/* Top selector card */}
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
        />
      </Card>

      {/* Tabs — only primary shows tabs (ภาค 1 / 2 / สรุปผล).
          Secondary always renders the current semester; admin switches term
          via /setup/academic-years instead of an in-page tab. */}
      {isPrimary && (
        <TabNav
          gradeId={selectedGrade.id}
          roomId={selectedClassroom.id}
          subjectId={selectedSubject?.id ?? ""}
          currentTab={tab}
          currentSemester={currentSemester}
        />
      )}

      {/* Body — depends on tab. Gate it so changing ชั้น/ห้อง/วิชา/แท็บ
          paints the loading card instantly. */}
      <FilterNavGate fallback={<TableLoadingCard />}>
      {!selectedSubject ? (
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            ห้องนี้ยังไม่มีวิชาในแผนการเรียน
          </p>
          <Link
            href={`/setup/subjects?grade=${selectedGrade.id}`}
            className="mt-3 inline-block text-sm font-medium text-zinc-900 underline"
          >
            ไปเพิ่มวิชาในแผน
          </Link>
        </Card>
      ) : (
        // Suspense + key tied to (tab × subject × room): every change
        // unmounts the old subtree and shows the spinner while the new
        // async server component fetches its data.
        <Suspense
          key={`${tab}-${selectedSubject.id}-${selectedClassroom.id}`}
          fallback={<TableLoadingCard />}
        >
          {tab === "summary" ? (
            <SummarySection
              classroomId={selectedClassroom.id}
              subjectId={selectedSubject.id}
              currentSemester={currentSemester}
            />
          ) : semesterState === "future" ? (
            <FutureSemesterPlaceholder semester={semester} />
          ) : selectedSubject.grading_mode === "pass_fail" ? (
            <PassFailGridSection
              classroomId={selectedClassroom.id}
              subjectId={selectedSubject.id}
              semester={semester}
              isPrimary={isPrimary}
              readonly={semesterState === "past"}
            />
          ) : !isPrimary ? (
            // Phase 4 — secondary score grid with grouped columns +
            // inline เกรด column (no separate summary tab).
            <SecondaryScoreGridSection
              classroomId={selectedClassroom.id}
              subjectId={selectedSubject.id}
              semester={semester}
              readonly={semesterState === "past"}
            />
          ) : (
            <ScoreGridSection
              classroomId={selectedClassroom.id}
              subjectId={selectedSubject.id}
              semester={semester}
              readonly={semesterState === "past"}
            />
          )}
        </Suspense>
      )}
      </FilterNavGate>
      </FilterNavProvider>
    </>
  );
}

/**
 * Fallback shown inside the Suspense boundary while a new
 * SummarySection / ScoreGridSection fetches its data.
 */
function TableLoadingCard() {
  return (
    <Card padding={false} className="overflow-hidden">
      <div className="flex items-center justify-center gap-3 p-16 text-zinc-400">
        <Loader2 className="size-6 animate-spin" />
        <span className="text-sm">กำลังโหลดข้อมูล…</span>
      </div>
    </Card>
  );
}

/**
 * "พิมพ์รายงาน" button — loads the ปพ.5 report page inside a hidden iframe
 * and triggers the browser's native print dialog directly (no preview page).
 *
 * Loads the standalone /reports/score-table route (decoupled from the ปพ.5
 * เล่ม) which renders title header + score table + signature footer — same
 * output as the old pp5?parts=scores, but its own route + "บันทึกคะแนน"
 * filename. The comprehensive ปพ.5 bundle is still available via the
 * dedicated "พิมพ์เล่มรายงาน" menu which loads `/reports/pp5`.
 */
function Pp5PrintLink({
  classroomId,
  subjectId,
  semester,
}: {
  classroomId: string;
  subjectId: string;
  semester: 1 | 2;
}) {
  // Points at the standalone /reports/score-table route (NOT pp5?parts=scores)
  // so the score-only print is fully decoupled from the ปพ.5 เล่ม and gets its
  // own "บันทึกคะแนน" filename. `embed=1` renders it bare-bones (no admin
  // chrome) and unlocks its generateMetadata (returns {} unless embed=1).
  const url = `/reports/score-table?classroom=${classroomId}&subject=${subjectId}&semester=${semester}&embed=1`;
  return <DirectPrintButton url={url} title="พิมพ์รายงาน" />;
}

/** Body shown for a tab whose semester hasn't started yet (semesterState=future). */
function FutureSemesterPlaceholder({ semester }: { semester: 1 | 2 }) {
  return (
    <Card variant="dashed" className="p-12 text-center">
      <p className="text-sm text-zinc-600">
        ⏳ ยังไม่เริ่ม<strong>ภาคเรียนที่ {semester}</strong>
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        เมื่อ admin เปลี่ยน "ภาคเรียนปัจจุบัน" ที่{" "}
        <Link
          href="/setup/academic-years"
          className="font-medium text-zinc-700 underline"
        >
          /setup/academic-years
        </Link>{" "}
        ภาคเรียนนี้จะเปิดให้บันทึก
      </p>
    </Card>
  );
}

/** Yellow banner above a readonly (past) semester's grid. */
function PastSemesterBanner({ semester }: { semester: 1 | 2 }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <span aria-hidden>🔒</span>
      <div>
        <strong>ภาคเรียนที่ {semester} ถูกล็อค</strong> · ดูได้ แก้ไม่ได้ ·{" "}
        admin เปลี่ยน "ภาคเรียนปัจจุบัน" ที่{" "}
        <Link
          href="/setup/academic-years"
          className="font-medium underline"
        >
          /setup/academic-years
        </Link>{" "}
        เพื่อปลดล็อค
      </div>
    </div>
  );
}

/**
 * Horizontal tab nav above the table — primary-only (ภาค 1 / 2 / สรุปผล).
 * Phase 4 hides this entirely for secondary classrooms (their page always
 * renders the school's current_semester with grades inline).
 */
export function TabNav({
  gradeId,
  roomId,
  subjectId,
  currentTab,
  currentSemester,
  basePath = "/setup/score-structure",
}: {
  gradeId: string;
  roomId: string;
  subjectId: string;
  currentTab: Tab;
  currentSemester: 1 | 2;
  /** Base URL path the tab links point to — defaults to score-structure,
   *  overridden by /setup/activities to `/setup/activities` so the tabs
   *  stay within the activities page when clicked. */
  basePath?: string;
}) {
  // Decorate semester tab labels based on lock state:
  //   past   → 🔒  (readonly view)
  //   current →    (no decoration; active term)
  //   future → ⏳  (not started yet)
  const labelFor = (sem: 1 | 2): string => {
    if (sem === currentSemester) return `ภาคเรียนที่ ${sem}`;
    if (sem < currentSemester) return `🔒 ภาคเรียนที่ ${sem}`;
    return `⏳ ภาคเรียนที่ ${sem}`;
  };
  const tabs: { id: Tab; label: string }[] = [
    { id: "1", label: labelFor(1) },
    { id: "2", label: labelFor(2) },
    { id: "summary", label: "🏆 สรุปผล/ตัดเกรด" },
  ];

  return (
    <div className="mb-4 flex gap-1 border-b border-zinc-200">
      {tabs.map((t) => {
        const isActive = t.id === currentTab;
        const params = new URLSearchParams();
        if (gradeId) params.set("grade", gradeId);
        if (roomId) params.set("room", roomId);
        if (subjectId) params.set("subject", subjectId);
        params.set("tab", t.id);
        return (
          <FilterNavLink
            key={t.id}
            href={`${basePath}?${params.toString()}`}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "-mb-px border-b-2 border-violet-600 px-4 py-2.5 text-sm font-semibold text-violet-700"
                : "-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
            }
          >
            {t.label}
          </FilterNavLink>
        );
      })}
    </div>
  );
}

/**
 * Fetches offering + categories + enrolled students + scores, then renders
 * the interactive grid (max_score header row + student score rows).
 */
async function ScoreGridSection({
  classroomId,
  subjectId,
  semester,
  readonly,
}: {
  classroomId: string;
  subjectId: string;
  semester: 1 | 2;
  readonly: boolean;
}) {
  const supabase = await createClient();

  const offeringSelect = `
    id,
    teacher:teachers!teacher_id (
      id,
      user:users!user_id (
        full_name,
        title
      )
    )
  `;

  // 1. Look up the offering for (classroom, subject, semester)
  let { data: offering } = await supabase
    .from("subject_offerings")
    .select(offeringSelect)
    .eq("classroom_id", classroomId)
    .eq("subject_id", subjectId)
    .eq("semester", semester)
    .maybeSingle();

  // 1b. Auto-heal: if this semester has no offering but the OTHER semester
  // does, mirror it with the same teacher. Handles legacy data assigned
  // before saveOfferingAssignments wrote both semesters.
  if (!offering) {
    const otherSem = semester === 1 ? 2 : 1;
    const { data: otherOffering } = await supabase
      .from("subject_offerings")
      .select("teacher_id")
      .eq("classroom_id", classroomId)
      .eq("subject_id", subjectId)
      .eq("semester", otherSem)
      .maybeSingle();

    if (otherOffering?.teacher_id) {
      const admin = createAdminClient();
      const { data: created } = await admin
        .from("subject_offerings")
        .insert({
          classroom_id: classroomId,
          subject_id: subjectId,
          teacher_id: otherOffering.teacher_id,
          semester,
        })
        .select(offeringSelect)
        .single();
      offering = created;
    }
  }

  if (!offering) {
    return (
      <Card variant="warning" padding="sm" className="text-sm text-amber-900">
        ⚠️ ภาค {semester} ยังไม่ได้กำหนดครูสำหรับวิชานี้ ·{" "}
        <Link
          href={`/setup/teaching?room=${classroomId}`}
          className="font-medium underline"
        >
          ไปจัดครูเข้าสอน
        </Link>
      </Card>
    );
  }

  // 2. Ensure 11 category slots exist (auto-create with max=0 if missing)
  const slotCategories = await ensureCategorySlots(offering.id);
  const categories: Category[] = slotCategories.map((c) => ({
    id: c.id,
    sort_order: c.sort_order,
    max_score: c.max_score,
    is_midterm: c.is_midterm,
    is_final: c.is_final,
  }));

  // 3. Fetch enrolled students + their scores (in parallel).
  //    ScoreGridSection only renders for PRIMARY → enrollments scoped to
  //    semester=0 (year-wide).
  const [enrollResult, scoresResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        `
        student_number,
        student:students!student_id (
          id,
          title,
          first_name,
          last_name
        )
      `,
      )
      .eq("classroom_id", classroomId)
      .eq("semester", 0)
      .order("student_number"),
    supabase
      .from("scores")
      .select("student_id, category_id, score")
      .in(
        "category_id",
        categories.map((c) => c.id),
      ),
  ]);

  type EnrolledStudent = {
    id: string;
    student_number: number;
    full_label: string;
  };
  const enrolled: EnrolledStudent[] = (enrollResult.data ?? [])
    .filter((e) => e.student)
    .map((e) => ({
      id: e.student!.id,
      student_number: e.student_number,
      full_label: `${abbreviateTitle(e.student!.title)}${e.student!.first_name} ${e.student!.last_name}`,
    }));

  // Build scores lookup: student_id → category_id → value
  const scoresByStudent = new Map<string, Record<string, number | null>>();
  for (const row of scoresResult.data ?? []) {
    if (!scoresByStudent.has(row.student_id)) {
      scoresByStudent.set(row.student_id, {});
    }
    scoresByStudent.get(row.student_id)![row.category_id] =
      row.score != null ? Number(row.score) : null;
  }

  const students: StudentRow[] = enrolled.map((s) => ({
    id: s.id,
    student_number: s.student_number,
    full_label: s.full_label,
    scores: scoresByStudent.get(s.id) ?? {},
  }));

  const teacherLabel = offering.teacher?.user
    ? `${offering.teacher.user.title ?? ""}${offering.teacher.user.full_name}`
    : "—";

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

  return (
    <>
      {readonly && <PastSemesterBanner semester={semester} />}
      <Card padding={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
          <p className="text-sm text-zinc-700">
            ครูผู้สอน: <strong>{teacherLabel}</strong>
          </p>
          <Pp5PrintLink
            classroomId={classroomId}
            subjectId={subjectId}
            semester={semester}
          />
        </div>
        <div className="p-3">
          {/* `key` forces remount when offering changes — so useState
              initializers re-read the fresh categories/scores instead of
              stale state from the previous offering. */}
          <ScoreGrid
            key={offering.id}
            categories={categories}
            students={students}
            readonly={readonly}
          />
        </div>
      </Card>
    </>
  );
}

/**
 * Phase 4 — Secondary (มัธยม) score grid section.
 *
 * Fetches the same data as `ScoreGridSection` plus the `grade_scales` table,
 * then renders `SecondaryScoreGrid` which has:
 *  - Grouped column headers (ก่อนกลางภาค / หลังกลางภาค / ปลายภาค)
 *  - Inline "รวม" + "เกรด" columns (per-semester, compute on-the-fly)
 *
 * No separate summary tab — grade renders next to each student row.
 */
async function SecondaryScoreGridSection({
  classroomId,
  subjectId,
  semester,
  readonly,
}: {
  classroomId: string;
  subjectId: string;
  semester: 1 | 2;
  readonly: boolean;
}) {
  const supabase = await createClient();

  const offeringSelect = `
    id,
    teacher:teachers!teacher_id (
      id,
      user:users!user_id (full_name, title)
    )
  `;

  let { data: offering } = await supabase
    .from("subject_offerings")
    .select(offeringSelect)
    .eq("classroom_id", classroomId)
    .eq("subject_id", subjectId)
    .eq("semester", semester)
    .maybeSingle();

  // Auto-heal: mirror teacher from other semester if this one is missing.
  if (!offering) {
    const otherSem = semester === 1 ? 2 : 1;
    const { data: otherOffering } = await supabase
      .from("subject_offerings")
      .select("teacher_id")
      .eq("classroom_id", classroomId)
      .eq("subject_id", subjectId)
      .eq("semester", otherSem)
      .maybeSingle();

    if (otherOffering?.teacher_id) {
      const admin = createAdminClient();
      const { data: created } = await admin
        .from("subject_offerings")
        .insert({
          classroom_id: classroomId,
          subject_id: subjectId,
          teacher_id: otherOffering.teacher_id,
          semester,
        })
        .select(offeringSelect)
        .single();
      offering = created;
    }
  }

  if (!offering) {
    return (
      <Card variant="warning" padding="sm" className="text-sm text-amber-900">
        ⚠️ ภาค {semester} ยังไม่ได้กำหนดครูสำหรับวิชานี้ ·{" "}
        <Link
          href={`/setup/teaching?room=${classroomId}`}
          className="font-medium underline"
        >
          ไปจัดครูเข้าสอน
        </Link>
      </Card>
    );
  }

  // Phase 4 — secondary uses 12-slot layout (with กลางภาค at sort_order 6).
  // Migrates legacy 11-slot data in-place (slot 11→12, slot 6→midterm).
  const slotCategories = await ensureSecondaryCategorySlots(offering.id);
  const categories: Category[] = slotCategories.map((c) => ({
    id: c.id,
    sort_order: c.sort_order,
    max_score: c.max_score,
    is_midterm: c.is_midterm,
    is_final: c.is_final,
  }));

  // SecondaryScoreGridSection always renders for SECONDARY → enrollments
  // scoped to the active semester (1 or 2). The 4th query pulls any
  // ร / มส flags that admin has set against this semester's grade row —
  // displayed in the new "สถานะ" column at the end of the grid.
  const [enrollResult, scoresResult, scalesResult, statusResult] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select(
          `
        student_number,
        student:students!student_id (
          id,
          title,
          first_name,
          last_name
        )
      `,
        )
        .eq("classroom_id", classroomId)
        .eq("semester", semester)
        .order("student_number"),
      supabase
        .from("scores")
        .select("student_id, category_id, score")
        .in(
          "category_id",
          categories.map((c) => c.id),
        ),
      supabase
        .from("grade_scales")
        .select("min_score, max_score, grade, sort_order")
        .order("sort_order"),
      supabase
        .from("grades")
        .select("student_id, is_incomplete, is_no_eligibility")
        .eq("offering_id", offering.id)
        .eq("grading_period", "semester"),
    ]);

  type EnrolledStudent = {
    id: string;
    student_number: number;
    full_label: string;
  };
  const enrolled: EnrolledStudent[] = (enrollResult.data ?? [])
    .filter((e) => e.student)
    .map((e) => ({
      id: e.student!.id,
      student_number: e.student_number,
      full_label: `${abbreviateTitle(e.student!.title)}${e.student!.first_name} ${e.student!.last_name}`,
    }));

  const scoresByStudent = new Map<string, Record<string, number | null>>();
  for (const row of scoresResult.data ?? []) {
    if (!scoresByStudent.has(row.student_id)) {
      scoresByStudent.set(row.student_id, {});
    }
    scoresByStudent.get(row.student_id)![row.category_id] =
      row.score != null ? Number(row.score) : null;
  }

  const students: StudentRow[] = enrolled.map((s) => ({
    id: s.id,
    student_number: s.student_number,
    full_label: s.full_label,
    scores: scoresByStudent.get(s.id) ?? {},
  }));

  const scales = (scalesResult.data ?? []).map((s) => ({
    min_score: Number(s.min_score),
    max_score: Number(s.max_score),
    grade: Number(s.grade),
  }));

  // Initial ร/มส state per student — sourced server-side here, then handed
  // to the client grid as a starting `statusByStudent` map. The grid keeps
  // its own optimistic mirror so the dropdown is responsive while the save
  // action revalidates this server fetch.
  const statusByStudent = new Map<
    string,
    { is_incomplete: boolean; is_no_eligibility: boolean }
  >();
  for (const g of statusResult.data ?? []) {
    statusByStudent.set(g.student_id, {
      is_incomplete: !!g.is_incomplete,
      is_no_eligibility: !!g.is_no_eligibility,
    });
  }
  // Convert to a plain Record so the client component can serialize it
  // through the props boundary (React can't pass Map across server/client).
  const initialStatus: Record<
    string,
    { is_incomplete: boolean; is_no_eligibility: boolean }
  > = {};
  for (const [k, v] of statusByStudent) initialStatus[k] = v;

  const teacherLabel = offering.teacher?.user
    ? `${offering.teacher.user.title ?? ""}${offering.teacher.user.full_name}`
    : "—";

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

  return (
    <>
      {readonly && <PastSemesterBanner semester={semester} />}
      <Card padding={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
          <p className="text-sm text-zinc-700">
            ครูผู้สอน: <strong>{teacherLabel}</strong>
            <span className="ml-3 text-xs text-zinc-500">
              ระบบมัธยม · ตัดเกรดรายภาค
            </span>
          </p>
          <Pp5PrintLink
            classroomId={classroomId}
            subjectId={subjectId}
            semester={semester}
          />
        </div>
        <div className="p-3">
          <SecondaryScoreGrid
            key={offering.id}
            categories={categories}
            students={students}
            scales={scales}
            readonly={readonly}
            offeringId={offering.id}
            initialStatus={initialStatus}
          />
        </div>
      </Card>
    </>
  );
}

/**
 * Per-semester grid for activity subjects (subject.grading_mode = 'pass_fail').
 *
 * Same shell as ScoreGridSection but the body is a `PassFailGrid` (dropdown
 * per student instead of 10+1 score cells). Each row writes to `grades` with
 * grading_period='semester' so the summary tab can read both semesters and
 * compute the annual ผ่าน/ไม่ผ่าน.
 */
export async function PassFailGridSection({
  classroomId,
  subjectId,
  semester,
  isPrimary,
  readonly,
}: {
  classroomId: string;
  subjectId: string;
  semester: 1 | 2;
  isPrimary: boolean;
  readonly: boolean;
}) {
  const supabase = await createClient();

  const offeringSelect = `
    id,
    teacher:teachers!teacher_id (
      id,
      user:users!user_id (
        full_name,
        title
      )
    )
  `;

  // 1. Offering for this (classroom, subject, semester) — same auto-heal as
  // ScoreGridSection: if missing but the other semester has one, mirror it.
  let { data: offering } = await supabase
    .from("subject_offerings")
    .select(offeringSelect)
    .eq("classroom_id", classroomId)
    .eq("subject_id", subjectId)
    .eq("semester", semester)
    .maybeSingle();

  if (!offering) {
    const otherSem = semester === 1 ? 2 : 1;
    const { data: otherOffering } = await supabase
      .from("subject_offerings")
      .select("teacher_id")
      .eq("classroom_id", classroomId)
      .eq("subject_id", subjectId)
      .eq("semester", otherSem)
      .maybeSingle();

    if (otherOffering?.teacher_id) {
      const admin = createAdminClient();
      const { data: created } = await admin
        .from("subject_offerings")
        .insert({
          classroom_id: classroomId,
          subject_id: subjectId,
          teacher_id: otherOffering.teacher_id,
          semester,
        })
        .select(offeringSelect)
        .single();
      offering = created;
    }
  }

  if (!offering) {
    return (
      <Card variant="warning" padding="sm" className="text-sm text-amber-900">
        ⚠️ ภาค {semester} ยังไม่ได้กำหนดครูสำหรับวิชานี้ ·{" "}
        <Link
          href={`/setup/teaching?room=${classroomId}`}
          className="font-medium underline"
        >
          ไปจัดครูเข้าสอน
        </Link>
      </Card>
    );
  }

  // 2. Fetch enrolled students + their current pass/fail for this offering.
  //    Enrollment scope: primary → semester=0 (year-wide), secondary → the
  //    active semester.
  const enrollmentSemester: 0 | 1 | 2 = isPrimary ? 0 : semester;
  const [enrollResult, gradesResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        `
        student_number,
        student:students!student_id (id, title, first_name, last_name)
      `,
      )
      .eq("classroom_id", classroomId)
      .eq("semester", enrollmentSemester)
      .order("student_number"),
    supabase
      .from("grades")
      .select("student_id, pass_fail")
      .eq("offering_id", offering.id)
      .eq("grading_period", "semester"),
  ]);

  const passFailMap = new Map<string, "pass" | "fail">();
  for (const g of gradesResult.data ?? []) {
    if (g.pass_fail === "pass" || g.pass_fail === "fail") {
      passFailMap.set(g.student_id, g.pass_fail);
    }
  }

  const students: PassFailStudent[] = (enrollResult.data ?? [])
    .filter((e) => e.student)
    .map((e) => ({
      id: e.student!.id,
      student_number: e.student_number,
      full_label: `${abbreviateTitle(e.student!.title)}${e.student!.first_name} ${e.student!.last_name}`,
      passFail: passFailMap.get(e.student!.id) ?? "",
    }));

  const teacherLabel = offering.teacher?.user
    ? `${offering.teacher.user.title ?? ""}${offering.teacher.user.full_name}`
    : "—";

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

  // For the bulk-toggle button at top-right: true iff every student is
  // already 'pass'. Drives the button label between "ผ่านทั้งห้อง" / "ล้างทั้งห้อง".
  const allPass =
    students.length > 0 && students.every((s) => s.passFail === "pass");

  return (
    <>
      {readonly && <PastSemesterBanner semester={semester} />}
      <Card padding={false} className="overflow-hidden">
        {/*
          Grid template mirrors the table's <colgroup> (4rem / 12rem / rest),
          so the bulk button sits exactly under the "ผลการประเมิน" column header.
        */}
        <div className="grid items-center border-b border-zinc-200 bg-zinc-50 py-2.5 [grid-template-columns:3rem_9rem_minmax(0,1fr)]">
          <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 px-4">
            <p className="text-sm text-zinc-700">
              ครูผู้สอน: <strong>{teacherLabel}</strong>
              <span className="ml-3 text-xs text-zinc-500">
                วิชากิจกรรม · {readonly ? "ดูได้ แก้ไม่ได้" : "บันทึกอัตโนมัติ"}
              </span>
            </p>
            <Pp5PrintLink
              classroomId={classroomId}
              subjectId={subjectId}
              semester={semester}
            />
          </div>
          <div className="flex justify-center px-3">
            {readonly ? null : (
              <PassFailBulkButton
                classroomId={classroomId}
                offeringId={offering.id}
                allPass={allPass}
              />
            )}
          </div>
        </div>
        <PassFailGrid
          key={offering.id}
          students={students}
          offeringId={offering.id}
          readonly={readonly}
        />
      </Card>
    </>
  );
}
