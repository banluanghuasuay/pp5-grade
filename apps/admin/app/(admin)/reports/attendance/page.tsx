import { createClient } from "@pp5/database/server";
import Link from "next/link";
import {
  THAI_DOW,
  THAI_MONTH_FULL,
  daysInMonth as calcDaysInMonth,
  isMonthInTerm,
  resolveCalendarYear,
  type Term,
} from "../../setup/attendance/calendar";
import { abbreviateTitle } from "../../setup/score-structure/grading-utils";
import { AttendanceSummarySection } from "../../setup/attendance/summary-section";
import { PrintButton } from "../pp5/print-button";
import type { Metadata } from "next";
import { currentTermSuffix, reportClassroomLabel } from "@/lib/current-term";

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  // Print-only route (no selector view) → always name it for the saved PDF.
  const p = await searchParams;
  const [suffix, room] = await Promise.all([
    currentTermSuffix(),
    reportClassroomLabel(p.classroom),
  ]);
  return { title: ["รายงานเวลาเรียน", room, suffix].filter(Boolean).join(" ") };
}

type Props = {
  searchParams: Promise<{
    classroom?: string;
    year?: string; // yearBe
    month?: string;
    term?: string;
    /** "summary" → full-year (or per-term) summary; otherwise → monthly grid. */
    mode?: string;
  }>;
};

type AttendanceStatus = "present" | "absent" | "leave" | "sick";

const STATUS_CHAR: Record<AttendanceStatus, string> = {
  present: "/",
  absent: "×",
  leave: "ล",
  sick: "ป",
};

/**
 * Monthly attendance report (one classroom × one month). Renders a
 * print-optimized HTML page; admin uses Ctrl+P to save as PDF or print.
 *
 * Layout — landscape A4 to fit ~31 day-columns + summary columns.
 */
export default async function AttendanceReportPage({ searchParams }: Props) {
  const params = await searchParams;
  const classroomId = params.classroom?.trim();
  const yearBe = params.year ? Number.parseInt(params.year, 10) : NaN;
  const isSummary = params.mode === "summary";

  if (!classroomId || !Number.isFinite(yearBe)) {
    return notFoundPage("URL ไม่ถูกต้อง — ต้องระบุ ?classroom และ ?year");
  }

  // Summary mode — full year (no term param) or per-term (term=1|2)
  if (isSummary) {
    const summaryTermRaw = params.term?.trim();
    const summaryTerm: 1 | 2 | undefined =
      summaryTermRaw === "1" ? 1 : summaryTermRaw === "2" ? 2 : undefined;
    return (
      <SummaryReport
        classroomId={classroomId}
        yearBe={yearBe}
        term={summaryTerm}
      />
    );
  }

  // Monthly mode — needs month + term
  const month = params.month ? Number.parseInt(params.month, 10) : NaN;
  const termRaw = params.term?.trim();
  const term: Term = termRaw === "2" ? 2 : 1;

  if (!Number.isFinite(month) || !isMonthInTerm(month, term)) {
    return notFoundPage(
      "URL ไม่ถูกต้อง — ต้องระบุ ?month และ ?term ที่ถูกต้อง",
    );
  }

  const supabase = await createClient();

  // 1. School info
  const { data: school } = await supabase
    .from("schools")
    .select(
      "name_th, affiliation, logo_url, director_name, director_title, deputy_director_name, assessment_officer_name",
    )
    .limit(1)
    .maybeSingle();

  // 2. Classroom + grade
  const { data: classroom } = await supabase
    .from("classrooms")
    .select(
      `
      id, room_number,
      grade_level:grade_levels!grade_level_id (name_th, system)
    `,
    )
    .eq("id", classroomId)
    .maybeSingle();

  if (!classroom?.grade_level) return notFoundPage("ไม่พบข้อมูลห้องเรียน");

  // 3. Homeroom teachers (both slots — equal status per user spec).
  //    Each filled slot gets its own signature block in the footer.
  const { data: homerooms } = await supabase
    .from("homeroom_assignments")
    .select(
      `role, teacher:teachers!teacher_id ( user:users!user_id (full_name, title) )`,
    )
    .eq("classroom_id", classroomId)
    .order("role");
  const homeroomLabels = (homerooms ?? [])
    .filter((h) => h.teacher?.user)
    .map(
      (h) =>
        `${h.teacher!.user!.title ?? ""}${h.teacher!.user!.full_name}`,
    );

  // 4. Date range for the month
  const yearCe = resolveCalendarYear(yearBe, month, term);
  const dim = calcDaysInMonth(yearCe, month);
  const monthStart = `${yearCe}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${yearCe}-${String(month).padStart(2, "0")}-${String(dim).padStart(2, "0")}`;

  // Resolve enrollment semester scope:
  //   primary  → semester=0 (year-wide)
  //   secondary → the active term (1 or 2)
  const isSecondary = classroom.grade_level.system === "secondary";
  const enrollmentSemester: 0 | 1 | 2 = isSecondary ? term : 0;

  // 5. Parallel fetch — students, workdays, attendance, holidays
  const [enrollResult, workdaysResult, attendanceResult, holidaysResult] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select(
          `
          student_number,
          student:students!student_id (
            id, student_code, title, first_name, last_name
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
        .select("date")
        .gte("date", monthStart)
        .lte("date", monthEnd),
    ]);

  // 6. Build student rows
  const students = (enrollResult.data ?? [])
    .filter((e) => e.student)
    .map((e) => ({
      id: e.student!.id,
      student_number: e.student_number,
      student_code: e.student!.student_code,
      full_label: `${abbreviateTitle(e.student!.title)}${e.student!.first_name} ${e.student!.last_name}`,
    }));

  // Day-of-month sets
  const workdaySet = new Set<number>();
  for (const w of workdaysResult.data ?? []) {
    const d = Number.parseInt(w.date.slice(8, 10), 10);
    if (Number.isFinite(d)) workdaySet.add(d);
  }
  const holidaySet = new Set<number>();
  for (const h of holidaysResult.data ?? []) {
    const d = Number.parseInt(h.date.slice(8, 10), 10);
    if (Number.isFinite(d)) holidaySet.add(d);
  }

  // Attendance map: studentId → day → status
  const attMap = new Map<string, Record<number, AttendanceStatus>>();
  for (const a of attendanceResult.data ?? []) {
    const d = Number.parseInt(a.date.slice(8, 10), 10);
    if (!Number.isFinite(d)) continue;
    if (!attMap.has(a.student_id)) attMap.set(a.student_id, {});
    attMap.get(a.student_id)![d] = a.status as AttendanceStatus;
  }

  // Pre-compute days array + day-of-week + non-workday tints
  const days = Array.from({ length: dim }, (_, i) => i + 1);
  const dowOf = (day: number): string =>
    THAI_DOW[new Date(yearCe, month - 1, day).getDay()];
  const isWeekend = (day: number): boolean => {
    const dow = new Date(yearCe, month - 1, day).getDay();
    return dow === 0 || dow === 6;
  };

  // Per-student totals — count only workdays
  type Counts = { present: number; absent: number; leave: number; sick: number };
  const totalsOf = (sid: string): Counts => {
    const counts: Counts = { present: 0, absent: 0, leave: 0, sick: 0 };
    const map = attMap.get(sid) ?? {};
    for (const d of workdaySet) {
      const s = map[d];
      if (s === "present") counts.present++;
      else if (s === "absent") counts.absent++;
      else if (s === "leave") counts.leave++;
      else if (s === "sick") counts.sick++;
    }
    return counts;
  };

  const info: AttHeaderInfo = {
    schoolName: school?.name_th ?? "—",
    affiliation: school?.affiliation ?? "—",
    logoUrl: school?.logo_url ?? null,
    classLabel: `ชั้น${classroom.grade_level.name_th}/${classroom.room_number}`,
    yearBe,
    semester: term,
    monthLabel: THAI_MONTH_FULL[month - 1],
    workdayCount: workdaySet.size,
    homeroomLabels,
    directorName: school?.director_name ?? "—",
    directorTitle: school?.director_title ?? "ผู้อำนวยการ",
    deputyDirectorName: school?.deputy_director_name ?? null,
    assessmentOfficerName: school?.assessment_officer_name ?? null,
  };

  // Roomy mode: ≤30 students fit in default 30 padded rows → taller rows
  // for easier reading. >30 students → compact mode.
  // 3-tier density (mirrors /reports/pp5 + /reports/student-eval):
  //   ≤30 roomy · 31-35 compact · >35 xcompact
  // User spec 2026-05-22.
  const maxStudentNum =
    students.length === 0
      ? 0
      : Math.max(...students.map((s) => s.student_number));
  const isCompact = maxStudentNum > 30;
  const isXCompact = maxStudentNum > 35;
  const attTableClass = `att-table${
    maxStudentNum <= 30
      ? " att-table--roomy"
      : isXCompact
        ? " att-table--xcompact"
        : ""
  }`;

  return (
    <AttFrame info={info} compact={isCompact} xcompact={isXCompact}>
      <table className={attTableClass}>
        <thead>
          <tr>
            <th rowSpan={3} className="att-col-num">
              ที่
            </th>
            <th rowSpan={3} className="att-col-name">
              ชื่อ – สกุล
            </th>
            <th colSpan={dim} className="att-group">
              วันที่
            </th>
            <th colSpan={4} rowSpan={2} className="att-group">
              สรุป
            </th>
          </tr>
          <tr>
            {days.map((d) => (
              <th
                key={`dow-${d}`}
                className={dayHeadClass(d, workdaySet, holidaySet, isWeekend)}
              >
                {dowOf(d)}
              </th>
            ))}
          </tr>
          <tr>
            {days.map((d) => (
              <th
                key={`day-${d}`}
                className={dayHeadClass(d, workdaySet, holidaySet, isWeekend)}
              >
                {d}
              </th>
            ))}
            <th className="att-col-sum">มา</th>
            <th className="att-col-sum">ขาด</th>
            <th className="att-col-sum">ลา</th>
            <th className="att-col-pct">ร้อยละ</th>
          </tr>
        </thead>
        <tbody>
          {/* Pad rows to PADDED_ROW_COUNT regardless of actual student count
              (per user spec — keeps the printed grid a fixed size for
              binding into the standard ปพ.5 booklet). Each row maps to a
              student by student_number, or stays blank if none matches.
              Same pattern as the score table + weekly attendance grid. */}
          {(() => {
            // Pad to ≥30 rows for binding; expand to fit if class > 30
            // (user spec 2026-05-19: "ถ้านักเรียนมากกว่า 30 คุณไม่แสดงเลย").
            const PADDED_ROW_COUNT =
              students.length === 0
                ? 30
                : Math.max(30, ...students.map((s) => s.student_number));
            return Array.from({ length: PADDED_ROW_COUNT }, (_, i) => {
              const rowNum = i + 1;
              const s =
                students.find((x) => x.student_number === rowNum) ?? null;
              const counts = s ? totalsOf(s.id) : null;
              const map = s ? (attMap.get(s.id) ?? {}) : {};
              const pct =
                s && workdaySet.size > 0 && counts
                  ? (counts.present / workdaySet.size) * 100
                  : null;
              return (
                <tr key={`r-${rowNum}`}>
                  <td>{rowNum}</td>
                  <td className="att-name">{s?.full_label ?? ""}</td>
                  {days.map((d) => {
                    const cls = dayCellClass(
                      d,
                      workdaySet,
                      holidaySet,
                      isWeekend,
                    );
                    const status = s && workdaySet.has(d) ? map[d] : undefined;
                    return (
                      <td key={d} className={cls}>
                        {status ? STATUS_CHAR[status] : ""}
                      </td>
                    );
                  })}
                  <td>
                    {s && counts ? <strong>{counts.present}</strong> : ""}
                  </td>
                  <td>{s && counts ? counts.absent : ""}</td>
                  <td>{s && counts ? counts.leave : ""}</td>
                  <td>{pct == null ? "" : pct.toFixed(1)}</td>
                </tr>
              );
            });
          })()}
        </tbody>
      </table>

      <AttFooter info={info} compact={isCompact} xcompact={isXCompact} />
    </AttFrame>
  );
}

// ===================================================================
// Header + frame
// ===================================================================

type AttHeaderInfo = {
  schoolName: string;
  affiliation: string;
  logoUrl: string | null;
  classLabel: string;
  yearBe: number;
  semester: 1 | 2;
  monthLabel: string;
  workdayCount: number;
  /** Both homeroom teachers (0, 1, or 2 names) — equal status per user
   *  spec, so each filled slot becomes its own signature block. */
  homeroomLabels: string[];
  directorName: string;
  directorTitle: string;
  deputyDirectorName: string | null;
  assessmentOfficerName: string | null;
};

function AttFrame({
  info,
  children,
  compact = false,
  xcompact = false,
}: {
  info: AttHeaderInfo;
  children: React.ReactNode;
  /** When true, applies pp5-header--compact (logo inline with title,
   *  ~60px vertical space reclaimed). Set by callers based on class size. */
  compact?: boolean;
  /** Extra-compact tier on top of `compact` for very large classes. */
  xcompact?: boolean;
}) {
  return (
    <main className="pp5-page att-page">
      <div className="pp5-toolbar no-print">
        <Link href="/setup/attendance" className="pp5-back">
          ← กลับไปหน้าบันทึกเวลาเรียน
        </Link>
        <PrintButton />
      </div>

      <header
        className={`pp5-header${compact ? " pp5-header--compact" : ""}${xcompact ? " pp5-header--xcompact" : ""}`}
      >
        <div className="pp5-title">
          {info.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.logoUrl}
              alt="โลโก้โรงเรียน"
              className="pp5-header-logo"
            />
          )}
          <h1>แบบบันทึกเวลาเรียน {info.classLabel}</h1>
          <p className="pp5-school-name">
            {info.schoolName.startsWith("โรงเรียน")
              ? info.schoolName
              : `โรงเรียน${info.schoolName}`}
          </p>
          <p className="pp5-school-affiliation">สังกัด {info.affiliation}</p>
        </div>

        <div className="pp5-info-grid att-info-grid">
          <div>
            <span className="pp5-label">เดือน</span>
            <strong>{info.monthLabel}</strong>
          </div>
          <div>
            <span className="pp5-label">วันทำการ</span>
            <strong>{info.workdayCount} วัน</strong>
          </div>
          <div>
            <span className="pp5-label">ปีการศึกษา</span>
            <strong>{info.yearBe}</strong>
          </div>
          <div>
            <span className="pp5-label">ภาคเรียนที่</span>
            <strong>{info.semester}</strong>
          </div>
        </div>
      </header>

      {children}
    </main>
  );
}

function AttFooter({
  info,
  compact = false,
  xcompact = false,
}: {
  info: AttHeaderInfo;
  compact?: boolean;
  xcompact?: boolean;
}) {
  // Attendance signers: ครูประจำชั้น (×1-2) → หัวหน้างานวัดผล → (รองผอ.) → ผอ.
  // Per user spec the 2 homeroom slots are EQUAL STATUS, so each filled
  // slot gets its OWN signature block. If both slots are empty, fall
  // back to a single block with "—" so the layout doesn't collapse.
  const signers: Array<{ name: string; role: string }> = [];
  if (info.homeroomLabels.length === 0) {
    signers.push({ name: "—", role: "ครูประจำชั้น" });
  } else {
    for (const name of info.homeroomLabels) {
      signers.push({ name, role: "ครูประจำชั้น" });
    }
  }
  if (info.assessmentOfficerName) {
    signers.push({
      name: info.assessmentOfficerName,
      role: "หัวหน้างานวัดผล",
    });
  }
  if (info.deputyDirectorName) {
    signers.push({
      name: info.deputyDirectorName,
      role: "รองผู้อำนวยการ",
    });
  }
  signers.push({ name: info.directorName, role: info.directorTitle });

  return (
    <footer
      className={`pp5-footer${compact ? " pp5-footer--compact" : ""}${xcompact ? " pp5-footer--xcompact" : ""}`}
    >
      {signers.map((s, i) => (
        <div key={i} className="pp5-sig-block">
          <p>ลงชื่อ .....................................</p>
          <p className="pp5-sig-name">( {s.name} )</p>
          <p>{s.role}</p>
        </div>
      ))}
    </footer>
  );
}

// ===================================================================
// Summary report (full year or per-term)
// ===================================================================

async function SummaryReport({
  classroomId,
  yearBe,
  term,
}: {
  classroomId: string;
  yearBe: number;
  term?: 1 | 2;
}) {
  const supabase = await createClient();

  // School + classroom + homeroom — same fetch shape as monthly
  const [{ data: school }, { data: classroom }, { data: homeroom }] =
    await Promise.all([
      supabase
        .from("schools")
        .select(
          "name_th, affiliation, logo_url, director_name, director_title, deputy_director_name, assessment_officer_name",
        )
        .limit(1)
        .maybeSingle(),
      supabase
        .from("classrooms")
        .select(
          `id, room_number, grade_level:grade_levels!grade_level_id (name_th, system)`,
        )
        .eq("id", classroomId)
        .maybeSingle(),
      supabase
        .from("homeroom_assignments")
        .select(
          `role, teacher:teachers!teacher_id ( user:users!user_id (full_name, title) )`,
        )
        .eq("classroom_id", classroomId)
        .order("role"),
    ]);

  if (!classroom?.grade_level) return notFoundPage("ไม่พบข้อมูลห้องเรียน");

  // Homeroom teachers (both slots — equal status). Each filled slot
  // becomes its own signature block in AttFooter.
  const homeroomLabels = (homeroom ?? [])
    .filter((h) => h.teacher?.user)
    .map(
      (h) =>
        `${h.teacher!.user!.title ?? ""}${h.teacher!.user!.full_name}`,
    );

  const info: AttHeaderInfo = {
    schoolName: school?.name_th ?? "—",
    affiliation: school?.affiliation ?? "—",
    logoUrl: school?.logo_url ?? null,
    classLabel: `ชั้น${classroom.grade_level.name_th}/${classroom.room_number}`,
    yearBe,
    // Re-use field even though "semester" doesn't apply for full-year summary:
    semester: term ?? 1,
    monthLabel: "",
    workdayCount: 0,
    homeroomLabels,
    directorName: school?.director_name ?? "—",
    directorTitle: school?.director_title ?? "ผู้อำนวยการ",
    deputyDirectorName: school?.deputy_director_name ?? null,
    assessmentOfficerName: school?.assessment_officer_name ?? null,
  };

  const scopeLabel =
    term === undefined ? "สรุปทั้งปี" : `สรุปเทอม ${term}`;

  // Extra class flags per-term print → narrower month cols, wider ร้อยละ
  const pageClass = `pp5-page att-page att-summary-page${
    term !== undefined ? " att-summary-term" : ""
  }`;

  return (
    <main className={pageClass}>
      <div className="pp5-toolbar no-print">
        <Link href="/setup/attendance" className="pp5-back">
          ← กลับไปหน้าบันทึกเวลาเรียน
        </Link>
        <PrintButton />
      </div>

      <header className="pp5-header">
        <div className="pp5-title">
          {info.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.logoUrl}
              alt="โลโก้โรงเรียน"
              className="pp5-header-logo"
            />
          )}
          <h1>
            แบบสรุปเวลาเรียน {info.classLabel}
          </h1>
          <p className="pp5-school-name">
            {info.schoolName.startsWith("โรงเรียน")
              ? info.schoolName
              : `โรงเรียน${info.schoolName}`}
          </p>
          <p className="pp5-school-affiliation">สังกัด {info.affiliation}</p>
        </div>

        <div className="pp5-info-grid">
          <div>
            <span className="pp5-label">ขอบเขต</span>
            <strong>{scopeLabel}</strong>
          </div>
          <div>
            <span className="pp5-label">ปีการศึกษา</span>
            <strong>{info.yearBe}</strong>
          </div>
          <div>
            <span className="pp5-label">ครูประจำชั้น</span>
            {/* Both slots joined with " · " — equal status per user spec */}
            <strong>
              {info.homeroomLabels.length > 0
                ? info.homeroomLabels.join(" · ")
                : "—"}
            </strong>
          </div>
        </div>
      </header>

      <AttendanceSummarySection
        classroomId={classroomId}
        yearBe={yearBe}
        term={term}
      />

      <AttFooter info={info} />
    </main>
  );
}

// ===================================================================
// Helpers
// ===================================================================

function notFoundPage(message: string) {
  return (
    <main className="mx-auto max-w-3xl p-8 text-sm text-zinc-700">
      <p>⚠️ {message}</p>
      <p className="mt-2">
        <Link href="/setup/attendance" className="font-medium underline">
          กลับไปหน้าบันทึกเวลาเรียน
        </Link>
      </p>
    </main>
  );
}

/** Header cell class for a single day-of-month — tints non-workdays. */
function dayHeadClass(
  day: number,
  workdaySet: Set<number>,
  holidaySet: Set<number>,
  isWeekend: (d: number) => boolean,
): string {
  if (!workdaySet.has(day)) {
    if (holidaySet.has(day)) return "att-day-head att-holiday";
    if (isWeekend(day)) return "att-day-head att-weekend";
    return "att-day-head att-nonwork";
  }
  return "att-day-head";
}

/** Body cell class for a single day-of-month. */
function dayCellClass(
  day: number,
  workdaySet: Set<number>,
  holidaySet: Set<number>,
  isWeekend: (d: number) => boolean,
): string {
  if (!workdaySet.has(day)) {
    if (holidaySet.has(day)) return "att-day att-holiday";
    if (isWeekend(day)) return "att-day att-weekend";
    return "att-day att-nonwork";
  }
  return "att-day";
}
