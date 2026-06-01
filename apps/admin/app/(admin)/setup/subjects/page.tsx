import { createAdminClient } from "@pp5/database/admin";
import { createClient } from "@pp5/database/server";
import { Badge, Card, PageHeader } from "@pp5/ui";
import { BookOpen, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/teacher-scope";
import { FilterNavProvider } from "../_components/filter-nav-context";
import { ensureDefaultPlan, ensureRoomsLinked } from "./actions";
import { CloneSubjectsDialog } from "./clone-subjects-dialog";
import { CopyPlanButton } from "./copy-plan-button";
import { DeletePlanForm } from "./delete-plan-form";
import { DeleteSubjectForm } from "./delete-subject-form";
import { GradeRoomSelector } from "./grade-room-selector";
import { NavigationGate } from "./navigation-gate";
import { SubjectsSkeleton } from "./subjects-skeleton";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

const CATEGORY_LABEL: Record<string, string> = {
  core: "พื้นฐาน",
  additional: "เพิ่มเติม",
  activity: "กิจกรรม",
};

const CATEGORY_VARIANT: Record<
  string,
  "info" | "success" | "warning" | "neutral"
> = {
  core: "info",
  additional: "success",
  activity: "warning",
};

// Sort categories: พื้นฐาน → เพิ่มเติม → กิจกรรม
const CATEGORY_ORDER: Record<string, number> = {
  core: 1,
  additional: 2,
  activity: 3,
};

/** Display the hours/credits cell — different units per
 *  (system, category) per สพฐ. หลักสูตรแกนกลาง 2551:
 *    primary  core/additional → "X ชม./ปี"     (hours_per_year)
 *    primary  activity        → "X ชม./ปี"     (hours_per_year)
 *    secondary core/additional → "X"           (credit_hours, plain number)
 *    secondary activity       → "X ชม./ภาค"   (hours_per_year)
 *  User spec 2026-05-22 — column header is also swapped (see below)
 *  so primary plans never display "หน่วยกิต" anywhere. */
function formatHours(
  subject: {
    category: string;
    credit_hours: number | null;
    hours_per_year: number | null;
  },
  isPrimary: boolean,
): string {
  if (isPrimary) {
    return subject.hours_per_year != null
      ? `${subject.hours_per_year} ชม./ปี`
      : "—";
  }
  // Secondary
  if (subject.category === "activity") {
    return subject.hours_per_year != null
      ? `${subject.hours_per_year} ชม./ภาค`
      : "—";
  }
  return subject.credit_hours != null ? `${subject.credit_hours}` : "—";
}

type Props = { searchParams: Promise<{ grade?: string; plan?: string }> };

export default async function SubjectsPage({ searchParams }: Props) {
  await requireAdmin();
  const { grade: gradeParam, plan: planParam } = await searchParams;
  const supabase = await createClient();

  // 1. Resolve current academic year (+ semester) + check if a previous year
  //    exists (so the "นำเข้าจากปีที่แล้ว" button can hide itself when there's
  //    nothing to import from).
  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("id, year_be, current_semester")
    .eq("is_current", true)
    .maybeSingle();

  let previousYearExists = false;
  if (currentYear) {
    const { data: prevYear } = await supabase
      .from("academic_years")
      .select("id")
      .eq("year_be", currentYear.year_be - 1)
      .maybeSingle();
    previousYearExists = !!prevYear;
  }

  // 2. Find "open" grades = grade_levels that have classrooms in current year
  type OpenGrade = {
    id: string;
    name_short: string;
    name_th: string;
    sort_order: number;
    system: "primary" | "secondary";
  };
  let openGrades: OpenGrade[] = [];
  if (currentYear) {
    const { data: classrooms } = await supabase
      .from("classrooms")
      .select(
        `
        grade_level_id,
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

    const seen = new Map<string, OpenGrade>();
    for (const c of classrooms ?? []) {
      if (c.grade_level && !seen.has(c.grade_level.id)) {
        seen.set(c.grade_level.id, {
          id: c.grade_level.id,
          name_short: c.grade_level.name_short,
          name_th: c.grade_level.name_th,
          sort_order: c.grade_level.sort_order,
          system:
            c.grade_level.system === "secondary" ? "secondary" : "primary",
        });
      }
    }
    openGrades = Array.from(seen.values()).sort(
      (a, b) => a.sort_order - b.sort_order,
    );
  }

  // 3. Empty states: no current year OR no classrooms in current year
  if (!currentYear) {
    return (
      <>
        <PageHeader
          icon={BookOpen}
          iconBg="bg-amber-100 text-amber-700"
          title="จัดการวิชา"
          description="แผนการเรียน + รายวิชาในหลักสูตร"
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
  if (openGrades.length === 0) {
    return (
      <>
        <PageHeader
          icon={BookOpen}
          iconBg="bg-amber-100 text-amber-700"
          title="จัดการวิชา"
          description={`ปีปัจจุบัน ${currentYear.year_be}`}
        />
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            ยังไม่มีห้องเรียนในปีนี้ — สร้างห้องก่อนเพื่อกำหนดแผนการเรียน
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

  // 4. Pick selected grade — select-first: no auto-pick, admin must choose.
  const selectedGrade = gradeParam
    ? (openGrades.find((g) => g.id === gradeParam) ?? null)
    : null;

  // EARLY GUARD — pick ชั้น before showing or auto-creating any plan/subjects.
  if (!selectedGrade) {
    return (
      <>
        <PageHeader
          icon={BookOpen}
          iconBg="bg-amber-100 text-amber-700"
          title="จัดการวิชา"
          description={
            <>
              แผนการเรียน + รายวิชาในหลักสูตร · ปีปัจจุบัน{" "}
              <strong className="font-mono">{currentYear.year_be}</strong>
            </>
          }
        />
        <FilterNavProvider>
          <div className="mb-6">
            <GradeRoomSelector
              grades={openGrades.map((g) => ({ id: g.id, label: g.name_short }))}
              selectedGradeId=""
              rooms={[]}
              selectedPlanId=""
            />
          </div>
          <Card variant="dashed" className="p-12 text-center">
            <p className="text-sm text-zinc-500">เลือกระดับชั้นก่อน</p>
          </Card>
        </FilterNavProvider>
      </>
    );
  }

  // Effective semester scope for subjects shown on this page:
  //   primary  → 0 (year-wide)
  //   secondary → academic_year.current_semester (1 or 2)
  const currentSemester: 1 | 2 =
    currentYear.current_semester === 2 ? 2 : 1;
  const effectiveSemester: 0 | 1 | 2 =
    selectedGrade.system === "secondary" ? currentSemester : 0;

  // 5. Auto-create "ทั่วไป" plan if no plans exist for this grade,
  //    then backfill any unassigned rooms in this grade to point at it
  const defaultPlanId = await ensureDefaultPlan(selectedGrade.id);
  if (defaultPlanId) {
    await ensureRoomsLinked(selectedGrade.id, currentYear.id, defaultPlanId);
  }

  // 6. Fetch plans + subject counts (for left column).
  //    Counts only include subjects scoped to the current (year, semester).
  const admin = createAdminClient();
  const { data: plans } = await admin
    .from("study_plans")
    .select(
      `
      id,
      name,
      description,
      is_default,
      study_plan_subjects (
        subject:subjects!subject_id (
          credit_hours,
          academic_year_id,
          semester
        )
      )
    `,
    )
    .eq("grade_level_id", selectedGrade.id);

  const sortedPlans = (plans ?? []).slice().sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return a.name.localeCompare(b.name, "th");
  });

  // 7. Pick selected plan
  const selectedPlan =
    sortedPlans.find((p) => p.id === planParam) ??
    sortedPlans.find((p) => p.is_default) ??
    sortedPlans[0];

  // 8. Subjects table data is fetched LAZILY inside `<PlanSubjectsTable>`
  //    below, wrapped in <Suspense> with a key tied to (grade, plan).
  //    When admin switches grade or plan in the selector, navigation
  //    swaps the key → React unmounts the old subtree and shows the
  //    spinner fallback until the new RSC query resolves. User spec
  //    2026-05-22: "ขณะที่เลือกชั้นให้แสดง spinner กำลังโหลด".

  // Subject count per plan — also scoped to current (year, semester).
  const subjectCountByPlan = new Map(
    sortedPlans.map((p) => [
      p.id,
      (p.study_plan_subjects ?? []).filter(
        (sps) =>
          sps.subject?.academic_year_id === currentYear.id &&
          sps.subject?.semester === effectiveSemester,
      ).length,
    ]),
  );

  return (
    <>
      <PageHeader
        icon={BookOpen}
        iconBg="bg-amber-100 text-amber-700"
        title="จัดการวิชา"
        description={
          <>
            แผนการเรียน + รายวิชาในหลักสูตร · ปีปัจจุบัน{" "}
            <strong className="font-mono">{currentYear.year_be}</strong>
          </>
        }
      />

      {/* FilterNavProvider wraps BOTH the selector (calls startNav) and the
          gate (reads pending) so a grade/room change paints the skeleton
          instantly. */}
      <FilterNavProvider>
      {/* Grade selector only — plans are per-grade, room dropdown not needed here */}
      <div className="mb-6">
        <GradeRoomSelector
          grades={openGrades.map((g) => ({ id: g.id, label: g.name_short }))}
          selectedGradeId={selectedGrade.id}
          rooms={[]}
          selectedPlanId={selectedPlan.id}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* ===== LEFT: Plans column ===== */}
        <Card padding={false} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-zinc-900">
              แผนของชั้น{" "}
              <span className="text-amber-700">{selectedGrade.name_short}</span>
            </h3>
            <span className="text-xs text-zinc-500">{sortedPlans.length}</span>
          </div>

          <div className="space-y-2 p-3">
            {sortedPlans.map((p) => {
              const isActive = p.id === selectedPlan.id;
              const subjectCount = subjectCountByPlan.get(p.id) ?? 0;
              const wrapClass = isActive
                ? "flex rounded-md border-2 border-amber-400 bg-amber-50 shadow-sm"
                : "flex rounded-md border border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50";
              return (
                <div key={p.id} className={wrapClass}>
                  <Link
                    href={`/setup/subjects?grade=${selectedGrade.id}&plan=${p.id}`}
                    className="min-w-0 flex-1 p-3"
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      <p
                        className={
                          isActive
                            ? "font-semibold text-amber-900"
                            : "font-medium text-zinc-900"
                        }
                      >
                        {p.name}
                      </p>
                      {p.is_default && (
                        <Badge variant="info">default</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {subjectCount} วิชา
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-0.5 pr-2">
                    <Link
                      href={`/setup/subjects/plans/${p.id}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-primary-600"
                      title="แก้ไขแผน"
                      aria-label={`แก้ไขแผน ${p.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <DeletePlanForm
                      planId={p.id}
                      gradeLevelId={selectedGrade.id}
                      planName={p.name}
                      subjectCount={subjectCount}
                    />
                  </div>
                </div>
              );
            })}

            <Link
              href={`/setup/subjects/plans/new?grade=${selectedGrade.id}`}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" />
              สร้างแผนใหม่
            </Link>
          </div>
        </Card>

        {/* ===== RIGHT: Subjects in selected plan ===== */}
        <Card padding={false} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
            <h3 className="truncate text-sm font-semibold text-zinc-900">
              แผน{selectedPlan.name} {selectedGrade.name_short}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              {/* Clone subjects from previous year — opens a preview dialog
                  with per-row checkboxes + conflict markers before commit.
                  Hidden when there's no previous year in the system yet. */}
              {previousYearExists && (
                <CloneSubjectsDialog
                  gradeLevelId={selectedGrade.id}
                  planId={selectedPlan.id}
                  gradeShort={selectedGrade.name_short}
                  planName={selectedPlan.name}
                  sourcePlans={sortedPlans.map((p) => ({
                    id: p.id,
                    name: p.name,
                  }))}
                />
              )}
              <CopyPlanButton
                targetId={selectedPlan.id}
                targetName={selectedPlan.name}
                gradeShort={selectedGrade.name_short}
                sources={sortedPlans
                  .filter((p) => p.id !== selectedPlan.id)
                  .map((p) => ({
                    id: p.id,
                    name: p.name,
                    subjectCount: subjectCountByPlan.get(p.id) ?? 0,
                  }))}
              />
              <Link
                href={`/setup/subjects/new?grade=${selectedGrade.id}&plan=${selectedPlan.id}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-primary-700"
              >
                <Plus className="h-3.5 w-3.5" />
                เพิ่มวิชา
              </Link>
            </div>
          </div>

          <NavigationGate>
            <Suspense
              key={`subjects-${selectedGrade.id}-${selectedPlan.id}`}
              fallback={<SubjectsSkeleton />}
            >
              <PlanSubjectsTable
                planId={selectedPlan.id}
                gradeId={selectedGrade.id}
                isPrimary={selectedGrade.system === "primary"}
                yearId={currentYear.id}
                effectiveSemester={effectiveSemester}
              />
            </Suspense>
          </NavigationGate>
        </Card>
      </div>
      </FilterNavProvider>
    </>
  );
}

/**
 * Lazily-loaded async section — fetches the subjects for the selected
 * plan and renders the table (or an empty-state CTA). Living here lets
 * the parent's `<Suspense key>` switch trigger a fresh load with the
 * loading spinner each time admin picks a different grade/plan.
 */
async function PlanSubjectsTable({
  planId,
  gradeId,
  isPrimary,
  yearId,
  effectiveSemester,
}: {
  planId: string;
  gradeId: string;
  isPrimary: boolean;
  yearId: string;
  effectiveSemester: 0 | 1 | 2;
}) {
  const admin = createAdminClient();

  const { data: planSubjects } = await admin
    .from("study_plan_subjects")
    .select(
      `
      id,
      sort_order,
      subject:subjects!subject_id (
        id,
        code,
        name_th,
        category,
        credit_hours,
        hours_per_year,
        is_active,
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
    .eq("study_plan_id", planId);

  const subjectRows = (planSubjects ?? [])
    .map((sps) => sps.subject)
    .filter((s): s is NonNullable<typeof s> => !!s)
    .filter(
      (s) =>
        s.academic_year_id === yearId && s.semester === effectiveSemester,
    )
    .sort((a, b) => {
      const ac = CATEGORY_ORDER[a.category] ?? 99;
      const bc = CATEGORY_ORDER[b.category] ?? 99;
      if (ac !== bc) return ac - bc;
      const al = a.learning_area?.sort_order ?? 999;
      const bl = b.learning_area?.sort_order ?? 999;
      if (al !== bl) return al - bl;
      return a.code.localeCompare(b.code, "th");
    });

  if (subjectRows.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-zinc-500">
        ยังไม่มีวิชาในแผนนี้ —{" "}
        <Link
          href={`/setup/subjects/new?grade=${gradeId}&plan=${planId}`}
          className="font-medium text-zinc-900 underline"
        >
          เพิ่มวิชาแรก
        </Link>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-zinc-200 bg-white text-left text-xs uppercase tracking-wide text-zinc-500">
        <tr>
          <th className="px-2 py-2.5 text-center font-medium sm:px-4">ที่</th>
          {/* Mobile: รหัส + ชื่อ รวมในคอลัมน์เดียว (stacked) ·
              Desktop (md+): แยก 2 คอลัมน์เหมือนเดิม.
              User spec 2026-05-22. */}
          <th className="px-2 py-2.5 font-medium sm:px-4 md:hidden">
            รหัส / ชื่อรายวิชา
          </th>
          <th className="hidden px-4 py-2.5 font-medium md:table-cell">
            รหัส
          </th>
          <th className="hidden px-4 py-2.5 font-medium md:table-cell">
            ชื่อรายวิชา
          </th>
          {/* Mobile: ชั่วโมง/ปี (หรือหน่วยกิต) + ประเภท รวมกัน · Desktop: แยก. */}
          <th className="px-2 py-2.5 text-center font-medium sm:px-4 md:hidden">
            {isPrimary ? "ชม./ปี · ประเภท" : "หน่วยกิต · ประเภท"}
          </th>
          <th className="hidden px-4 py-2.5 text-center font-medium md:table-cell">
            {isPrimary ? "ชั่วโมง/ปี" : "หน่วยกิต"}
          </th>
          <th className="hidden px-4 py-2.5 font-medium md:table-cell">
            ประเภท
          </th>
          <th className="px-2 py-2.5 text-right font-medium sm:px-4">จัดการ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-200">
        {subjectRows.map((s, i) => (
          <tr key={s.id} className="hover:bg-zinc-50">
            <td className="px-2 py-2 text-center font-sans text-xs tabular-nums text-zinc-500 sm:px-4">
              {i + 1}
            </td>
            {/* Mobile combined: code (above) + name (below) */}
            <td className="px-2 py-2 sm:px-4 md:hidden">
              <div className="font-mono text-xs text-primary-700">
                {s.code}
              </div>
              <div className="mt-0.5 font-medium text-zinc-900">
                {s.name_th}
              </div>
            </td>
            {/* Desktop separate */}
            <td className="hidden px-4 py-2 font-mono text-xs text-primary-700 md:table-cell">
              {s.code}
            </td>
            <td className="hidden px-4 py-2 font-medium text-zinc-900 md:table-cell">
              {s.name_th}
            </td>
            {/* Mobile combined: hours (above) + category badge (below) */}
            <td className="px-2 py-2 text-center sm:px-4 md:hidden">
              <div className="font-sans text-xs tabular-nums text-zinc-700">
                {formatHours(s, isPrimary)}
              </div>
              <div className="mt-1">
                <Badge variant={CATEGORY_VARIANT[s.category] ?? "neutral"}>
                  {CATEGORY_LABEL[s.category] ?? s.category}
                </Badge>
              </div>
            </td>
            {/* Desktop separate */}
            <td className="hidden px-4 py-2 text-center font-sans text-xs tabular-nums text-zinc-700 md:table-cell">
              {formatHours(s, isPrimary)}
            </td>
            <td className="hidden px-4 py-2 md:table-cell">
              <Badge variant={CATEGORY_VARIANT[s.category] ?? "neutral"}>
                {CATEGORY_LABEL[s.category] ?? s.category}
              </Badge>
            </td>
            <td className="px-2 py-2 text-right sm:px-4">
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`/setup/subjects/${s.id}?grade=${gradeId}&plan=${planId}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-primary-600"
                  title="แก้ไข"
                  aria-label={`แก้ไข ${s.code}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <DeleteSubjectForm
                  subjectId={s.id}
                  subjectLabel={`${s.code} ${s.name_th}`}
                  gradeLevelId={gradeId}
                  planId={planId}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
