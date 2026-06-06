import { createClient } from "@pp5/database/server";
import Link from "next/link";
import {
  abbreviateTitle,
  evalLevelLabel,
  overallEvalLevel,
} from "../../setup/score-structure/grading-utils";
import { PrintButton } from "../pp5/print-button";
import type { Metadata } from "next";
import {
  currentTermSuffix,
  reportClassroomLabel,
  reportRoomSuffix,
} from "@/lib/current-term";
import { withSchoolPrefix } from "@/lib/school-name";

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const p = await searchParams;
  if (p.embed !== "1") return {};
  const type = (p.type ?? "") as EvalType;
  const name = VALID_TYPES.includes(type)
    ? TYPE_TITLE[type]
    : "สรุปผลการประเมิน";
  const [suffix, room] = await Promise.all([
    currentTermSuffix(),
    reportClassroomLabel(p.classroom),
  ]);
  return { title: [name, room, suffix].filter(Boolean).join(" ") };
}

// ===================================================================
// Student-eval print report (3 types):
//   - คุณลักษณะอันพึงประสงค์ (`type=characteristics`)
//   - การอ่าน คิดวิเคราะห์ และเขียน (`type=reading-thinking`)
//   - สมรรถนะสำคัญของผู้เรียน (`type=competency`)
//
// One unified route since all 3 share the same header + table + footer
// layout. Per-type differences:
//   - title text
//   - columns (dynamic for characteristics; fixed 3/5 for the others)
//   - source table (characteristic_evaluations / reading_thinking_eval. /
//     competency_evaluations)
//
// Header follows "แบบบันทึกคะแนน" (Pp5SimpleHeader) but WITHOUT subject
// info — these evals are global per-student, not per-subject.
// Footer signatures are the same as other ปพ.5 reports.
// Body is padded to 30 rows so the printed grid is a fixed size.
// ===================================================================

const VALID_TYPES = [
  "characteristics",
  "reading-thinking",
  "competency",
] as const;
type EvalType = (typeof VALID_TYPES)[number];

const TYPE_TITLE: Record<EvalType, string> = {
  characteristics: "สรุปผลการประเมินคุณลักษณะอันพึงประสงค์",
  "reading-thinking":
    "สรุปผลการประเมินการอ่าน คิดวิเคราะห์ และเขียน",
  competency: "สรุปผลการประเมินสมรรถนะสำคัญของผู้เรียน",
};

const TYPE_BACK_PATH: Record<EvalType, string> = {
  characteristics: "/setup/characteristics",
  "reading-thinking": "/setup/reading-thinking",
  competency: "/setup/competency",
};

type Props = {
  searchParams: Promise<{
    type?: string;
    classroom?: string;
    semester?: string;
    /** "1" when loaded inside an iframe (preview/embed). */
    embed?: string;
  }>;
};

/** Map raw eval score (numeric 0–3, nullable) → display label. */
function scoreToLabel(score: number | null | undefined): string {
  if (score == null) return "—";
  if (score >= 3) return "3";
  if (score >= 2) return "2";
  if (score >= 1) return "1";
  return "0";
}

/** สพฐ summary bucket label from the average score. */
function summaryFromAvg(avg: number | null): string {
  if (avg == null) return "—";
  if (avg >= 2.5) return "ดีเยี่ยม";
  if (avg >= 1.5) return "ดี";
  if (avg >= 0.5) return "ผ่าน";
  return "ไม่ผ่าน";
}

function avgOf(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((n): n is number => typeof n === "number");
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export default async function StudentEvalReportPage({ searchParams }: Props) {
  const params = await searchParams;
  const typeRaw = params.type ?? "";
  if (!VALID_TYPES.includes(typeRaw as EvalType)) {
    return notFoundPage("URL ไม่ถูกต้อง — ต้องระบุ ?type เป็น characteristics / reading-thinking / competency");
  }
  const type = typeRaw as EvalType;
  const classroomId = params.classroom?.trim();
  // URL `semester` is a hint (0/1/2). The actual scope for read queries
  // is reconciled below with classroom.grade_level.system — primary
  // always uses 0 (annual) regardless of URL value.
  const semesterHint: 0 | 1 | 2 =
    params.semester === "0"
      ? 0
      : params.semester === "2"
        ? 2
        : 1;
  const isEmbed = params.embed === "1";

  if (!classroomId) {
    return notFoundPage("URL ไม่ถูกต้อง — ต้องระบุ ?classroom");
  }

  const supabase = await createClient();

  // 1. School + classroom + academic year
  const [{ data: school }, { data: classroom }] = await Promise.all([
    supabase
      .from("schools")
      .select(
        "name_th, logo_url, director_name, director_title, deputy_director_name, academic_head_name, assessment_officer_name",
      )
      .limit(1)
      .maybeSingle(),
    supabase
      .from("classrooms")
      .select(
        `
        id,
        room_number,
        grade_level:grade_levels!grade_level_id (id, name_th, system),
        academic_year:academic_years!academic_year_id (id, year_be)
      `,
      )
      .eq("id", classroomId)
      .maybeSingle(),
  ]);

  if (!classroom?.grade_level || !classroom.academic_year) {
    return notFoundPage("ไม่พบข้อมูลห้องเรียน");
  }

  const isPrimary = classroom.grade_level.system === "primary";
  const yearId = classroom.academic_year.id;
  const yearBe = classroom.academic_year.year_be;
  const classLabel = `ชั้น${classroom.grade_level.name_th}${await reportRoomSuffix(classroomId)}`;

  // Reconcile the read scope:
  //   - primary  → always 0 (annual scope · ignore URL hint if it says 1/2)
  //   - secondary → URL hint (1 or 2; default 1 if URL had 0)
  const evalSemester: 0 | 1 | 2 = isPrimary
    ? 0
    : semesterHint === 0
      ? 1
      : semesterHint;

  // 2. Enrollment scope mirrors evalSemester (enrollments use same pattern).
  const { data: enrolls } = await supabase
    .from("enrollments")
    .select(
      `
      student_number,
      student:students!student_id (id, title, first_name, last_name)
    `,
    )
    .eq("classroom_id", classroomId)
    .eq("semester", evalSemester)
    .order("student_number");

  const students = (enrolls ?? [])
    .filter((e) => e.student)
    .map((e) => ({
      id: e.student!.id,
      student_number: e.student_number,
      full_label: `${abbreviateTitle(e.student!.title)}${e.student!.first_name} ${e.student!.last_name}`,
    }));
  const studentIds = students.map((s) => s.id);

  // 3. Homeroom teachers (both slots — equal status per user spec).
  //    Each filled slot becomes its own signature block in the footer.
  const { data: homerooms } = await supabase
    .from("homeroom_assignments")
    .select(
      `role, teacher:teachers!teacher_id (user:users!user_id (full_name, title))`,
    )
    .eq("classroom_id", classroomId)
    .order("role");
  const homeroomLabels = (homerooms ?? [])
    .filter((h) => h.teacher?.user)
    .map(
      (h) =>
        `${h.teacher!.user!.title ?? ""}${h.teacher!.user!.full_name}`,
    );

  // 4. Per-type column definitions + score fetch.
  //    `columns` describes the table headers; `scoresByStudent` maps
  //    student.id → ordered array of scores (parallel to columns).
  let columns: Array<{
    key: string;
    label: React.ReactNode;
    headerStyle?: React.CSSProperties;
  }> = [];
  const scoresByStudent = new Map<string, Array<number | null>>();
  // Legend used to live below the table for characteristics (sort_order →
  // name lookup). Since the headers themselves now carry the full names
  // (per user spec 2026-05-19: "ข้อที่ใส่ข้อความด้วย"), the legend is
  // redundant and stays empty.
  let legendText = "";

  if (type === "characteristics") {
    // Columns = active characteristics (sorted). Header now shows BOTH
    // sort_order (line 1, bold) + the full name (line 2, wraps). Width is
    // distributed equally across all 8 columns via inline style so the
    // table looks balanced even when names differ in length.
    const { data: chars } = await supabase
      .from("characteristics")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    const list = chars ?? [];
    // Header layout per column (per user spec 2026-05-19):
    //   line 1: "ข้อที่ N"   (bold, ~10px)
    //   line 2: full name    (~9px, single-line, truncated with … if it
    //                         exceeds the column width — same idea as
    //                         "ถ้ายาวก็ย่อเอา ให้แสดงบรรทัดเดียว")
    //
    // Column WIDTHS are NOT set here — they live in the <colgroup> below
    // the table together with `table-layout: fixed`, which guarantees all
    // columns share the data-area width equally (no content-driven sizing).
    columns = list.map((c) => ({
      key: c.id,
      label: (
        <>
          <div style={{ fontSize: "10px", fontWeight: 600 }}>
            ข้อที่ {c.sort_order}
          </div>
          <div
            style={{
              fontSize: "9px",
              fontWeight: 400,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={c.name}
          >
            {c.name}
          </div>
        </>
      ),
      headerStyle: {
        verticalAlign: "top",
        lineHeight: 1.2,
      },
    }));

    if (studentIds.length > 0 && list.length > 0) {
      const { data: evals } = await supabase
        .from("characteristic_evaluations")
        .select("student_id, characteristic_id, score")
        .eq("academic_year_id", yearId)
        .eq("semester", evalSemester)
        .in("student_id", studentIds);
      const map = new Map<string, Map<string, number>>();
      for (const e of evals ?? []) {
        if (e.score == null) continue;
        let inner = map.get(e.student_id);
        if (!inner) {
          inner = new Map();
          map.set(e.student_id, inner);
        }
        inner.set(e.characteristic_id, Number(e.score));
      }
      for (const s of students) {
        const inner = map.get(s.id);
        scoresByStudent.set(
          s.id,
          list.map((c) => inner?.get(c.id) ?? null),
        );
      }
    }
  } else if (type === "reading-thinking") {
    // Widths handled by <colgroup> + table-layout: fixed (see table block
    // below). No need for per-column width hints here.
    columns = [
      { key: "reading", label: "การอ่าน" },
      { key: "thinking", label: "คิดวิเคราะห์" },
      { key: "writing", label: "การเขียน" },
    ];
    if (studentIds.length > 0) {
      const { data: evals } = await supabase
        .from("reading_thinking_evaluations")
        .select("student_id, reading_score, thinking_score, writing_score")
        .eq("academic_year_id", yearId)
        .eq("semester", evalSemester)
        .in("student_id", studentIds);
      for (const e of evals ?? []) {
        scoresByStudent.set(e.student_id, [
          e.reading_score == null ? null : Number(e.reading_score),
          e.thinking_score == null ? null : Number(e.thinking_score),
          e.writing_score == null ? null : Number(e.writing_score),
        ]);
      }
    }
  } else {
    // competency — widths handled by <colgroup> below.
    columns = [
      { key: "communication", label: "สื่อสาร" },
      { key: "thinking", label: "คิด" },
      { key: "problem_solving", label: "แก้ปัญหา" },
      { key: "life_skills", label: "ทักษะชีวิต" },
      { key: "technology", label: "เทคโนโลยี" },
    ];
    if (studentIds.length > 0) {
      const { data: evals } = await supabase
        .from("competency_evaluations")
        .select(
          "student_id, communication_score, thinking_score, problem_solving_score, life_skills_score, technology_score",
        )
        .eq("academic_year_id", yearId)
        .eq("semester", evalSemester)
        .in("student_id", studentIds);
      for (const e of evals ?? []) {
        scoresByStudent.set(e.student_id, [
          e.communication_score == null ? null : Number(e.communication_score),
          e.thinking_score == null ? null : Number(e.thinking_score),
          e.problem_solving_score == null
            ? null
            : Number(e.problem_solving_score),
          e.life_skills_score == null ? null : Number(e.life_skills_score),
          e.technology_score == null ? null : Number(e.technology_score),
        ]);
      }
    }
  }

  const title = TYPE_TITLE[type];
  // Pad to at least 30 rows so the printed form is a stable size, but
  // expand to match the highest student_number if a class has more than
  // 30 students — otherwise students above row 30 would silently drop
  // (user spec 2026-05-19: "ถ้านักเรียนมากกว่า 30 คุณไม่แสดงเลย").
  const PADDED_ROW_COUNT =
    students.length === 0
      ? 30
      : Math.max(30, ...students.map((s) => s.student_number));
  // Density tiers — mirror the 3-tier system used by the score-recording
  // report (/reports/pp5): ≤30 roomy · 31-35 compact · >35 xcompact.
  // Compact + xcompact trigger smaller header/footer/table styling so the
  // 30-row form still fits on one A4 page even for 36+-student classes.
  // User spec 2026-05-22.
  const isCompact = PADDED_ROW_COUNT > 30;
  const isXCompact = PADDED_ROW_COUNT > 35;

  // Build the signers list (same pattern as Pp5Footer in pp5/page.tsx).
  // Both homeroom slots have equal status — each filled slot gets its
  // own block. Fall back to one "—" placeholder if neither is filled.
  type Signer = { name: string; role: string };
  const signers: Signer[] = [];
  if (homeroomLabels.length === 0) {
    signers.push({ name: "—", role: "ครูประจำชั้น" });
  } else {
    for (const name of homeroomLabels) {
      signers.push({ name, role: "ครูประจำชั้น" });
    }
  }
  if (school?.assessment_officer_name) {
    signers.push({
      name: school.assessment_officer_name,
      role: "หัวหน้างานวัดผล",
    });
  }
  if (school?.deputy_director_name) {
    signers.push({
      name: school.deputy_director_name,
      role: "รองผู้อำนวยการ",
    });
  }
  signers.push({
    name: school?.director_name ?? "—",
    role: school?.director_title ?? "ผู้อำนวยการ",
  });

  return (
    <>
      {isEmbed && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              aside { display: none !important; }
              .no-print { display: none !important; }
              [class*="max-w-6xl"] { max-width: none !important; padding: 0 !important; }
              @media screen {
                body { background: #ffffff !important; }
              }
            `,
          }}
        />
      )}

      <main className="pp5-page">
        {!isEmbed && (
          <div className="pp5-toolbar no-print">
            <Link href={TYPE_BACK_PATH[type]} className="pp5-back">
              ← กลับ
            </Link>
            <PrintButton />
          </div>
        )}

        {/* Header — same layout as Pp5SimpleHeader on /reports/pp5?parts=scores,
            with subject (รหัสวิชา / ชื่อวิชา) intentionally removed since
            these evals are global per-student, not per-subject. */}
        <header
          className={`pp5-header pp5-header--eval${isCompact ? " pp5-header--compact" : ""}${isXCompact ? " pp5-header--xcompact" : ""}`}
        >
          <div className="pp5-title">
            {school?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={school.logo_url}
                alt="โลโก้โรงเรียน"
                className="pp5-header-logo"
              />
            )}
            <h1>{title}</h1>
            <p className="pp5-school-name">
              {withSchoolPrefix(school?.name_th) || "—"}
            </p>
          </div>
          <p className="pp5-meta-line">
            <span>{classLabel}</span>
            <span>
              {/* Primary uses annual scope (no per-semester); secondary
                  shows the term explicitly. */}
              {isPrimary ? (
                <strong>ทั้งปี</strong>
              ) : (
                <>
                  ภาคเรียนที่ <strong>{evalSemester}</strong>
                </>
              )}{" "}
              ปีการศึกษา <strong>{yearBe}</strong>
            </span>
          </p>
        </header>

        {/* Score table — fixed 30 rows so the printed grid stays a stable
            size regardless of enrollment count. */}
        {/* Width budget — see EvalReportPage in /reports/pp5/page.tsx for
            the rationale. table-layout: fixed + a colgroup that sums to
            exactly 100% so the table NEVER overflows the print page, and
            data columns get consistent widths regardless of name length.
            User spec 2026-05-19: "ช่อง 3 ช่องกว้างเกินไป และช่องสรุปสุดท้าย
            ก็เล็กเกินไปและหลุดออกกระดาษทางขวา". */}
        <table
          className={`pp5-table${PADDED_ROW_COUNT === 30 ? " pp5-table--roomy" : isXCompact ? " pp5-table--xcompact" : ""}`}
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "26%" }} />
            {columns.map((col) => (
              <col
                key={col.key}
                style={{
                  width: `${columns.length > 0 ? 55 / columns.length : 0}%`,
                }}
              />
            ))}
            <col style={{ width: "14%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>ที่</th>
              <th>ชื่อ – สกุล</th>
              {columns.map((col) => (
                <th key={col.key} style={col.headerStyle}>
                  {col.label}
                </th>
              ))}
              <th>สรุป</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: PADDED_ROW_COUNT }, (_, i) => {
              const rowNum = i + 1;
              const s =
                students.find((x) => x.student_number === rowNum) ?? null;
              const scores = s
                ? (scoresByStudent.get(s.id) ?? columns.map(() => null))
                : [];
              return (
                <tr key={`r-${rowNum}`}>
                  <td>{rowNum}</td>
                  <td className="pp5-name">{s?.full_label ?? ""}</td>
                  {columns.map((col, idx) => (
                    <td key={col.key}>
                      {s ? scoreToLabel(scores[idx] ?? null) : ""}
                    </td>
                  ))}
                  <td>
                    {s ? (
                      <strong>{evalLevelLabel(overallEvalLevel(scores))}</strong>
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Legend (characteristics only — too many columns to spell out
            in the table header; we use numeric labels there + this key). */}
        {legendText && (
          <p className="pp5-legend-small">{legendText}</p>
        )}

        {/* Footer signatures — same line-up as Pp5Footer / AttFooter:
            ครูประจำชั้น → หัวหน้างานวัดผล → (รองผอ.) → ผอ. */}
        <footer
          className={`pp5-footer${isCompact ? " pp5-footer--compact" : ""}${isXCompact ? " pp5-footer--xcompact" : ""}`}
        >
          {signers.map((s, i) => (
            <div key={i} className="pp5-sig-block">
              <p>ลงชื่อ .....................................</p>
              <p className="pp5-sig-name">( {s.name} )</p>
              <p>{s.role}</p>
            </div>
          ))}
        </footer>
      </main>
    </>
  );
}

function notFoundPage(message: string) {
  return (
    <main className="mx-auto max-w-3xl p-8 text-sm text-zinc-700">
      <p>⚠️ {message}</p>
      <p className="mt-2">
        <Link href="/setup/characteristics" className="font-medium underline">
          กลับไปหน้าประเมิน
        </Link>
      </p>
    </main>
  );
}
