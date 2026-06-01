import type { ReactNode } from "react";
import { cutGrade, averageTwoSemesters } from "../../setup/score-structure/grading-utils";
import { PrintButton } from "../pp5/print-button";

// ===================================================================
// Page frame — applies print styling + header
// ===================================================================

export type HeaderInfo = {
  schoolName: string;
  affiliation: string;
  district: string | null;
  province: string | null;
  logoUrl: string | null;
  directorName: string;
  directorTitle: string;
  deputyDirectorName: string | null;
  academicHeadName: string | null;
  assessmentOfficerName: string | null;
  classLabel: string;
  gradeShort: string;
  isPrimaryLevel: boolean;
  isSecondaryLevel: boolean;
  yearBe: number;
  semester: 1 | 2;
  subjectCode: string;
  subjectName: string;
  subjectCategory: "core" | "additional" | "activity";
  learningAreaName: string | null;
  creditHours: number | null;
  hoursPerWeek: number;
  totalHoursPerSemester: number;
  teacherLabel: string;
  homeroomLabel: string | null;
};

export function Pp5Frame({
  info: _info,
  embed = false,
  children,
}: {
  info: HeaderInfo;
  /** When true, the page is loaded inside the selector's preview iframe
   *  (parent owns the print button) — hide the toolbar AND the admin
   *  layout chrome (sidebar + top bars + max-width wrapper). */
  embed?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {/* Embed mode — strip the surrounding admin layout so the iframe
          contains ONLY the report. We inject CSS at this scope so it
          targets the layout's <aside>/<header>/breadcrumb without
          requiring layout.tsx changes.

          Also: in embed mode the iframe is used as a LIVE preview, so we
          add a print-preview-style visual: gray page background + dashed
          dividers labelled "── หน้าใหม่ ──" at every actual page-break
          point. Print itself uses real page-breaks (these screen styles
          don't apply via @media print). */}
      {embed && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Always-on rules (apply to both screen preview AND print):
                 hide admin chrome that would otherwise leak into the iframe. */
              aside { display: none !important; }
              .no-print { display: none !important; }
              [class*="max-w-6xl"] {
                max-width: none !important;
                padding: 0 !important;
              }

              /* Hide the iframe's own scrollbar visually — the parent
                 (selector form) clips around the paper-box at the visible
                 paper width, and the user reported the iframe's right-edge
                 scrollbar showing INSIDE the paper area looked redundant.
                 Scroll functionality (wheel · arrow · touch · spacebar)
                 stays intact — only the visual scrollbar is hidden. */
              html, body {
                scrollbar-width: none;          /* Firefox */
                -ms-overflow-style: none;       /* IE / old Edge */
              }
              html::-webkit-scrollbar,
              body::-webkit-scrollbar {
                display: none;                  /* Chrome · Safari · Edge */
              }

              /* Screen-only rules. The parent calls iframe.contentWindow.print()
                 from the "พิมพ์" button, which prints THIS document — so any
                 rule defined outside @media screen would also appear on paper.
                 The paper-box border, drop-shadow, gray body bg, and
                 fixed min-height are PREVIEW affordances only; the printed
                 output uses the real @page rules from globals.css. */
              @media screen {
                /* Preview mode: gray background, each .pp5-page-content is
                   its own paper-like white box with a visible gap between
                   pages (mimics browser's print preview layout). */
                body {
                  background: #e2e8f0 !important;
                  padding: 1rem 0 !important;
                }
                .pp5-page {
                  max-width: 210mm;
                  margin: 0 auto;
                  background: transparent !important;
                  padding: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                }
                .pp5-page-content {
                  background: #ffffff;
                  padding: 14mm 12mm;
                  margin: 0 auto 1.5rem;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
                  border: 1px solid #cbd5e1;
                  min-height: 250mm;
                }
                /* Wide pages (weekly attendance grid) — symmetric side
                   padding here matches the symmetric @page margins used
                   in print. The table itself is shifted right via an
                   explicit margin-left on .att-table (declared in
                   globals.css under @media print) — but that print rule
                   doesn't apply to screen, so mirror the same shift
                   here too. Also shrink the slot/name cols to print
                   sizes (default screen widths are 18/110px — too wide
                   for the narrow content area). */
                .pp5-page-content-wide {
                  padding: 14mm 10mm;
                }
                .pp5-page-content-wide .att-table {
                  margin-left: 12mm;
                  margin-right: 0;
                  font-size: 8.5px;
                }
                .pp5-page-content-wide .att-table th,
                .pp5-page-content-wide .att-table td {
                  padding: 0.05rem 0.1rem;
                }
                .pp5-page-content-wide .att-table tbody tr {
                  height: 18px;
                }
                .pp5-page-content-wide .att-table tbody td {
                  padding: 0.2rem 0.15rem;
                }
                .pp5-page-content-wide .att-table tbody .att-name {
                  font-size: 11px;
                }
                .pp5-page-content-wide .att-table .att-wk-slot {
                  width: 14px;
                  font-size: 6.5px;
                }
                .pp5-page-content-wide .att-table .att-col-num {
                  width: 18px;
                }
                .pp5-page-content-wide .att-table .att-col-name {
                  width: 95px;
                }
                .pp5-page-content-wide .att-table .att-col-sum {
                  width: 22px;
                }
                .pp5-page-content-wide .att-table .att-col-pct {
                  width: 44px;
                }
                /* Section titles inside a page lose their print-mode top
                   spacing/divider since the paper boundary now does that
                   job in the preview. */
                .pp5-section-title {
                  margin-top: 0.5rem !important;
                  padding-top: 0 !important;
                  border-top: none !important;
                }
              }
            `,
          }}
        />
      )}

      <main className="pp5-page">
        {/* Print action — hidden on print. Also hidden in embed mode because
            the parent (selector page) renders its own "พิมพ์" button that
            calls iframe.contentWindow.print(). */}
        {!embed && (
          <div className="pp5-toolbar no-print">
            <PrintButton />
          </div>
        )}

        {children}
      </main>
    </>
  );
}

// ===================================================================
// Numeric table (primary 11-col, secondary 12-col)
// ===================================================================

export function NumericTable({
  categories,
  students,
  scoresByStudent,
  scales,
  isPrimary,
  info,
  termText,
}: {
  categories: Array<{
    id: string;
    name: string;
    sort_order: number;
    max_score: number;
    is_midterm: boolean;
    is_final: boolean;
  }>;
  students: Array<{
    id: string;
    student_number: number;
    student_code: string;
    full_label: string;
  }>;
  scoresByStudent: Map<string, Record<string, number>>;
  scales: Array<{ min_score: number; max_score: number; grade: number }>;
  isPrimary: boolean;
  /** Optional — when provided, renders a Pp5ScoreHeader (logo-less) above
   *  the table. Used inside the ปพ.5 bundle where each score section is a
   *  self-contained "page". Simple-print mode (?parts=scores from /setup/
   *  score-structure) leaves this undefined — the top-level Pp5SimpleHeader
   *  handles the heading once for the whole document. */
  info?: HeaderInfo;
  /** Override for the term-text segment of the header — used for ประถม's
   *  per-semester pages ("ภาคเรียนที่ 1 ..." / "ภาคเรียนที่ 2 ..."). When
   *  omitted, falls back to "ภาคเรียนที่ {info.semester} ปีการศึกษา {Y}". */
  termText?: string;
}) {
  const sorted = categories.slice().sort((a, b) => a.sort_order - b.sort_order);
  const collect = sorted.filter((c) => !c.is_midterm && !c.is_final);
  const midterm = sorted.find((c) => c.is_midterm) ?? null;
  const final = sorted.find((c) => c.is_final) ?? null;
  // Standard ปพ.5 form structure for secondary numeric: ALWAYS 5
  // ระหว่างภาค + midterm + 5 ระหว่างภาค + final (12 sub-cols). Pad with
  // null when DB has fewer categories — empty cells fall through to blank
  // headers + blank scores so the printed form keeps its expected shape
  // for hand-fill or future data entry. User spec 2026-05-20: "ตารางที่
  // ไม่มีข้อมูลก็ให้แสดงตามปกติ ไม่มีข้อมูลก็ว่างไว้".
  const FIXED_COLLECT = 5;
  const beforeRaw = collect.filter((c) => c.sort_order <= 5);
  const afterRaw = collect.filter((c) => c.sort_order >= 7);
  type CollectSlot = (typeof collect)[number] | null;
  const beforeMid: CollectSlot[] = Array.from(
    { length: FIXED_COLLECT },
    (_, i) => beforeRaw[i] ?? null,
  );
  const afterMid: CollectSlot[] = Array.from(
    { length: FIXED_COLLECT },
    (_, i) => afterRaw[i] ?? null,
  );

  // Pre-compute total per student
  const totalOf = (sid: string): number => {
    const ss = scoresByStudent.get(sid) ?? {};
    let total = 0;
    for (const c of sorted) total += ss[c.id] ?? 0;
    return total;
  };
  const gradeOf = (sid: string): number => cutGrade(totalOf(sid), scales);

  const grandMax = sorted.reduce((sum, c) => sum + (c.max_score ?? 0), 0);

  // Display number for collect cells. For secondary, sort_order 7..11 should
  // show as 6..10 in print (since midterm consumes the "6" slot visually).
  const collectLabel = (c: { sort_order: number }): string => {
    if (isPrimary) return String(c.sort_order);
    if (c.sort_order <= 5) return String(c.sort_order);
    return String(c.sort_order - 1);
  };

  // Density tiers — controls font/padding/row-height in print:
  //   ≤30  → roomy (14px font, 22px row height)
  //   31-35 → compact (12px font, 0 padding, line-height 1.15)
  //   >35  → xcompact (extra trim on top of compact)
  // User spec 2026-05-22: classes with 36+ students still overflowed
  // even after compact tightening, so a 3rd tier extends the trim.
  const maxStudentNum =
    students.length === 0 ? 0 : Math.max(...students.map((s) => s.student_number));
  const isRoomy = maxStudentNum <= 30;
  const isXCompact = maxStudentNum > 35;
  const roomyClass = isRoomy
    ? " pp5-table--roomy"
    : isXCompact
      ? " pp5-table--xcompact"
      : "";

  return (
    <section
      className={`pp5-page-content${info ? " pp5-page-content-score" : ""}`}
    >
    {info && <Pp5ScoreHeader info={info} termText={termText} />}
    <table className={`pp5-table${roomyClass}`}>
      <thead>
        <tr>
          <th rowSpan={2} className="pp5-col-num">
            ที่
          </th>
          <th rowSpan={2} className="pp5-col-code">
            เลขประจำตัว
          </th>
          <th rowSpan={2} className="pp5-col-name">
            ชื่อ – สกุล
          </th>
          {/* Group headers — secondary ALWAYS shows ก่อน/กลาง/หลัง/ปลาย
              with 5+1+5+1 sub-cols (standard ปพ.5 form). Empty slots
              render blank. Primary keeps dynamic merged "คะแนน 100"
              based on actual categories. */}
          {isPrimary ? (
            <th colSpan={collect.length + (final ? 1 : 0)} className="pp5-group">
              คะแนน 100
            </th>
          ) : (
            <>
              <th colSpan={FIXED_COLLECT} className="pp5-group">
                ก่อนกลางภาค
              </th>
              <th rowSpan={2}>กลางภาค</th>
              <th colSpan={FIXED_COLLECT} className="pp5-group">
                หลังกลางภาค
              </th>
              <th rowSpan={2}>ปลายภาค</th>
            </>
          )}
          <th rowSpan={2} className="pp5-col-total">
            รวม
          </th>
          <th rowSpan={2} className="pp5-col-grade">
            เกรด
          </th>
        </tr>
        <tr>
          {isPrimary ? (
            <>
              {collect.map((c) => (
                <th key={c.id}>{collectLabel(c)}</th>
              ))}
              {final ? <th>ปลายภาค</th> : null}
            </>
          ) : (
            <>
              {beforeMid.map((c, i) => (
                <th key={c?.id ?? `pad-b-${i}`}>
                  {c ? collectLabel(c) : i + 1}
                </th>
              ))}
              {afterMid.map((c, i) => (
                <th key={c?.id ?? `pad-a-${i}`}>
                  {c ? collectLabel(c) : i + 6}
                </th>
              ))}
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {/* คะแนนเต็ม row */}
        <tr className="pp5-maxrow">
          <td colSpan={3}>คะแนนเต็ม</td>
          {isPrimary
            ? sorted.map((c) => (
                <td key={c.id}>{c.max_score > 0 ? c.max_score : ""}</td>
              ))
            : (
                <>
                  {beforeMid.map((c, i) => {
                    const v = c != null && c.max_score > 0 ? c.max_score : "";
                    return <td key={c?.id ?? `pad-b-${i}`}>{v}</td>;
                  })}
                  <td>
                    {midterm != null && midterm.max_score > 0
                      ? midterm.max_score
                      : ""}
                  </td>
                  {afterMid.map((c, i) => {
                    const v = c != null && c.max_score > 0 ? c.max_score : "";
                    return <td key={c?.id ?? `pad-a-${i}`}>{v}</td>;
                  })}
                  <td>
                    {final != null && final.max_score > 0 ? final.max_score : ""}
                  </td>
                </>
              )}
          <td>{grandMax > 0 ? grandMax : ""}</td>
          <td>—</td>
        </tr>
        {/* Pad rows to PADDED_ROW_COUNT regardless of actual student count
            (per user spec — keeps the printed grid a fixed size for binding
            into the standard ปพ.5 booklet). Render row index 1..N; map
            each row to a student via student_number, or leave the slot
            blank if no enrollment matches. Same pattern as the weekly
            attendance grid. */}
        {(() => {
          // Pad to ≥30 rows for binding; expand to fit if class > 30
          // (user spec 2026-05-19: "ถ้านักเรียนมากกว่า 30 คุณไม่แสดงเลย").
          const PADDED_ROW_COUNT =
            students.length === 0
              ? 30
              : Math.max(30, ...students.map((s) => s.student_number));
          // beforeMid/afterMid available from function scope above —
          // declared once so the thead group cells also see the actual
          // counts for dynamic colSpan.
          return Array.from({ length: PADDED_ROW_COUNT }, (_, i) => {
            const rowNum = i + 1;
            const s =
              students.find((x) => x.student_number === rowNum) ?? null;
            const ss = s ? (scoresByStudent.get(s.id) ?? {}) : {};
            const total = s ? totalOf(s.id) : null;
            const grade = s ? gradeOf(s.id) : null;
            return (
              <tr key={`r-${rowNum}`}>
                <td>{rowNum}</td>
                <td>{s?.student_code ?? ""}</td>
                <td className="pp5-name">{s?.full_label ?? ""}</td>
                {isPrimary
                  ? sorted.map((c) => (
                      <td key={c.id}>{s ? fmtScore(ss[c.id]) : ""}</td>
                    ))
                  : (
                      <>
                        {beforeMid.map((c, i) => {
                          // Compute outside JSX to ensure short-circuit
                          // ordering: c must be checked before c.id is
                          // accessed. Inline `s && c ? ss[c.id] : ""`
                          // failed at runtime in Next.js 16 SSR.
                          const value =
                            c == null || s == null
                              ? ""
                              : fmtScore(ss[c.id]);
                          return (
                            <td key={c?.id ?? `pad-b-${i}`}>{value}</td>
                          );
                        })}
                        <td>
                          {midterm == null || s == null
                            ? ""
                            : fmtScore(ss[midterm.id])}
                        </td>
                        {afterMid.map((c, i) => {
                          const value =
                            c == null || s == null
                              ? ""
                              : fmtScore(ss[c.id]);
                          return (
                            <td key={c?.id ?? `pad-a-${i}`}>{value}</td>
                          );
                        })}
                        <td>
                          {final == null || s == null
                            ? ""
                            : fmtScore(ss[final.id])}
                        </td>
                      </>
                    )}
                <td>
                  {s ? fmtScore(total ?? 0) : ""}
                </td>
                <td>
                  {s ? fmtGrade(grade ?? 0) : ""}
                </td>
              </tr>
            );
          });
        })()}
      </tbody>
    </table>
    </section>
  );
}

// ===================================================================
// Primary annual summary (3rd page for ประถม)
// ===================================================================
//
// Compact summary of both semesters' totals + the computed annual grade.
// Formula per `averageTwoSemesters` / `cutGrade` in grading-utils.ts:
//   annual_score = (total_sem1 + total_sem2) / 2     // both totals out of 100
//   annual_grade = cutGrade(annual_score, scales)    // → 0..4 in .5 steps
// Padded to 30 rows so the printed grid is stable regardless of class size.

export function PrimaryAnnualSummary({
  students,
  sem1,
  sem2,
  scales,
  info,
  showHeader = true,
}: {
  students: Array<{
    id: string;
    student_number: number;
    student_code: string;
    full_label: string;
  }>;
  sem1: {
    categories: Array<{ id: string; max_score: number }>;
    scoresByStudent: Map<string, Record<string, number>>;
  };
  sem2: {
    categories: Array<{ id: string; max_score: number }>;
    scoresByStudent: Map<string, Record<string, number>>;
  };
  scales: Array<{ min_score: number; max_score: number; grade: number }>;
  info: HeaderInfo;
  /** Whether to render the Pp5ScoreHeader on this page. Set false in
   *  simple-print mode where the document-level Pp5SimpleHeader is the
   *  heading. Default true (bundle mode). */
  showHeader?: boolean;
}) {
  const totalFor = (
    bundle: typeof sem1,
    sid: string,
  ): number => {
    const ss = bundle.scoresByStudent.get(sid) ?? {};
    return bundle.categories.reduce(
      (acc, c) => acc + (ss[c.id] ?? 0),
      0,
    );
  };
  // Pad to ≥30 rows for binding; expand to fit if class > 30 students.
  // Density tiers (see NumericTable for the same logic):
  //   ≤30 → roomy · 31-35 → compact (default) · >35 → xcompact
  const PADDED_ROW_COUNT =
    students.length === 0
      ? 30
      : Math.max(30, ...students.map((s) => s.student_number));
  const roomyClass =
    PADDED_ROW_COUNT === 30
      ? " pp5-table--roomy"
      : PADDED_ROW_COUNT > 35
        ? " pp5-table--xcompact"
        : "";
  return (
    <section
      className={`pp5-page-content${showHeader ? " pp5-page-content-score" : ""}`}
    >
      {showHeader && (
        <Pp5ScoreHeader
          info={info}
          title="สรุปผลการเรียนประจำรายวิชา"
          termText={`ทั้งปี · ปีการศึกษา ${info.yearBe}`}
        />
      )}
      <table className={`pp5-table${roomyClass}`}>
        {/* 7 columns sized to fill ~178mm (= the score-page printable area):
              ที่ 36 + รหัส 80 + ชื่อ 200 + ภาค1 80 + ภาค2 80 + เฉลี่ย 100
              + เกรด 60 = 636px ≈ 168mm */}
        <colgroup>
          <col style={{ width: "36px" }} />
          <col style={{ width: "80px" }} />
          <col style={{ width: "200px" }} />
          <col style={{ width: "80px" }} />
          <col style={{ width: "80px" }} />
          <col style={{ width: "100px" }} />
          <col style={{ width: "60px" }} />
        </colgroup>
        <thead>
          <tr>
            <th>ที่</th>
            <th>เลขประจำตัว</th>
            <th>ชื่อ – สกุล</th>
            <th>ภาคเรียนที่ 1</th>
            <th>ภาคเรียนที่ 2</th>
            <th>คะแนนเฉลี่ย</th>
            <th>เกรด</th>
          </tr>
        </thead>
        <tbody>
          <tr className="pp5-maxrow">
            <td colSpan={3}>คะแนนเต็ม</td>
            <td>100</td>
            <td>100</td>
            <td>100</td>
            <td>—</td>
          </tr>
          {Array.from({ length: PADDED_ROW_COUNT }, (_, i) => {
            const rowNum = i + 1;
            const s =
              students.find((x) => x.student_number === rowNum) ?? null;
            const t1 = s ? totalFor(sem1, s.id) : null;
            const t2 = s ? totalFor(sem2, s.id) : null;
            const annual =
              t1 != null && t2 != null
                ? averageTwoSemesters(t1, t2)
                : null;
            const grade = annual != null ? cutGrade(annual, scales) : null;
            return (
              <tr key={`r-${rowNum}`}>
                <td>{rowNum}</td>
                <td>{s?.student_code ?? ""}</td>
                <td className="pp5-name">{s?.full_label ?? ""}</td>
                <td>{t1 != null ? fmtScore(t1) : ""}</td>
                <td>{t2 != null ? fmtScore(t2) : ""}</td>
                <td>{annual != null ? fmtScore(annual) : ""}</td>
                <td>{grade != null ? fmtGrade(grade) : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// ===================================================================
// Pass/fail table (activity subjects)
// ===================================================================

export function PassFailTable({
  students,
  info,
  termText,
}: {
  students: Array<{
    id: string;
    student_number: number;
    student_code: string;
    full_label: string;
    result: "pass" | "fail" | null;
  }>;
  /** Optional header info — when provided, renders Pp5ScoreHeader (same
   *  pattern as NumericTable). Used by the ปพ.5 รวมชั้น bundle so each
   *  activity subject's page has a proper title. */
  info?: HeaderInfo;
  termText?: string;
}) {
  // Pad to ≥30 rows for binding (matches the cover subject table +
  // monthly attendance + NumericTable convention). Expand to fit if
  // class > 30 students. User spec 2026-05-20: "วิชาที่เป็นกิจกรรม
  // ให้ยึดการแสดง 30 คน และมากว่า 30 คนด้วย".
  // 3-tier density: ≤30 roomy · 31-35 compact · >35 xcompact.
  const maxStudentNum =
    students.length === 0
      ? 0
      : Math.max(...students.map((s) => s.student_number));
  const PADDED_ROW_COUNT = Math.max(30, maxStudentNum);
  const roomyClass =
    PADDED_ROW_COUNT === 30
      ? " pp5-table--roomy"
      : PADDED_ROW_COUNT > 35
        ? " pp5-table--xcompact"
        : "";
  return (
    <section
      className={`pp5-page-content${info ? " pp5-page-content-score" : ""}`}
    >
    {info && <Pp5ScoreHeader info={info} termText={termText} />}
    <table className={`pp5-table pp5-table--passfail${roomyClass}`}>
      <thead>
        <tr>
          <th className="pp5-col-num">ที่</th>
          <th className="pp5-col-code">เลขประจำตัว</th>
          <th className="pp5-col-name">ชื่อ – สกุล</th>
          <th>ผลการประเมิน</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: PADDED_ROW_COUNT }, (_, i) => {
          const rowNum = i + 1;
          const s = students.find((x) => x.student_number === rowNum) ?? null;
          return (
            <tr key={`r-${rowNum}`}>
              <td>{rowNum}</td>
              <td>{s?.student_code ?? ""}</td>
              <td className="pp5-name">{s?.full_label ?? ""}</td>
              <td>
                {s == null
                  ? ""
                  : s.result === "pass"
                    ? "ผ่าน"
                    : s.result === "fail"
                      ? "ไม่ผ่าน"
                      : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </section>
  );
}

// ===================================================================
// Footer — signature lines
// ===================================================================

// ===================================================================
// Pp5SimpleHeader — compact title block for the "score-only" print
// (used by /setup/score-structure's "พิมพ์รายงาน" button which loads
// `/reports/pp5?...&parts=scores`). NOT shown when the full cover page
// renders — the cover has its own elaborate title.
//
// Minimal layout per user spec:
//   - logo (if uploaded) + centered title "แบบบันทึกผลการเรียนประจำรายวิชา"
//   - school name only (district / province / affiliation removed)
//   - ONE inline meta line: ชั้น ··· รหัสวิชา ··· ชื่อวิชา ··· ภาค ปี
// (Detailed info grid with หน่วยกิต/เวลาเรียน/ครูผู้สอน removed —
// the score table itself + footer signatures carry that context.)
// ===================================================================
export function Pp5SimpleHeader({
  info,
  compact = false,
  xcompact = false,
}: {
  info: HeaderInfo;
  /** When true, render logo inline with the title (saves ~60px of
   *  vertical space). Triggered for >30-student classes whose tables
   *  otherwise overflow to a 2nd page — pulling the logo onto the
   *  title row gives the table back one extra row before pagination. */
  compact?: boolean;
  /** Extra-compact tier — applied on top of `compact` for >35-student
   *  classes that still don't fit. Shrinks the logo/title further and
   *  uses smaller meta-line text. Caller must also set `compact=true`. */
  xcompact?: boolean;
}) {
  return (
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
        <h1>แบบบันทึกผลการเรียนประจำรายวิชา</h1>
        <p className="pp5-school-name">โรงเรียน{info.schoolName}</p>
      </div>
      {/* Single-line subject meta — uses flex+gap so the segments stay
          visually separated even when the browser collapses whitespace. */}
      <p className="pp5-meta-line">
        <span>{info.classLabel}</span>
        <span>รหัสวิชา {info.subjectCode}</span>
        <span>ชื่อวิชา {info.subjectName}</span>
        <span>ภาคเรียนที่ {info.semester} ปีการศึกษา {info.yearBe}</span>
      </p>
    </header>
  );
}

// Variant of Pp5SimpleHeader without the school logo — used inside the
// ปพ.5 BUNDLE's score pages where the cover already carries the logo +
// elaborate title. Per user spec (2026-05-19):
//   "หน้าผลการเรียนที่เล่ม ปพ.5 ... ยึดรูปแบบตามการพิมพ์รายงานที่หน้า
//    บันทึกผลการเรียน ... ยกเว้น ไม่ต้องใส่ โลโก้โรงเรียน"
// Same body otherwise so the table sizes + text sizes match exactly.
//
// `termText` overrides the final span of the meta line — used for ประถม's
// 3-page split:
//   - Page 1 → "ภาคเรียนที่ 1 ปีการศึกษา Y"
//   - Page 2 → "ภาคเรียนที่ 2 ปีการศึกษา Y"
//   - Page 3 → "ทั้งปี · ปีการศึกษา Y"  (สรุปทั้งปี)
// If omitted, falls back to the default "ภาคเรียนที่ {info.semester}".
export function Pp5ScoreHeader({
  info,
  title = "แบบบันทึกผลการเรียนประจำรายวิชา",
  termText,
}: {
  info: HeaderInfo;
  title?: string;
  termText?: string;
}) {
  return (
    <header className="pp5-header pp5-header--score">
      <div className="pp5-title">
        <h1>{title}</h1>
        {/* School name removed per user spec 2026-05-19 ("ในหน้าผลการเรียน
            ก็ให้แก้เช่นกัน") — the cover page already names the school for
            the whole bundle. */}
      </div>
      <p className="pp5-meta-line">
        <span>{info.classLabel}</span>
        <span>รหัสวิชา {info.subjectCode}</span>
        <span>ชื่อวิชา {info.subjectName}</span>
        <span>
          {termText
            ? termText
            : `ภาคเรียนที่ ${info.semester} ปีการศึกษา ${info.yearBe}`}
        </span>
      </p>
    </header>
  );
}

export function Pp5Footer({
  info,
  compact = false,
  xcompact = false,
}: {
  info: HeaderInfo;
  /** When true, trims footer top-margin so the table has more room
   *  before the signature row. Used in tandem with `Pp5SimpleHeader`'s
   *  `compact` prop when class size >30 students would otherwise spill
   *  onto a second printed page. */
  compact?: boolean;
  /** Extra-compact tier — applied on top of `compact` for >35-student
   *  classes. Caller must also set `compact=true`. */
  xcompact?: boolean;
}) {
  // 3-4 signers in a single row (left→right by seniority):
  //   ครูประจำวิชา → หัวหน้างานวัดผล → (รองผอ. if exists) → ผอ.
  const signers: Array<{ name: string; role: string }> = [
    { name: info.teacherLabel, role: "ครูประจำวิชา" },
  ];
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

export function fmtScore(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function fmtGrade(g: number): string {
  return g % 1 === 0 ? `${g}.0` : g.toFixed(1);
}
