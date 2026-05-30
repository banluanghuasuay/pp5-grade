import { createClient } from "@pp5/database/server";
import { abbreviateTitle } from "../score-structure/grading-utils";
import { THAI_MONTH_SHORT } from "./calendar";

/**
 * Attendance summary for one classroom.
 *
 *   - `term` undefined → full year (both terms, 11 months, with group headers)
 *   - `term` 1 → เทอม 1 only (6 months)
 *   - `term` 2 → เทอม 2 only (5 months)
 *
 * Each month cell shows the student's "present" count for that month.
 * The first body-section row shows the classroom's workday count per month
 * (similar to the "คะแนนเต็ม" row in ปพ.5).
 */
export async function AttendanceSummarySection({
  classroomId,
  yearBe,
  term,
  padRows,
}: {
  classroomId: string;
  yearBe: number;
  term?: 1 | 2;
  /** Minimum number of student rows to render. If the class has fewer
   *  students than this, blank rows pre-numbered 1..padRows are appended
   *  so the form looks complete for binding (matches the cover subject
   *  table + monthly attendance grid convention). If actual student count
   *  exceeds padRows, all students still show. Undefined = no padding. */
  padRows?: number;
}) {
  const supabase = await createClient();

  // Resolve calendar-year date range from the requested scope
  const yearCe1 = yearBe - 543;
  const yearCe2 = yearCe1 + 1;
  let rangeStart: string;
  let rangeEnd: string;
  if (term === 1) {
    rangeStart = `${yearCe1}-05-01`;
    rangeEnd = `${yearCe1}-10-31`;
  } else if (term === 2) {
    rangeStart = `${yearCe1}-11-01`;
    rangeEnd = `${yearCe2}-03-31`;
  } else {
    rangeStart = `${yearCe1}-05-01`;
    rangeEnd = `${yearCe2}-03-31`;
  }

  // Resolve effective enrollment semester:
  //   - primary  → 0 (year-wide enrollment shows in both terms)
  //   - secondary → if a specific `term` was requested, use it;
  //                  if showing full-year (term undefined), use 1 as fallback
  //                  (the school's current semester is preferred but the
  //                  summary section shows months across both)
  const { data: classroomInfo } = await supabase
    .from("classrooms")
    .select(`grade_level:grade_levels!grade_level_id (system)`)
    .eq("id", classroomId)
    .maybeSingle();
  const isSecondary = classroomInfo?.grade_level?.system === "secondary";
  // Attendance fetch — Supabase PostgREST max-rows defaults to 1000.
  // Term  (6 months × ~120 workdays × 30 students) ≈ 3,600 rows
  // Year (11 months × ~220 workdays × 30 students) ≈ 6,600 rows
  // Both blow past 1000 once data is filled — un-paginated `.select()`
  // would silently drop the tail and skew the per-month counts. Paginate
  // with `.range()` until we get a short page.
  async function fetchAllAttendance() {
    const PAGE = 1000;
    type Row = {
      student_id: string;
      date: string;
      status: "present" | "absent" | "leave" | "sick";
    };
    const all: Row[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("attendance")
        .select("student_id, date, status")
        .eq("classroom_id", classroomId)
        .gte("date", rangeStart)
        .lte("date", rangeEnd)
        .order("date", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) return { data: null, error };
      if (!data || data.length === 0) break;
      all.push(...(data as Row[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return { data: all, error: null };
  }

  // For secondary full-year summary: take the union of sem 1 + sem 2 rosters
  // (so each student is shown only once if they're enrolled in either).
  // Fetch in parallel
  const [enrollResult, workdaysResult, attendanceResult] = await Promise.all([
    isSecondary && term === undefined
      ? supabase
          .from("enrollments")
          .select(
            `
            student_number,
            semester,
            student:students!student_id (
              id, student_code, title, first_name, last_name
            )
          `,
          )
          .eq("classroom_id", classroomId)
          .in("semester", [1, 2])
          .order("student_number")
      : supabase
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
          .eq("semester", isSecondary ? (term ?? 1) : 0)
          .order("student_number"),
    supabase
      .from("workdays")
      .select("date")
      .eq("classroom_id", classroomId)
      .gte("date", rangeStart)
      .lte("date", rangeEnd),
    fetchAllAttendance(),
  ]);

  // For secondary full-year summary, the same student may have 2 enrollment
  // rows (sem 1 + sem 2). Dedupe by student.id, keeping the lowest
  // student_number across rows so display stays stable.
  const studentMap = new Map<
    string,
    {
      id: string;
      student_number: number;
      student_code: string;
      full_label: string;
    }
  >();
  for (const e of enrollResult.data ?? []) {
    if (!e.student) continue;
    const existing = studentMap.get(e.student.id);
    const row = {
      id: e.student.id,
      student_number: e.student_number,
      student_code: e.student.student_code,
      full_label: `${abbreviateTitle(e.student.title)}${e.student.first_name} ${e.student.last_name}`,
    };
    if (!existing || row.student_number < existing.student_number) {
      studentMap.set(e.student.id, row);
    }
  }
  const students = Array.from(studentMap.values()).sort(
    (a, b) => a.student_number - b.student_number,
  );

  // Months in the requested scope (11 if full year, 6/5 if single term)
  const term1Months: number[] = [5, 6, 7, 8, 9, 10];
  const term2Months: number[] = [11, 12, 1, 2, 3];
  const allMonths: number[] =
    term === 1
      ? term1Months
      : term === 2
        ? term2Months
        : [...term1Months, ...term2Months];
  const showGroupHeaders = term === undefined;

  // Workdays per month (1-12)
  const workdaysByMonth: Record<number, number> = {};
  for (const m of allMonths) workdaysByMonth[m] = 0;
  for (const w of workdaysResult.data ?? []) {
    const m = Number.parseInt(w.date.slice(5, 7), 10);
    if (Number.isFinite(m) && m in workdaysByMonth) workdaysByMonth[m]++;
  }

  // Per-student per-month per-status counts
  type Counts = { present: number; absent: number; leave: number; sick: number };
  const emptyCounts = (): Counts => ({
    present: 0,
    absent: 0,
    leave: 0,
    sick: 0,
  });
  const perStudentMonth = new Map<string, Map<number, Counts>>();
  for (const s of students) {
    const inner = new Map<number, Counts>();
    for (const m of allMonths) inner.set(m, emptyCounts());
    perStudentMonth.set(s.id, inner);
  }
  for (const a of attendanceResult.data ?? []) {
    const m = Number.parseInt(a.date.slice(5, 7), 10);
    const inner = perStudentMonth.get(a.student_id);
    if (!inner || !inner.has(m)) continue;
    const c = inner.get(m)!;
    if (a.status === "present") c.present++;
    else if (a.status === "absent") c.absent++;
    else if (a.status === "leave") c.leave++;
    else if (a.status === "sick") c.sick++;
  }

  const totalWorkdays = Object.values(workdaysByMonth).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <div className="overflow-x-auto p-3">
      <table className="att-summary-table">
        <thead>
          {showGroupHeaders ? (
            <tr>
              <th rowSpan={2} className="att-col-num">
                ที่
              </th>
              <th rowSpan={2} className="att-col-name">
                ชื่อ – สกุล
              </th>
              <th colSpan={term1Months.length} className="att-group">
                เทอม 1
              </th>
              <th colSpan={term2Months.length} className="att-group">
                เทอม 2
              </th>
              <th colSpan={5} rowSpan={2} className="att-group">
                สรุป
              </th>
            </tr>
          ) : (
            <tr>
              <th rowSpan={1} className="att-col-num">
                ที่
              </th>
              <th rowSpan={1} className="att-col-name">
                ชื่อ – สกุล
              </th>
              {allMonths.map((m) => (
                <th key={m} className="att-month-head">
                  {THAI_MONTH_SHORT[m - 1]}
                </th>
              ))}
              <th colSpan={5} className="att-group">
                สรุป
              </th>
            </tr>
          )}
          {showGroupHeaders && (
            <tr>
              {allMonths.map((m) => (
                <th key={m} className="att-month-head">
                  {THAI_MONTH_SHORT[m - 1]}
                </th>
              ))}
            </tr>
          )}
          <tr className="att-workday-row">
            <th colSpan={2} className="att-workday-label">
              วันทำการ
            </th>
            {allMonths.map((m) => (
              <th key={`wd-${m}`} className="att-month-cell">
                {workdaysByMonth[m]}
              </th>
            ))}
            <th className="att-sum-col">{totalWorkdays}</th>
            <th className="att-sum-col">มา</th>
            <th className="att-sum-col">ขาด</th>
            <th className="att-sum-col">ลา</th>
            <th className="att-pct-col">ร้อยละ</th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 && !padRows ? (
            <tr>
              <td colSpan={2 + allMonths.length + 5} className="att-empty">
                — ยังไม่มีนักเรียนในห้องนี้ —
              </td>
            </tr>
          ) : (
            (() => {
              // When padRows is set, the table renders at least that many
              // rows: actual students keyed by student_number, plus blank
              // rows (number-only) up to padRows. If actual student count
              // exceeds padRows, all students still show (Math.max).
              const maxStudentNum =
                students.length === 0
                  ? 0
                  : Math.max(...students.map((s) => s.student_number));
              const totalRowCount = padRows
                ? Math.max(padRows, maxStudentNum)
                : students.length;
              return Array.from({ length: totalRowCount }, (_, i) => {
                const rowNum = padRows ? i + 1 : students[i]!.student_number;
                const s = padRows
                  ? students.find((x) => x.student_number === rowNum)
                  : students[i];
                if (!s) {
                  return (
                    <tr key={`pad-${rowNum}`}>
                      <td>{rowNum}</td>
                      <td className="att-name"></td>
                      {allMonths.map((m) => (
                        <td key={m} className="att-month-cell"></td>
                      ))}
                      <td className="att-sum-col"></td>
                      <td className="att-sum-col"></td>
                      <td className="att-sum-col"></td>
                      <td className="att-sum-col"></td>
                      <td className="att-pct-col"></td>
                    </tr>
                  );
                }
                const inner = perStudentMonth.get(s.id)!;
                let totPresent = 0;
                let totAbsent = 0;
                let totLeave = 0;
                for (const m of allMonths) {
                  const c = inner.get(m)!;
                  totPresent += c.present;
                  totAbsent += c.absent;
                  totLeave += c.leave + c.sick;
                }
                const pct =
                  totalWorkdays > 0
                    ? (totPresent / totalWorkdays) * 100
                    : null;
                return (
                  <tr key={s.id}>
                    <td>{rowNum}</td>
                    <td className="att-name">{s.full_label}</td>
                    {allMonths.map((m) => (
                      <td key={m} className="att-month-cell">
                        {inner.get(m)!.present || ""}
                      </td>
                    ))}
                    <td className="att-sum-col">{totalWorkdays}</td>
                    <td className="att-sum-col">
                      <strong>{totPresent}</strong>
                    </td>
                    <td className="att-sum-col">{totAbsent}</td>
                    <td className="att-sum-col">{totLeave}</td>
                    <td className="att-pct-col">
                      {pct == null ? "—" : pct.toFixed(1)}
                    </td>
                  </tr>
                );
              });
            })()
          )}
        </tbody>
      </table>
    </div>
  );
}
