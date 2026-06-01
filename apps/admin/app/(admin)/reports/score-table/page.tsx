import { createAdminClient } from "@pp5/database/admin";
import { createClient } from "@pp5/database/server";
import { notFound } from "next/navigation";
import {
  ensureCategorySlots,
  ensureSecondaryCategorySlots,
} from "../../setup/score-structure/actions";
import { abbreviateTitle } from "../../setup/score-structure/grading-utils";
import {
  NumericTable,
  PassFailTable,
  Pp5Footer,
  Pp5Frame,
  Pp5SimpleHeader,
} from "../_shared/score-report";
import type { Metadata } from "next";
import { currentTermSuffix, reportClassroomLabel } from "@/lib/current-term";
import { getTeacherScope } from "@/lib/teacher-scope";

// ===================================================================
// /reports/score-table — standalone "score table only" print route.
//
// Produces the SAME printed output as /reports/pp5?...&parts=scores (the
// score-only print launched from หน้าบันทึกคะแนน), but as its own route so
// it gets its own metadata/filename ("บันทึกคะแนน") independent of the full
// ปพ.5 เล่ม. It deliberately renders ONLY the score table — no cover, no
// weekly-attendance grid, no characteristic/reading/competency evals.
//
// The render path mirrors pp5's `parts.scores` + `!parts.cover` branch
// exactly: document-level Pp5SimpleHeader (the heading) → score table(s) in
// their simple-print branches (primary single-semester / secondary single
// table / activity pass-fail) → Pp5Footer.
// ===================================================================

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const p = await searchParams;
  if (p.embed !== "1") return {};
  const [suffix, room] = await Promise.all([
    currentTermSuffix(),
    reportClassroomLabel(p.classroom),
  ]);
  // Fixed name "บันทึกคะแนน" — matches the score-only print's purpose and
  // the filename the user picked. (The on-paper header is still the standard
  // "แบบบันทึกผลการเรียนประจำรายวิชา".)
  return { title: ["บันทึกคะแนน", room, suffix].filter(Boolean).join(" ") };
}

type Props = {
  searchParams: Promise<{
    classroom?: string;
    subject?: string;
    semester?: string;
    /** "1" when this page is loaded INSIDE the selector's preview iframe —
     *  the toolbar is hidden so the iframe stays clean. */
    embed?: string;
  }>;
};

export default async function ScoreTablePage({ searchParams }: Props) {
  const params = await searchParams;
  const classroomId = params.classroom?.trim();
  const subjectId = params.subject?.trim();
  const semRaw = params.semester?.trim();
  const semester: 1 | 2 = semRaw === "2" ? 2 : 1;
  const isEmbed = params.embed === "1";

  if (!classroomId || !subjectId) {
    notFound();
  }

  // Teacher access guard — teachers can only open per-subject reports for
  // offerings they're assigned to. Scope by `semester` too so an activity
  // subject's two offering rows don't trip `.maybeSingle()`.
  const teacherScope = await getTeacherScope();
  if (teacherScope) {
    const supabase = await createClient();
    const { data: offeringMatch } = await supabase
      .from("subject_offerings")
      .select("id")
      .eq("classroom_id", classroomId)
      .eq("subject_id", subjectId)
      .eq("semester", semester)
      .eq("teacher_id", teacherScope.teacherId)
      .maybeSingle();
    if (!offeringMatch) {
      notFound();
    }
  }

  const supabase = await createClient();

  // 1. School info (single-tenant)
  const { data: school } = await supabase
    .from("schools")
    .select(
      "name_th, affiliation, district, province, logo_url, director_name, director_title, deputy_director_name, academic_head_name, assessment_officer_name",
    )
    .limit(1)
    .maybeSingle();

  // 2. Classroom + grade + academic year
  const { data: classroom } = await supabase
    .from("classrooms")
    .select(
      `
      id,
      room_number,
      grade_level:grade_levels!grade_level_id (
        id,
        name_short,
        name_th,
        system
      ),
      academic_year:academic_years!academic_year_id (
        year_be,
        current_semester,
        start_date,
        end_date
      )
    `,
    )
    .eq("id", classroomId)
    .maybeSingle();

  if (!classroom?.grade_level || !classroom.academic_year) {
    notFound();
  }
  const isPrimary = classroom.grade_level.system === "primary";

  // 3. Subject (+ learning_area name for the header info)
  const { data: subject } = await supabase
    .from("subjects")
    .select(
      `
      id,
      code,
      name_th,
      category,
      grading_mode,
      credit_hours,
      learning_area:learning_areas!learning_area_id (name_th)
    `,
    )
    .eq("id", subjectId)
    .maybeSingle();
  if (!subject) notFound();

  // 4. Offering (classroom × subject × semester) + teacher.
  //    Auto-create with teacher_id=NULL if missing — admin can print before
  //    a teacher is assigned (teacher line shows "—").
  let { data: offering } = await supabase
    .from("subject_offerings")
    .select(
      `
      id,
      teacher:teachers!teacher_id (
        user:users!user_id (full_name, title)
      )
    `,
    )
    .eq("classroom_id", classroomId)
    .eq("subject_id", subjectId)
    .eq("semester", semester)
    .maybeSingle();

  if (!offering) {
    const admin = createAdminClient();
    const { data: created } = await admin
      .from("subject_offerings")
      .insert({
        classroom_id: classroomId,
        subject_id: subjectId,
        semester,
        teacher_id: null,
      })
      .select(
        `
        id,
        teacher:teachers!teacher_id (
          user:users!user_id (full_name, title)
        )
      `,
      )
      .single();
    offering = created;
  }

  if (!offering) {
    notFound();
  }

  const teacherUser = offering.teacher?.user;
  const teacherLabel = teacherUser
    ? `${teacherUser.title ?? ""}${teacherUser.full_name}`
    : "—";

  // 5. Homeroom teachers — used only to build headerInfo.homeroomLabel
  //    (the footer's signer list doesn't use homeroom in the score footer,
  //    but headerInfo carries it for shape parity with pp5).
  const { data: homerooms } = await supabase
    .from("homeroom_assignments")
    .select(
      `role, teacher:teachers!teacher_id ( user:users!user_id (full_name, title) )`,
    )
    .eq("classroom_id", classroomId)
    .order("role");
  const homeroomNames = (homerooms ?? [])
    .filter((h) => h.teacher?.user)
    .map((h) => `${h.teacher!.user!.title ?? ""}${h.teacher!.user!.full_name}`);
  const homeroomLabel =
    homeroomNames.length > 0 ? homeroomNames.join(" · ") : null;

  // 6. Enrolled students — scoped by semester:
  //    primary  → semester=0 (year-wide)
  //    secondary → semester=N (the requested semester)
  const enrollmentSemester: 0 | 1 | 2 = isPrimary ? 0 : semester;
  const { data: enrolls } = await supabase
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
    .order("student_number");

  const students = (enrolls ?? [])
    .filter((e) => e.student)
    .map((e) => ({
      id: e.student!.id,
      student_number: e.student_number,
      student_code: e.student!.student_code,
      title: e.student!.title,
      first_name: e.student!.first_name,
      last_name: e.student!.last_name,
      full_label: `${abbreviateTitle(e.student!.title)}${e.student!.first_name} ${e.student!.last_name}`,
    }));

  // Header info — same field-for-field assembly as pp5/page.tsx.
  const gradeShort = classroom.grade_level.name_short;
  const isPrimaryLevel = classroom.grade_level.system === "primary";
  const isSecondaryLevel = classroom.grade_level.system === "secondary";
  const hoursPerWeek = subject.credit_hours ? subject.credit_hours * 2 : 0;
  const totalHoursPerSemester = hoursPerWeek * 20;

  const headerInfo = {
    schoolName: school?.name_th ?? "—",
    affiliation: school?.affiliation ?? "—",
    district: school?.district ?? null,
    province: school?.province ?? null,
    logoUrl: school?.logo_url ?? null,
    directorName: school?.director_name ?? "—",
    directorTitle: school?.director_title ?? "ผู้อำนวยการ",
    deputyDirectorName: school?.deputy_director_name ?? null,
    academicHeadName: school?.academic_head_name ?? null,
    assessmentOfficerName: school?.assessment_officer_name ?? null,
    classLabel: `ชั้น${classroom.grade_level.name_th}/${classroom.room_number}`,
    gradeShort,
    isPrimaryLevel,
    isSecondaryLevel,
    yearBe: classroom.academic_year.year_be,
    semester,
    subjectCode: subject.code,
    subjectName: subject.name_th,
    subjectCategory: subject.category, // core | additional | activity
    learningAreaName: subject.learning_area?.name_th ?? null,
    creditHours: subject.credit_hours,
    hoursPerWeek,
    totalHoursPerSemester,
    teacherLabel,
    homeroomLabel,
  };

  // 7. Pass/fail branch (activity subjects) — single PassFailTable, no info
  //    (the document-level Pp5SimpleHeader is the heading).
  if (subject.grading_mode === "pass_fail") {
    const { data: grades } = await supabase
      .from("grades")
      .select("student_id, pass_fail")
      .eq("offering_id", offering.id)
      .eq("grading_period", "semester");
    const passFailMap = new Map<string, "pass" | "fail">();
    for (const g of grades ?? []) {
      if (g.pass_fail === "pass" || g.pass_fail === "fail") {
        passFailMap.set(g.student_id, g.pass_fail);
      }
    }

    return (
      <Pp5Frame info={headerInfo} embed={isEmbed}>
        <Pp5SimpleHeader
          info={headerInfo}
          compact={students.length > 30}
          xcompact={students.length > 35}
        />
        <PassFailTable
          students={students.map((s) => ({
            ...s,
            result: passFailMap.get(s.id) ?? null,
          }))}
        />
        <Pp5Footer
          info={headerInfo}
          compact={students.length > 30}
          xcompact={students.length > 35}
        />
      </Pp5Frame>
    );
  }

  // 8. Numeric branch — ensure categories + fetch scores + grade_scales.
  //
  // For PRIMARY the system maintains TWO offerings per (classroom × subject),
  // one per semester. In SIMPLE-PRINT mode (this route) we show ONLY the URL
  // semester's table — never bleed the other semester in. So we only need to
  // load the requested semester's bundle.
  //
  // For SECONDARY the single URL-semester offering is enough.
  type SlotCategory = {
    id: string;
    name: string;
    max_score: number;
    sort_order: number;
    is_midterm: boolean;
    is_final: boolean;
  };
  type SemScoreBundle = {
    categories: SlotCategory[];
    scoresByStudent: Map<string, Record<string, number>>;
  };

  // Resolve the offering for the requested semester. For SECONDARY this is
  // always the base `offering`. For PRIMARY it may be a different offering
  // than the base when the base offering's semester != the requested one —
  // but here the base offering was already fetched/created with
  // `semester`, so it IS the requested-semester offering. We still keep the
  // ensure helper for robustness/parity.
  async function ensureOfferingId(
    cId: string,
    sId: string,
    sem: 1 | 2,
  ): Promise<string> {
    if (sem === semester && offering) return offering.id;
    const { data: found } = await supabase
      .from("subject_offerings")
      .select("id")
      .eq("classroom_id", cId)
      .eq("subject_id", sId)
      .eq("semester", sem)
      .maybeSingle();
    if (found) return found.id;
    const admin = createAdminClient();
    const { data: created } = await admin
      .from("subject_offerings")
      .insert({
        classroom_id: cId,
        subject_id: sId,
        semester: sem,
        teacher_id: null,
      })
      .select("id")
      .single();
    if (!created) throw new Error("failed to create offering for score table");
    return created.id;
  }

  async function loadSemBundle(
    offeringId: string,
    isPrimaryArg: boolean,
  ): Promise<SemScoreBundle> {
    const cats = isPrimaryArg
      ? await ensureCategorySlots(offeringId)
      : await ensureSecondaryCategorySlots(offeringId);
    const { data: scoresData } = await supabase
      .from("scores")
      .select("student_id, category_id, score")
      .in(
        "category_id",
        cats.map((c) => c.id),
      );
    const map = new Map<string, Record<string, number>>();
    for (const row of scoresData ?? []) {
      if (!map.has(row.student_id)) map.set(row.student_id, {});
      if (row.score != null) {
        map.get(row.student_id)![row.category_id] = Number(row.score);
      }
    }
    return { categories: cats, scoresByStudent: map };
  }

  const bundleOfferingId = isPrimary
    ? await ensureOfferingId(classroomId, subjectId, semester)
    : offering.id;
  const bundle = await loadSemBundle(bundleOfferingId, isPrimary);

  const { data: scalesData } = await supabase
    .from("grade_scales")
    .select("min_score, max_score, grade")
    .order("sort_order");
  const scales = (scalesData ?? []).map((s) => ({
    min_score: Number(s.min_score),
    max_score: Number(s.max_score),
    grade: Number(s.grade),
  }));

  // Simple-print path (mirrors pp5's `parts.scores && !parts.cover`):
  //   Pp5SimpleHeader → single NumericTable (no per-table info) → Pp5Footer.
  // PRIMARY and SECONDARY both render ONE NumericTable for the URL semester;
  // the only difference is the `isPrimary` flag (controls column layout).
  // The 3-page primary annual bundle (NumericTable×2 + PrimaryAnnualSummary)
  // belongs to pp5's `parts.cover` path only — never the score-only print —
  // so PrimaryAnnualSummary is deliberately not used here.
  return (
    <Pp5Frame info={headerInfo} embed={isEmbed}>
      <Pp5SimpleHeader
        info={headerInfo}
        compact={students.length > 30}
        xcompact={students.length > 35}
      />
      <NumericTable
        categories={bundle.categories}
        students={students}
        scoresByStudent={bundle.scoresByStudent}
        scales={scales}
        isPrimary={isPrimary}
      />
      <Pp5Footer
        info={headerInfo}
        compact={students.length > 30}
        xcompact={students.length > 35}
      />
    </Pp5Frame>
  );
}
