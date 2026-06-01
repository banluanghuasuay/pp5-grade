import { createAdminClient } from "@pp5/database/admin";
import { createClient } from "@pp5/database/server";
import Link from "next/link";
import {
  abbreviateTitle,
  averageTwoSemesters,
  cutGrade,
  sumStudentSemesterScore,
  type GradeScale,
} from "../../setup/score-structure/grading-utils";
import { ensureCategorySlots } from "../../setup/score-structure/actions";
import { PrintButton } from "../pp5/print-button";
import { withSchoolPrefix } from "@/lib/school-name";
import { AutoPrint } from "./auto-print";
import type { Metadata } from "next";
import { currentTermSuffix, reportClassroomLabel } from "@/lib/current-term";

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  // The summary-tab "พิมพ์รายงาน" button opens this WITHOUT embed=1, so —
  // like the attendance report — always name it for the saved PDF.
  const p = await searchParams;
  const [suffix, room] = await Promise.all([
    currentTermSuffix(),
    reportClassroomLabel(p.classroom),
  ]);
  return { title: ["สรุปผลการเรียน", room, suffix].filter(Boolean).join(" ") };
}

// ===================================================================
// Grade summary print report
//
// Single-page print of the annual (primary) or semester (secondary) grade
// summary for one (classroom × subject). Layout mirrors the standalone
// /reports/student-eval print page so the bundle is visually consistent:
//   - centered header: logo + title + school name + meta line
//   - 30-row padded table
//   - signature footer (ครูผู้สอน → หัวหน้างานวัดผล → (รองผอ.) → ผอ.)
//
// Triggered by the "พิมพ์รายงาน" button on the /setup/score-structure
// summary tab.
// ===================================================================

type Props = {
  searchParams: Promise<{
    classroom?: string;
    subject?: string;
    /** "1" → render WITHOUT admin chrome (used by iframe preview). */
    embed?: string;
    /** "1" → trigger window.print() on mount (skips the "preview the
     *  loaded page, click พิมพ์" step). Set by the "พิมพ์รายงาน" button
     *  on /setup/score-structure's summary tab — direct navigation
     *  without this param still shows the page like a normal route. */
    autoPrint?: string;
  }>;
};

export default async function GradeSummaryReportPage({ searchParams }: Props) {
  const params = await searchParams;
  const classroomId = params.classroom?.trim();
  const subjectId = params.subject?.trim();
  const isEmbed = params.embed === "1";
  const autoPrint = params.autoPrint === "1";

  if (!classroomId || !subjectId) {
    return notFoundPage("URL ไม่ถูกต้อง — ต้องระบุ ?classroom + ?subject");
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // School + classroom + subject in parallel.
  const [{ data: school }, { data: classroom }, { data: subject }] =
    await Promise.all([
      supabase
        .from("schools")
        .select(
          "name_th, logo_url, director_name, director_title, deputy_director_name, assessment_officer_name",
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
        academic_year:academic_years!academic_year_id (year_be)
      `,
        )
        .eq("id", classroomId)
        .maybeSingle(),
      supabase
        .from("subjects")
        .select("id, code, name_th, grading_mode")
        .eq("id", subjectId)
        .maybeSingle(),
    ]);

  if (!classroom?.grade_level || !classroom.academic_year) {
    return notFoundPage("ไม่พบข้อมูลห้องเรียน");
  }
  if (!subject) {
    return notFoundPage("ไม่พบข้อมูลวิชา");
  }
  if (subject.grading_mode !== "numeric") {
    return notFoundPage(
      "หน้านี้รองรับเฉพาะวิชาประเภทคะแนนเต็ม 100 (พื้นฐาน/เพิ่มเติม)",
    );
  }

  const isPrimary = classroom.grade_level.system === "primary";
  const gradingPeriod: "annual" | "semester" = isPrimary ? "annual" : "semester";
  const yearBe = classroom.academic_year.year_be;
  const classLabel = `ชั้น${classroom.grade_level.name_th}/${classroom.room_number}`;
  const subjectLabel = `[${subject.code}] ${subject.name_th}`;

  // Enrolled students — primary uses semester=0 (annual); for secondary
  // we'd need to pick a specific semester, but the summary tab is primary-
  // focused per the SummarySection logic. Fall back to 0 (annual) here too.
  const { data: enrollData } = await supabase
    .from("enrollments")
    .select(
      `
      student_number,
      student:students!student_id (id, title, first_name, last_name, student_code)
    `,
    )
    .eq("classroom_id", classroomId)
    .eq("semester", 0)
    .order("student_number");

  const students = (enrollData ?? [])
    .filter((e) => e.student)
    .map((e) => ({
      id: e.student!.id,
      student_number: e.student_number,
      student_code: e.student!.student_code,
      full_label: `${abbreviateTitle(e.student!.title)}${e.student!.first_name} ${e.student!.last_name}`,
    }));

  // Offerings — auto-heal mirrors SummarySection's pattern (one offering
  // per semester for primary; teacher copied across).
  const { data: offerings } = await supabase
    .from("subject_offerings")
    .select(
      `
      id,
      semester,
      teacher_id,
      teacher:teachers!teacher_id (user:users!user_id (full_name, title))
    `,
    )
    .eq("classroom_id", classroomId)
    .eq("subject_id", subjectId);

  let offering1 = offerings?.find((o) => o.semester === 1) ?? null;
  let offering2 = offerings?.find((o) => o.semester === 2) ?? null;
  if (!offering1 && offering2) {
    const { data: created } = await admin
      .from("subject_offerings")
      .insert({
        classroom_id: classroomId,
        subject_id: subjectId,
        teacher_id: offering2.teacher_id,
        semester: 1,
      })
      .select(
        `id, semester, teacher_id, teacher:teachers!teacher_id (user:users!user_id (full_name, title))`,
      )
      .single();
    offering1 = created;
  }
  if (!offering2 && offering1) {
    const { data: created } = await admin
      .from("subject_offerings")
      .insert({
        classroom_id: classroomId,
        subject_id: subjectId,
        teacher_id: offering1.teacher_id,
        semester: 2,
      })
      .select(
        `id, semester, teacher_id, teacher:teachers!teacher_id (user:users!user_id (full_name, title))`,
      )
      .single();
    offering2 = created;
  }
  if (!offering1 && !offering2) {
    return notFoundPage("ยังไม่ได้กำหนดครูสำหรับวิชานี้");
  }

  const anchorOffering = (offering1 ?? offering2)!;
  const teacherUser = anchorOffering.teacher?.user;
  const teacherLabel = teacherUser
    ? `${teacherUser.title ?? ""}${teacherUser.full_name}`
    : "—";

  // Categories + scores for both semesters in one round trip (same pattern
  // as SummarySection).
  const [cats1, cats2] = await Promise.all([
    offering1
      ? ensureCategorySlots(offering1.id)
      : Promise.resolve([] as Awaited<ReturnType<typeof ensureCategorySlots>>),
    offering2
      ? ensureCategorySlots(offering2.id)
      : Promise.resolve([] as Awaited<ReturnType<typeof ensureCategorySlots>>),
  ]);
  const cat1Ids = cats1.map((c) => c.id);
  const cat2Ids = cats2.map((c) => c.id);
  const allCategoryIds = [...cat1Ids, ...cat2Ids];

  const scoresByKey = new Map<string, number>();
  if (allCategoryIds.length > 0) {
    const { data: scoresData } = await supabase
      .from("scores")
      .select("student_id, category_id, score")
      .in("category_id", allCategoryIds);
    for (const s of scoresData ?? []) {
      if (s.score != null) {
        scoresByKey.set(`${s.student_id}|${s.category_id}`, Number(s.score));
      }
    }
  }

  const { data: scalesData } = await supabase
    .from("grade_scales")
    .select("min_score, max_score, grade, sort_order")
    .order("sort_order");
  const scales: GradeScale[] = (scalesData ?? []).map((s) => ({
    min_score: Number(s.min_score),
    max_score: Number(s.max_score),
    grade: Number(s.grade),
  }));

  // Special-status flags (ร / มส) from grades — same anchor offering as
  // the save action writes to.
  const { data: statusGradesData } = await supabase
    .from("grades")
    .select("student_id, is_incomplete, is_no_eligibility")
    .eq("offering_id", anchorOffering.id)
    .eq("grading_period", gradingPeriod);
  const statusByStudent = new Map<
    string,
    { is_incomplete: boolean; is_no_eligibility: boolean }
  >();
  for (const g of statusGradesData ?? []) {
    statusByStudent.set(g.student_id, {
      is_incomplete: !!g.is_incomplete,
      is_no_eligibility: !!g.is_no_eligibility,
    });
  }

  // Build the rows. For primary the final score is the average of both
  // semesters' totals; ร / มส override the displayed grade.
  type Row = {
    id: string;
    student_number: number;
    student_code: string;
    full_label: string;
    total1: number | null;
    total2: number | null;
    finalScore: number | null;
    grade: number | null;
    is_incomplete: boolean;
    is_no_eligibility: boolean;
  };
  const rows: Row[] = students.map((s) => {
    const total1 = sumStudentSemesterScore(s.id, cat1Ids, scoresByKey);
    const total2 = sumStudentSemesterScore(s.id, cat2Ids, scoresByKey);
    const finalScore = isPrimary
      ? averageTwoSemesters(total1, total2)
      : total1;
    const grade = cutGrade(finalScore, scales);
    const status = statusByStudent.get(s.id) ?? {
      is_incomplete: false,
      is_no_eligibility: false,
    };
    return {
      id: s.id,
      student_number: s.student_number,
      student_code: s.student_code,
      full_label: s.full_label,
      total1,
      total2,
      finalScore,
      grade,
      is_incomplete: status.is_incomplete,
      is_no_eligibility: status.is_no_eligibility,
    };
  });

  // Signers — subject-based footer (ครูผู้สอน), same line-up as Pp5Footer.
  type Signer = { name: string; role: string };
  const signers: Signer[] = [{ name: teacherLabel, role: "ครูประจำวิชา" }];
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

  // Pad to ≥30 rows so the printed form is a stable size, but expand to
  // fit when a class has more than 30 students (user spec 2026-05-19).
  const PADDED_ROW_COUNT =
    students.length === 0
      ? 30
      : Math.max(30, ...students.map((s) => s.student_number));

  return (
    <>
      {/* Trigger window.print() as soon as the page mounts. Param-gated so
          direct navigation (?autoPrint not set) still shows the page like
          a normal route — useful for inspecting before sharing/saving. */}
      {autoPrint && !isEmbed && <AutoPrint />}

      {isEmbed && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              aside { display: none !important; }
              .no-print { display: none !important; }
              [class*="max-w-6xl"] { max-width: none !important; padding: 0 !important; }
              @media screen { body { background: #ffffff !important; } }
            `,
          }}
        />
      )}

      <main className="pp5-page">
        {!isEmbed && (
          <div className="pp5-toolbar no-print">
            <Link href="/setup/score-structure" className="pp5-back">
              ← กลับ
            </Link>
            <PrintButton />
          </div>
        )}

        <header className="pp5-header">
          <div className="pp5-title">
            {school?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={school.logo_url}
                alt="โลโก้โรงเรียน"
                className="pp5-header-logo"
              />
            )}
            <h1>แบบบันทึกสรุปผลการเรียน</h1>
            <p className="pp5-school-name">
              {withSchoolPrefix(school?.name_th) || "—"}
            </p>
          </div>
          <p className="pp5-meta-line">
            <span>{classLabel}</span>
            <span>
              รหัสวิชา <strong>{subject.code}</strong>
            </span>
            <span>
              ชื่อวิชา <strong>{subject.name_th}</strong>
            </span>
            <span>
              {isPrimary ? (
                <>
                  <strong>ทั้งปี</strong> · ปีการศึกษา{" "}
                  <strong>{yearBe}</strong>
                </>
              ) : (
                <>ปีการศึกษา <strong>{yearBe}</strong></>
              )}
            </span>
          </p>
        </header>

        <table
          className={`pp5-table${PADDED_ROW_COUNT === 30 ? " pp5-table--roomy" : ""}`}
        >
          <thead>
            <tr>
              <th className="pp5-col-num">ที่</th>
              <th className="pp5-col-code">รหัสประจำตัว</th>
              <th className="pp5-col-name">ชื่อ – สกุล</th>
              <th>ภาคเรียนที่ 1</th>
              <th>ภาคเรียนที่ 2</th>
              <th>{isPrimary ? "เฉลี่ยรายปี" : "รวม"}</th>
              <th className="pp5-col-grade">เกรด</th>
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
              const r = rows.find((x) => x.student_number === rowNum) ?? null;
              return (
                <tr key={`r-${rowNum}`}>
                  <td>{rowNum}</td>
                  <td>{r?.student_code ?? ""}</td>
                  <td className="pp5-name">{r?.full_label ?? ""}</td>
                  <td>{r ? fmtScore(r.total1) : ""}</td>
                  <td>{r ? fmtScore(r.total2) : ""}</td>
                  <td>{r ? fmtScore(r.finalScore) : ""}</td>
                  <td>
                    {r ? (
                      <strong>{displayGradeOrStatus(r)}</strong>
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <footer className="pp5-footer">
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

function fmtScore(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function fmtGrade(g: number | null): string {
  if (g === null || !Number.isFinite(g)) return "—";
  return g % 1 === 0 ? `${g}.0` : g.toFixed(1);
}

function displayGradeOrStatus(r: {
  grade: number | null;
  is_incomplete: boolean;
  is_no_eligibility: boolean;
}): string {
  if (r.is_incomplete) return "ร";
  if (r.is_no_eligibility) return "มส";
  return fmtGrade(r.grade);
}

function notFoundPage(message: string) {
  return (
    <main className="mx-auto max-w-3xl p-8 text-sm text-zinc-700">
      <p>⚠️ {message}</p>
      <p className="mt-2">
        <Link
          href="/setup/score-structure"
          className="font-medium underline"
        >
          กลับไปหน้าตัดเกรด
        </Link>
      </p>
    </main>
  );
}
