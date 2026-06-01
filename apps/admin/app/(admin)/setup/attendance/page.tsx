import { createClient } from "@pp5/database/server";
import { Card, PageHeader } from "@pp5/ui";
import { CalendarCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentTerm, semesterStateOf } from "@/lib/current-term";
import { getTeacherScope } from "@/lib/teacher-scope";
import type { AttendanceStatus } from "./actions";
import { DirectPrintButton } from "../../_components/direct-print-button";
import { FilterNavProvider } from "../_components/filter-nav-context";
import { FilterNavGate } from "../_components/filter-nav-gate";
import { OptimisticTabs } from "../_components/optimistic-tabs";
import { AttendanceGrid, type StudentRow } from "./attendance-grid";
import { AttendanceSummarySection } from "./summary-section";
import {
  TERM_MONTHS,
  THAI_MONTH_SHORT,
  daysInMonth as calcDaysInMonth,
  defaultMonthForTerm,
  isMonthInTerm,
  resolveCalendarYear,
  type Term,
} from "./calendar";
import { AttendanceSelector } from "./selector";

export const metadata = {
  title: "ระบบบันทึกผลการเรียนออนไลน์",
};

type TabValue = "1" | "2" | "summary";

/** Abbreviate Thai titles for compact display in the attendance grid. */
function abbreviateTitle(title: string | null | undefined): string {
  if (!title) return "";
  if (title === "เด็กชาย") return "ด.ช.";
  if (title === "เด็กหญิง") return "ด.ญ.";
  if (title === "นางสาว") return "น.ส.";
  return title;
}

type Props = {
  searchParams: Promise<{
    grade?: string;
    room?: string;
    term?: string;
    month?: string;
  }>;
};

export default async function AttendancePage({ searchParams }: Props) {
  const params = await searchParams;
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
          icon={CalendarCheck}
          iconBg="bg-blue-100 text-blue-700"
          title="บันทึกเวลาเรียน"
          description="บันทึกการมาเรียน + วันทำการ ของแต่ละห้อง"
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

  // Teacher scope — daily attendance is homeroom-only for teachers
  // (subject teachers use /setup/attendance/by-subject instead).
  const scope = await getTeacherScope();

  // 2. Classrooms in current year (for selectors)
  // Pull grade_level.system too — primary skips the past-term lock (attendance
  // stays editable across both terms since ประถม cuts grades per year, not
  // per semester), secondary keeps the lock.
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
        sort_order,
        system
      )
    `,
    )
    .eq("academic_year_id", currentYear.id);

  const classrooms = scope
    ? (classroomsRaw ?? []).filter((c) =>
        scope.homeroomClassroomIds.has(c.id),
      )
    : classroomsRaw;

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
        system:
          c.grade_level.system === "secondary" ? "secondary" : "primary",
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
          icon={CalendarCheck}
          iconBg="bg-blue-100 text-blue-700"
          title="บันทึกเวลาเรียน"
          description={`ปีปัจจุบัน ${currentYear.year_be}`}
        />
        <Card variant="dashed" className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            ยังไม่มีห้องเรียนในปีนี้ — สร้างห้องก่อนเพื่อเช็คเวลาเรียน
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

  // 3. Resolve grade + room — don't auto-pick (admin chooses ชั้น then ห้อง
  //    before any attendance grid shows; no auto even for single-room
  //    grades). User spec 2026-05-31.
  const selectedGrade = params.grade
    ? (sortedGrades.find((g) => g.id === params.grade) ?? null)
    : null;
  const roomsInGrade = selectedGrade
    ? (classrooms ?? [])
        .filter((c) => c.grade_level_id === selectedGrade.id)
        .sort((a, b) => a.room_number - b.room_number)
    : [];
  // Single-room grade → auto-pick; multi-room → null until chosen.
  // User spec 2026-05-31 (revised): "ห้องเดียวไม่ต้องเลือก · หลายห้องแสดง
  // dropdown รอ".
  const selectedClassroom = params.room
    ? (roomsInGrade.find((r) => r.id === params.room) ?? null)
    : roomsInGrade.length === 1
      ? roomsInGrade[0]
      : null;

  // Grade not picked, or a multi-room grade with no room chosen yet → show
  // just the selector + a prompt, skipping the term/month tab logic + grid.
  if (!selectedGrade || !selectedClassroom) {
    return (
      <>
        <PageHeader
          icon={CalendarCheck}
          iconBg="bg-blue-100 text-blue-700"
          title="บันทึกเวลาเรียน"
          description="เลือกระดับชั้นและห้องเพื่อเริ่มเช็คเวลาเรียน"
        />
        <FilterNavProvider>
          <Card padding="sm" className="mb-4">
            <AttendanceSelector
              grades={sortedGrades.map((g) => ({
                id: g.id,
                label: g.name_short,
              }))}
              selectedGradeId={selectedGrade?.id ?? ""}
              rooms={roomsInGrade.map((r) => ({
                id: r.id,
                label: `${selectedGrade?.name_short ?? ""}/${r.room_number}`,
              }))}
              selectedRoomId=""
              term="1"
              month={1}
            />
          </Card>
          <Card variant="dashed" className="p-12 text-center">
            <p className="text-sm text-zinc-500">
              {!selectedGrade ? "เลือกระดับชั้นก่อน" : "เลือกห้องเรียนก่อน"}
            </p>
          </Card>
        </FilterNavProvider>
      </>
    );
  }

  // Phase 2.6 — read the school's current term for default tab + lock state
  const currentTerm = await getCurrentTerm();
  const currentSemester: 1 | 2 = currentTerm?.semester ?? 1;
  const defaultTab: TabValue = currentSemester === 2 ? "2" : "1";

  // มัธยมตัดเกรดรายภาค → ดูเฉพาะภาคเรียนปัจจุบัน (ตาม pattern ของ
  // /setup/score-structure) · admin เปลี่ยน term ผ่าน /setup/academic-years
  // เท่านั้น ไม่มี in-page tab switcher
  // ประถมตัดเกรดรายปี → ทั้ง 2 เทอม + summary ใช้งานได้
  const isPrimary = selectedGrade.system === "primary";

  // 4. Resolve term + month from URL — fall back to current_semester for the
  // initial visit (so admin lands directly on the active term).
  // Secondary IGNORES ?term= entirely (always pinned to the active semester).
  const requestedTab: TabValue =
    params.term === "1"
      ? "1"
      : params.term === "2"
        ? "2"
        : params.term === "summary"
          ? "summary"
          : defaultTab;
  const tab: TabValue = !isPrimary ? defaultTab : requestedTab;

  // selectedMonth: 0 = full-year summary tab; -1 = per-term summary
  // (active when the "สรุป" pill is clicked under a term's month tabs).
  let selectedMonth: number;
  let isTermSummary = false;
  if (tab === "summary") {
    selectedMonth = 0;
  } else {
    const termNum = (tab === "2" ? 2 : 1) as Term;
    const parsed = params.month ? Number.parseInt(params.month, 10) : NaN;
    if (parsed === -1) {
      isTermSummary = true;
      selectedMonth = -1;
    } else {
      selectedMonth =
        Number.isFinite(parsed) && isMonthInTerm(parsed, termNum)
          ? parsed
          : defaultMonthForTerm(termNum);
    }
  }

  // Lock state of the active term (summary tab is always viewable)
  const termSemester: 1 | 2 | null =
    tab === "summary" ? null : (tab === "2" ? 2 : 1);
  const rawTermState =
    termSemester === null
      ? "current"
      : semesterStateOf(termSemester, currentTerm);

  // ประถมตัดเกรดรายปี → ทั้ง 2 เทอมแก้ได้ตลอด (past ไม่ถูก lock)
  // มัธยมตัดเกรดรายภาค → past ยังคง readonly ตามเดิม (แต่จริงๆ มัธยมจะไม่
  // เจอ "past" แล้วเพราะ tab ถูก pin ที่ current ด้านบน — เก็บ logic ไว้กัน
  // edge case)
  // We override "past" → "current" for primary so the rest of the page
  // (yellow banner, write guard) treats it as editable. "future" stays as-is
  // since the future-placeholder applies the same way to both systems.
  const termState =
    isPrimary && rawTermState === "past" ? "current" : rawTermState;

  // Pre-built URL helper for tab links
  const buildUrl = (nextTab: TabValue, nextMonth?: number) => {
    const p = new URLSearchParams();
    p.set("grade", selectedGrade.id);
    p.set("room", selectedClassroom.id);
    p.set("term", nextTab);
    if (nextTab !== "summary" && nextMonth != null) {
      p.set("month", String(nextMonth));
    }
    return `/setup/attendance?${p.toString()}`;
  };

  const roomShortLabel =
    roomsInGrade.length > 1
      ? `${selectedGrade.name_short}/${selectedClassroom.room_number}`
      : selectedGrade.name_short;

  return (
    <>
      <PageHeader
        icon={CalendarCheck}
        iconBg="bg-blue-100 text-blue-700"
        title="บันทึกเวลาเรียน"
        description={
          <>
            บันทึกการมาเรียน + วันทำการของห้อง · ปีปัจจุบัน{" "}
            <strong className="font-mono">{currentYear.year_be}</strong>
          </>
        }
      />

      {/* FilterNavProvider wraps the selector + tab/month links + grid so
          changing ชั้น/ห้อง/ภาคเรียน/เดือน paints the loading state at 0ms
          (the grid swaps to <GridLoadingFallback> via <FilterNavGate>). */}
      <FilterNavProvider>
      {/* Top selector card */}
      <Card padding="sm" className="mb-4">
        <AttendanceSelector
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
          term={tab}
          month={selectedMonth}
        />
      </Card>

      {/* Tab Level 1 — primary-only (เทอม 1 / เทอม 2 / สรุปรวม).
          Secondary pins to current_semester (matches /setup/score-structure
          + /setup/students pattern) — no in-page term switcher. */}
      {isPrimary ? (
        <div className="mb-2 flex gap-1 border-b border-zinc-200">
          <OptimisticTabs
            currentTab={tab}
            tabs={(
              [
                { id: "1" as TabValue, sem: 1 as 1 | 2, base: "ภาคเรียนที่ 1" },
                { id: "2" as TabValue, sem: 2 as 1 | 2, base: "ภาคเรียนที่ 2" },
                { id: "summary" as TabValue, sem: null, base: "🏆 สรุปรวม" },
              ]
            ).map((t) => {
              // Same primary override as termState above — ประถมไม่มี 🔒 บน
              // past tab เพราะแก้ได้ตลอดทั้งปี
              const rawState =
                t.sem === null ? "current" : semesterStateOf(t.sem, currentTerm);
              const state =
                isPrimary && rawState === "past" ? "current" : rawState;
              const icon =
                state === "past" ? "🔒 " : state === "future" ? "⏳ " : "";
              const nextMonth =
                t.id === "summary"
                  ? undefined
                  : defaultMonthForTerm(t.id === "2" ? 2 : 1);
              return {
                id: t.id,
                label: `${icon}${t.base}`,
                href: buildUrl(t.id, nextMonth),
              };
            })}
            activeClass="-mb-px border-b-2 border-blue-600 px-4 py-2.5 text-sm font-semibold text-blue-700"
            inactiveClass="-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
          />
        </div>
      ) : (
        // Secondary — show a small bar pointing at /setup/academic-years
        // for switching the active term (no in-page switcher).
        <p className="mb-2 text-xs text-zinc-500">
          กำลังแสดง <strong className="text-zinc-700">ภาคเรียนที่ {currentSemester}</strong>
          {" "}(ภาคเรียนปัจจุบันของโรงเรียน) ·{" "}
          <Link
            href="/setup/academic-years"
            className="font-medium text-blue-700 hover:underline"
          >
            เปลี่ยนภาคเรียนปัจจุบัน
          </Link>
        </p>
      )}

      {/* Tab Level 2 — month tabs (only when term ≠ summary) */}
      {tab !== "summary" && (
        <div className="mb-4 flex flex-wrap gap-1">
          <OptimisticTabs
            currentTab={isTermSummary ? "-1" : String(selectedMonth)}
            tabs={[
              ...TERM_MONTHS[tab === "2" ? 2 : 1].map((m) => ({
                id: String(m),
                label: THAI_MONTH_SHORT[m - 1],
                href: buildUrl(tab, m),
              })),
              // -1 = summary for this term
              { id: "-1", label: "สรุป", href: buildUrl(tab, -1) },
            ]}
            activeClass="rounded-md bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-800 ring-1 ring-blue-300"
            inactiveClass="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
          />
        </div>
      )}

      {/* Body */}
      <Card padding={false} className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-zinc-900">
            ห้อง <span className="text-blue-700">{roomShortLabel}</span> ·{" "}
            {tab === "summary" ? (
              "สรุปรวม"
            ) : isTermSummary ? (
              <>
                ภาคเรียนที่ {tab} · สรุป{" "}
                <span className="text-zinc-500">{currentYear.year_be}</span>
              </>
            ) : (
              <>
                ภาคเรียนที่ {tab} · {THAI_MONTH_SHORT[selectedMonth - 1]}{" "}
                <span className="text-zinc-500">{currentYear.year_be}</span>
              </>
            )}
          </h3>
          {(() => {
            // Build the print URL based on current view
            if (tab === "summary") {
              const url = `/reports/attendance?mode=summary&classroom=${selectedClassroom.id}&year=${currentYear.year_be}`;
              return (
                <DirectPrintButton
                  url={url}
                  title="พิมพ์รายงานสรุปทั้งปี"
                />
              );
            }
            if (isTermSummary) {
              const url = `/reports/attendance?mode=summary&classroom=${selectedClassroom.id}&year=${currentYear.year_be}&term=${tab}`;
              return (
                <DirectPrintButton
                  url={url}
                  title={`พิมพ์รายงานสรุปภาคเรียนที่ ${tab}`}
                />
              );
            }
            // Monthly view
            const url = `/reports/attendance?classroom=${selectedClassroom.id}&year=${currentYear.year_be}&month=${selectedMonth}&term=${tab}`;
            return (
              <DirectPrintButton url={url} title="พิมพ์รายงานเดือนนี้" />
            );
          })()}
        </div>
        {/* Gate the grid (not the header) — header stays put while the grid
            swaps to the spinner the instant a tab/month/selector changes. */}
        <FilterNavGate fallback={<GridLoadingFallback />}>
        {tab === "summary" ? (
          <Suspense
            key={`summary-${selectedClassroom.id}-${currentYear.year_be}`}
            fallback={<GridLoadingFallback />}
          >
            <AttendanceSummarySection
              classroomId={selectedClassroom.id}
              yearBe={currentYear.year_be}
            />
          </Suspense>
        ) : isTermSummary ? (
          <Suspense
            key={`term-summary-${selectedClassroom.id}-${tab}-${currentYear.year_be}`}
            fallback={<GridLoadingFallback />}
          >
            <AttendanceSummarySection
              classroomId={selectedClassroom.id}
              yearBe={currentYear.year_be}
              term={tab === "2" ? 2 : 1}
            />
          </Suspense>
        ) : termState === "future" ? (
          <div className="p-12 text-center">
            <p className="text-sm text-zinc-600">
              ⏳ ยังไม่เริ่ม<strong>ภาคเรียนที่ {tab}</strong>
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              admin เปลี่ยน "ภาคเรียนปัจจุบัน" ที่{" "}
              <Link
                href="/setup/academic-years"
                className="font-medium text-zinc-700 underline"
              >
                /setup/academic-years
              </Link>{" "}
              เพื่อเริ่มภาคเรียนนี้
            </p>
          </div>
        ) : (
          // Suspense + key tied to (room × term × month): unmounts on every
          // change so the spinner fallback shows while the new month's
          // workdays + attendance are fetched.
          <Suspense
            key={`${selectedClassroom.id}-${tab}-${selectedMonth}`}
            fallback={<GridLoadingFallback />}
          >
            <MonthGridSection
              classroomId={selectedClassroom.id}
              yearBe={currentYear.year_be}
              month={selectedMonth}
              term={tab === "2" ? 2 : 1}
              readonly={termState === "past"}
            />
          </Suspense>
        )}
        </FilterNavGate>
      </Card>
      </FilterNavProvider>
    </>
  );
}

/** Spinner placeholder shown inside the Suspense boundary above. */
function GridLoadingFallback() {
  return (
    <div className="flex items-center justify-center gap-3 p-16 text-zinc-400">
      <Loader2 className="size-6 animate-spin" />
      <span className="text-sm">กำลังโหลดข้อมูล…</span>
    </div>
  );
}

/**
 * Fetches enrolled students + workdays + attendance for (classroom, year+month),
 * then renders the interactive AttendanceGrid.
 */
async function MonthGridSection({
  classroomId,
  yearBe,
  month,
  term,
  readonly,
}: {
  classroomId: string;
  yearBe: number;
  month: number;
  term: Term;
  readonly: boolean;
}) {
  const supabase = await createClient();
  const yearCe = resolveCalendarYear(yearBe, month, term);
  const dim = calcDaysInMonth(yearCe, month);
  const monthStart = `${yearCe}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${yearCe}-${String(month).padStart(2, "0")}-${String(dim).padStart(2, "0")}`;

  // Look up classroom's system so we know which semester to filter enrollments
  // by: primary uses year-wide (semester=0), secondary uses the active term.
  const { data: classroomInfo } = await supabase
    .from("classrooms")
    .select(`grade_level:grade_levels!grade_level_id (system)`)
    .eq("id", classroomId)
    .maybeSingle();
  const isSecondary = classroomInfo?.grade_level?.system === "secondary";
  const enrollmentSemester: 0 | 1 | 2 = isSecondary ? term : 0;

  // Parallel: students, workdays, attendance, holidays
  const [enrollResult, workdaysResult, attendanceResult, holidaysResult] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select(
          `
          student_number,
          student:students!student_id (
            id,
            student_code,
            title,
            first_name,
            last_name
          )
        `,
        )
        .eq("classroom_id", classroomId)
        .eq("semester", enrollmentSemester)
        .order("student_number"),
      supabase
        .from("workdays")
        .select("date")
        .eq("classroom_id", classroomId)
        .gte("date", monthStart)
        .lte("date", monthEnd),
      supabase
        .from("attendance")
        .select("student_id, date, status")
        .eq("classroom_id", classroomId)
        .gte("date", monthStart)
        .lte("date", monthEnd),
      supabase
        .from("holidays")
        .select("date, name")
        .gte("date", monthStart)
        .lte("date", monthEnd),
    ]);

  // Build students list — abbreviate common Thai titles for compact display
  const students: StudentRow[] = (enrollResult.data ?? [])
    .filter((e) => e.student)
    .map((e) => ({
      id: e.student!.id,
      student_number: e.student_number,
      student_code: e.student!.student_code,
      full_label: `${abbreviateTitle(e.student!.title)}${e.student!.first_name} ${e.student!.last_name}`,
      statuses: {},
    }));

  // Index workdays by day-of-month
  const workdays: number[] = [];
  for (const w of workdaysResult.data ?? []) {
    const day = Number.parseInt(w.date.slice(8, 10), 10);
    if (Number.isFinite(day)) workdays.push(day);
  }

  // Index attendance: studentId → day → status
  const attMap = new Map<string, Record<number, AttendanceStatus>>();
  for (const a of attendanceResult.data ?? []) {
    const day = Number.parseInt(a.date.slice(8, 10), 10);
    if (!Number.isFinite(day)) continue;
    if (!attMap.has(a.student_id)) attMap.set(a.student_id, {});
    attMap.get(a.student_id)![day] = a.status as AttendanceStatus;
  }
  for (const s of students) {
    s.statuses = attMap.get(s.id) ?? {};
  }

  // Holidays in this month — day-of-month → name (for tooltip)
  const holidayDays: number[] = [];
  const holidayNames: Record<number, string> = {};
  for (const h of holidaysResult.data ?? []) {
    const day = Number.parseInt(h.date.slice(8, 10), 10);
    if (Number.isFinite(day)) {
      holidayDays.push(day);
      holidayNames[day] = h.name;
    }
  }

  return (
    <>
      {readonly && (
        <div className="mx-3 mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span aria-hidden>🔒</span>
          <div>
            <strong>ภาคเรียนที่ {term} ถูกล็อค</strong> · ดูได้ แก้ไม่ได้ · admin
            เปลี่ยน "ภาคเรียนปัจจุบัน" ที่{" "}
            <Link
              href="/setup/academic-years"
              className="font-medium underline"
            >
              /setup/academic-years
            </Link>{" "}
            เพื่อปลดล็อค
          </div>
        </div>
      )}
      <div className="p-3">
        <AttendanceGrid
          key={`${classroomId}-${yearCe}-${month}`}
          classroomId={classroomId}
          yearCe={yearCe}
          month={month}
          daysInMonth={dim}
          workdays={workdays}
          holidayDays={holidayDays}
          holidayNames={holidayNames}
          students={students}
          readonly={readonly}
        />
      </div>
    </>
  );
}
