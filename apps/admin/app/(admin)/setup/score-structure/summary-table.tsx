"use client";

import { useTransition } from "react";
import { DirectPrintButton } from "../../_components/direct-print-button";
import { setGradeSpecialStatus } from "./actions";

/**
 * Phase 2.4 — Summary table (สรุปผล/ตัดเกรด).
 *
 * Two display modes via a discriminated union:
 *   - `numeric`  : computed totals + cut grade with a small dropdown per
 *                  row to override the grade with "ร" / "มส". The numeric
 *                  value is derived purely from the `scores` table every
 *                  render; only the special-status flag is persisted, so the
 *                  computed grade can't drift from its source.
 *   - `pass_fail`: READ-ONLY summary aggregated from both semesters' rows.
 *                  Save happens on each semester's tab, not here.
 */

export type SummaryRowNumeric = {
  id: string;
  student_number: number;
  /** รหัสประจำตัวนักเรียน (from enrollments.student_code) */
  student_code: string;
  full_label: string;
  /** Phase 2.6: null when the semester is in the future (currentSemester < n). */
  total1: number | null;
  total2: number | null;
  /** Composite of both semesters — null if either is null. */
  finalScore: number | null;
  /** Cut from finalScore — null if finalScore is null. */
  grade: number | null;
  /** ร — รอประเมิน. When true, the grade cell shows "ร" instead of the number. */
  is_incomplete: boolean;
  /** มส — มีเวลาเรียนไม่ครบ. Same idea — overrides the displayed grade. */
  is_no_eligibility: boolean;
};

export type SummaryRowPassFail = {
  id: string;
  student_number: number;
  full_label: string;
  /** ภาคเรียนที่ 1 ผลการประเมิน (null = ยังไม่บันทึก) */
  sem1: "pass" | "fail" | null;
  /** ภาคเรียนที่ 2 ผลการประเมิน */
  sem2: "pass" | "fail" | null;
  /** ผลรวมทั้งปี: both 'pass' → 'pass'; either 'fail' → 'fail'; any null → null */
  result: "pass" | "fail" | null;
};

type Props =
  | {
      mode: "numeric";
      students: SummaryRowNumeric[];
      isPrimary: boolean;
      subjectLabel: string;
      teacherLabel: string | null;
      /** Anchor offering — used for ร/มส save (annual grades attach here). */
      offeringId: string;
      /** "annual" for primary, "semester" for secondary — matches the row
       *  the summary section reads. */
      gradingPeriod: "annual" | "semester";
      /** Used to build the "พิมพ์รายงาน" link (passed straight to the
       *  print route — no JS needed). */
      classroomId: string;
      subjectId: string;
    }
  | {
      mode: "pass_fail";
      students: SummaryRowPassFail[];
      subjectLabel: string;
      teacherLabel: string | null;
    };

export function SummaryTable(props: Props) {
  return props.mode === "pass_fail" ? (
    <PassFailTable {...props} />
  ) : (
    <NumericTable {...props} />
  );
}

// ===================================================================
// NUMERIC TABLE  (พื้นฐาน / เพิ่มเติม)
// ===================================================================

function NumericTable(props: Extract<Props, { mode: "numeric" }>) {
  const {
    students,
    subjectLabel,
    teacherLabel,
    isPrimary,
    offeringId,
    gradingPeriod,
    classroomId,
    subjectId,
  } = props;

  // Distribution buckets — only "decided" grades count toward the
  // pass/fail tally. A student with ร or มส is "decided" too: ร counts as
  // pending (still waiting), มส counts as ไม่ผ่าน (no eligibility = fail).
  const finalizedGrades = students
    .filter((s) => !s.is_incomplete && !s.is_no_eligibility)
    .map((s) => s.grade)
    .filter((g): g is number => g !== null);
  const dist = countGrades(finalizedGrades);
  const total = students.length;
  const passing = students.filter(
    (s) => !s.is_incomplete && !s.is_no_eligibility && s.grade !== null && s.grade >= 1,
  ).length;
  const failing = students.filter(
    (s) => s.is_no_eligibility || (!s.is_incomplete && s.grade !== null && s.grade < 1),
  ).length;
  const pending = students.filter(
    (s) => s.is_incomplete || (!s.is_no_eligibility && s.grade === null),
  ).length;
  const rCount = students.filter((s) => s.is_incomplete).length;
  const msCount = students.filter((s) => s.is_no_eligibility).length;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <TableHeader
        subjectLabel={subjectLabel}
        teacherLabel={teacherLabel}
        meta={
          <span className="text-xs text-zinc-500">
            {isPrimary ? "ประถม · ตัดเกรดรายปี" : "มัธยม · ตัดเกรดรายภาค"}
          </span>
        }
        action={
          // Use the same DirectPrintButton helper that sem1/sem2 use — it
          // loads the report into a hidden iframe and triggers print()
          // on that iframe, so the user gets the print dialog WITHOUT a
          // preview tab opening first. Same UX as the sem1/sem2 buttons.
          <DirectPrintButton
            url={`/reports/grade-summary?classroom=${classroomId}&subject=${subjectId}`}
            title="พิมพ์รายงานสรุปผล"
          />
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">เลขที่</th>
              <th className="px-3 py-2.5 text-left font-medium">รหัส</th>
              <th className="px-3 py-2.5 text-left font-medium">ชื่อ-สกุล</th>
              <th className="px-3 py-2.5 text-center font-medium">
                ภาคเรียนที่ 1
              </th>
              <th className="px-3 py-2.5 text-center font-medium">
                ภาคเรียนที่ 2
              </th>
              <th className="px-3 py-2.5 text-center font-medium">
                {isPrimary ? "เฉลี่ยรายปี" : "รวม"}
              </th>
              <th className="px-3 py-2.5 text-center font-medium">เกรด</th>
              <th className="px-3 py-2.5 text-center font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
                <tr
                  key={s.id}
                  className={
                    i % 2 === 0
                      ? "bg-white hover:bg-zinc-50"
                      : "bg-zinc-50/50 hover:bg-zinc-100/60"
                  }
                >
                  <td className="px-3 py-2 text-zinc-600 tabular-nums">
                    {s.student_number}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-zinc-600">
                    {s.student_code}
                  </td>
                  <td className="px-3 py-2">{s.full_label}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-zinc-700">
                    {formatScore(s.total1)}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums text-zinc-700">
                    {formatScore(s.total2)}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums font-medium">
                    {formatScore(s.finalScore)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <GradeOrStatusPill
                      grade={s.grade}
                      isIncomplete={s.is_incomplete}
                      isNoEligibility={s.is_no_eligibility}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StatusDropdown
                      studentId={s.id}
                      offeringId={offeringId}
                      gradingPeriod={gradingPeriod}
                      current={
                        s.is_incomplete
                          ? "incomplete"
                          : s.is_no_eligibility
                            ? "no_eligibility"
                            : ""
                      }
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/50 px-4 py-3 text-xs text-zinc-600">
        <div className="space-y-1">
          <div>
            ผ่าน <strong className="text-emerald-700">{passing}</strong> /{" "}
            ไม่ผ่าน <strong className="text-rose-700">{failing}</strong>
            {pending > 0 ? (
              <>
                {" "}/ รอครบภาค{" "}
                <strong className="text-zinc-500">{pending}</strong>
              </>
            ) : null}
            {rCount > 0 ? (
              <>
                {" "}/ ร <strong className="text-amber-700">{rCount}</strong>
              </>
            ) : null}
            {msCount > 0 ? (
              <>
                {" "}/ มส <strong className="text-rose-700">{msCount}</strong>
              </>
            ) : null}{" "}
            / ทั้งหมด {total}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {GRADES.map((g) => (
              <span key={g} className="tabular-nums">
                {formatGrade(g)}: <strong>{dist.get(g) ?? 0}</strong>
              </span>
            ))}
          </div>
        </div>
        <span className="text-[11px] italic text-zinc-400">
          เกรดคำนวณจากคะแนนอัตโนมัติ · ปรับสถานะ ร/มส ได้ที่คอลัมน์ขวาสุด
        </span>
      </div>
    </div>
  );
}

/** Dropdown to toggle ร / มส per student. Saves immediately on change
 *  via the `setGradeSpecialStatus` server action. The page re-validates
 *  on revalidatePath, refreshing the row. */
function StatusDropdown({
  studentId,
  offeringId,
  gradingPeriod,
  current,
}: {
  studentId: string;
  offeringId: string;
  gradingPeriod: "annual" | "semester";
  current: "" | "incomplete" | "no_eligibility";
}) {
  const [pending, start] = useTransition();
  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        const fd = new FormData();
        fd.set("student_id", studentId);
        fd.set("offering_id", offeringId);
        fd.set("grading_period", gradingPeriod);
        fd.set("status", next);
        start(() => {
          setGradeSpecialStatus(fd).catch((err) => {
            // eslint-disable-next-line no-console
            console.error("save special status failed", err);
            alert("บันทึกสถานะไม่สำเร็จ: " + (err?.message ?? err));
          });
        });
      }}
      className={`rounded-md border px-2 py-1 text-xs ${
        pending
          ? "border-zinc-200 bg-zinc-100 text-zinc-400"
          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
      }`}
    >
      <option value="">— ปกติ —</option>
      <option value="incomplete">ร (รอประเมิน)</option>
      <option value="no_eligibility">มส (เวลาเรียนไม่ครบ)</option>
    </select>
  );
}

// ===================================================================
// PASS/FAIL TABLE  (กิจกรรม) — READ-ONLY
//
// ผลการประเมินรวมจากภาคเรียนที่ 1 + 2:
//   - ทั้งสองภาค 'pass' → ผ่าน
//   - ภาคใดภาคหนึ่ง 'fail' → ไม่ผ่าน
//   - ภาคใดภาคหนึ่งยังไม่บันทึก → "—" (รอประเมิน)
// ===================================================================

function PassFailTable(props: Extract<Props, { mode: "pass_fail" }>) {
  const { students, subjectLabel, teacherLabel } = props;

  const passCount = students.filter((s) => s.result === "pass").length;
  const failCount = students.filter((s) => s.result === "fail").length;
  const pendingCount = students.filter((s) => s.result == null).length;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <TableHeader
        subjectLabel={subjectLabel}
        teacherLabel={teacherLabel}
        meta={
          <span className="text-xs text-zinc-500">
            วิชากิจกรรม · ผลรวมจาก 2 ภาค (ต้องผ่านทั้งคู่จึงผ่าน)
          </span>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">เลขที่</th>
              <th className="px-3 py-2.5 text-left font-medium">ชื่อ-สกุล</th>
              <th className="px-3 py-2.5 text-center font-medium">
                ภาคเรียนที่ 1
              </th>
              <th className="px-3 py-2.5 text-center font-medium">
                ภาคเรียนที่ 2
              </th>
              <th className="px-3 py-2.5 text-center font-medium">
                ผลการประเมิน
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr
                key={s.id}
                className={
                  i % 2 === 0
                    ? "bg-white hover:bg-zinc-50"
                    : "bg-zinc-50/50 hover:bg-zinc-100/60"
                }
              >
                <td className="px-3 py-2 text-zinc-600 tabular-nums">
                  {s.student_number}
                </td>
                <td className="px-3 py-2">{s.full_label}</td>
                <td className="px-3 py-2 text-center">
                  <PassFailBadge value={s.sem1} />
                </td>
                <td className="px-3 py-2 text-center">
                  <PassFailBadge value={s.sem2} />
                </td>
                <td className="px-3 py-2 text-center">
                  <PassFailBadge value={s.result} bold />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50/50 px-4 py-3 text-xs text-zinc-600">
        <div>
          ผ่าน <strong className="text-emerald-700">{passCount}</strong> /{" "}
          ไม่ผ่าน <strong className="text-rose-700">{failCount}</strong> /{" "}
          รอประเมิน <strong className="text-zinc-500">{pendingCount}</strong>
        </div>
        <span className="italic text-zinc-400">
          ผลรวมคำนวณอัตโนมัติจาก 2 ภาค · บันทึกผ่าน/ไม่ผ่านที่แท็บ ภาคเรียนที่
          1 และ 2
        </span>
      </div>
    </div>
  );
}

// ===================================================================
// Small reusable bits
// ===================================================================

function TableHeader({
  subjectLabel,
  teacherLabel,
  meta,
  action,
}: {
  subjectLabel: string;
  teacherLabel: string | null;
  meta: React.ReactNode;
  /** Optional right-aligned action element (e.g. "พิมพ์รายงาน" button).
   *  When set, the `meta` slot stays inline-left + action goes right. */
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-sm text-zinc-700">
          วิชา · <strong>{subjectLabel}</strong>
        </span>
        {teacherLabel ? (
          <span className="text-sm text-zinc-700">
            ครูผู้สอน: <strong>{teacherLabel}</strong>
          </span>
        ) : null}
        <span>{meta}</span>
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
    </div>
  );
}

function GradePill({ grade }: { grade: number | null }) {
  if (grade === null) {
    return <span className="text-sm text-zinc-400">—</span>;
  }
  const cls = gradeColorClass(grade);
  return (
    <span
      className={`inline-flex min-w-[2.5rem] justify-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${cls}`}
    >
      {formatGrade(grade)}
    </span>
  );
}

/** Variant of GradePill that prefers a ร / มส badge over the numeric
 *  grade when the corresponding flag is set. Matches the rule discussed
 *  with the user: a single column shows either the calculated grade OR
 *  the special status — never both. */
function GradeOrStatusPill({
  grade,
  isIncomplete,
  isNoEligibility,
}: {
  grade: number | null;
  isIncomplete: boolean;
  isNoEligibility: boolean;
}) {
  if (isIncomplete) {
    return (
      <span className="inline-flex min-w-[2.5rem] justify-center rounded-md bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-800">
        ร
      </span>
    );
  }
  if (isNoEligibility) {
    return (
      <span className="inline-flex min-w-[2.5rem] justify-center rounded-md bg-rose-100 px-2 py-0.5 text-sm font-semibold text-rose-800">
        มส
      </span>
    );
  }
  return <GradePill grade={grade} />;
}

function gradeColorClass(g: number): string {
  if (g >= 4) return "bg-emerald-100 text-emerald-800";
  if (g >= 3) return "bg-teal-100 text-teal-800";
  if (g >= 2) return "bg-amber-100 text-amber-800";
  if (g >= 1) return "bg-orange-100 text-orange-800";
  return "bg-rose-100 text-rose-800";
}

function PassFailBadge({
  value,
  bold = false,
}: {
  value: "pass" | "fail" | null;
  bold?: boolean;
}) {
  if (value == null) {
    return <span className="text-sm text-zinc-400">—</span>;
  }
  const isPass = value === "pass";
  const base = bold
    ? "px-3 py-1 text-sm font-semibold"
    : "px-2 py-0.5 text-xs font-medium";
  const color = isPass
    ? "bg-emerald-100 text-emerald-800"
    : "bg-rose-100 text-rose-800";
  return (
    <span className={`inline-flex rounded-md ${base} ${color}`}>
      {isPass ? "ผ่าน" : "ไม่ผ่าน"}
    </span>
  );
}

// ===================================================================
// Pure helpers
// ===================================================================

const GRADES = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];

function countGrades(values: number[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

function formatScore(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function formatGrade(g: number | null): string {
  if (g === null || !Number.isFinite(g)) return "—";
  return g % 1 === 0 ? `${g}.0` : g.toFixed(1);
}
