import { createAdminClient } from "@pp5/database/admin";
import { createClient } from "@pp5/database/server";
import { Card } from "@pp5/ui";
import Link from "next/link";
import { ensureCategorySlots } from "./actions";
import {
  abbreviateTitle,
  averageTwoSemesters,
  cutGrade,
  sumStudentSemesterScore,
  type GradeScale,
} from "./grading-utils";
import {
  SummaryTable,
  type SummaryRowNumeric,
  type SummaryRowPassFail,
} from "./summary-table";

/**
 * Phase 2.4 — สรุปผล/ตัดเกรด
 *
 * Server component that fetches everything needed to compute final grades
 * for one (classroom × subject) pair across both semesters, then hands off to
 * the client `SummaryTable` for display + save.
 *
 * Branching:
 *  - subject.grading_mode = 'pass_fail'  → activity subject, no scores; admin
 *    manually picks ผ่าน/ไม่ผ่าน per student in the table
 *  - subject.grading_mode = 'numeric'    → compute totals from scores table,
 *    average semesters (ประถม) or per-semester (มัธยม), then cut with
 *    grade_scales
 */
export async function SummarySection({
  classroomId,
  subjectId,
  currentSemester,
}: {
  classroomId: string;
  subjectId: string;
  /**
   * Phase 2.6 — school's current working semester. Drives the "future" display:
   *   if currentSemester === 1, semester 2 columns show "—" (not started yet)
   *   instead of computing average from 0 + 0.
   */
  currentSemester: 1 | 2;
}) {
  const supabase = await createClient();
  const admin = createAdminClient();

  // ---------------------------------------------------------------
  // 1. Subject — need grading_mode (numeric vs pass_fail)
  // ---------------------------------------------------------------
  const { data: subject } = await supabase
    .from("subjects")
    .select("id, code, name_th, category, grading_mode")
    .eq("id", subjectId)
    .maybeSingle();

  if (!subject) {
    return (
      <Card variant="warning" padding="sm" className="text-sm text-amber-900">
        ⚠️ ไม่พบข้อมูลวิชา
      </Card>
    );
  }

  // ---------------------------------------------------------------
  // 2. Classroom + grade level — need system (primary vs secondary)
  // ---------------------------------------------------------------
  const { data: classroom } = await supabase
    .from("classrooms")
    .select(
      `
      id,
      room_number,
      grade_level:grade_levels!grade_level_id (id, name_short, system)
    `,
    )
    .eq("id", classroomId)
    .maybeSingle();

  if (!classroom?.grade_level) {
    return (
      <Card variant="warning" padding="sm" className="text-sm text-amber-900">
        ⚠️ ไม่พบข้อมูลห้องเรียน
      </Card>
    );
  }

  const isPrimary = classroom.grade_level.system === "primary";
  // ประถม → 1 grades row/year (annual)
  // มัธยม → 2 grades rows/year (semester) — Phase 2.4 ทำเฉพาะ annual ก่อน
  const gradingPeriod: "semester" | "annual" = isPrimary
    ? "annual"
    : "semester";

  // ---------------------------------------------------------------
  // 3. Enrolled students — summary tab is primary-only (semester=0)
  // ---------------------------------------------------------------
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

  // ---------------------------------------------------------------
  // 4. Offerings (sem 1 + sem 2) — auto-heal if one missing
  // ---------------------------------------------------------------
  const { data: offeringsData } = await supabase
    .from("subject_offerings")
    .select(
      `
      id,
      semester,
      teacher_id,
      teacher:teachers!teacher_id (
        id,
        user:users!user_id (full_name, title)
      )
    `,
    )
    .eq("classroom_id", classroomId)
    .eq("subject_id", subjectId);

  let offering1 = offeringsData?.find((o) => o.semester === 1) ?? null;
  let offering2 = offeringsData?.find((o) => o.semester === 2) ?? null;

  // Mirror missing semester from the present one (same pattern as
  // ScoreGridSection's auto-heal) — keeps both halves of the year aligned.
  // teacher_id is COPIED if present, otherwise NULL — both are valid now
  // (admin can record without a teacher; teaching page fills it in later).
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
        `
        id,
        semester,
        teacher_id,
        teacher:teachers!teacher_id (
          id,
          user:users!user_id (full_name, title)
        )
      `,
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
        `
        id,
        semester,
        teacher_id,
        teacher:teachers!teacher_id (
          id,
          user:users!user_id (full_name, title)
        )
      `,
      )
      .single();
    offering2 = created;
  }

  if (!offering1 && !offering2) {
    return (
      <Card variant="warning" padding="sm" className="text-sm text-amber-900">
        ⚠️ ยังไม่ได้กำหนดครูสำหรับวิชานี้ ·{" "}
        <Link
          href={`/setup/teaching?room=${classroomId}`}
          className="font-medium underline"
        >
          ไปจัดครูเข้าสอน
        </Link>
      </Card>
    );
  }

  // We use offering1 as the "anchor" — the grades row is unique on
  // (student, offering, period), so for annual we save against offering1.
  const anchorOffering = (offering1 ?? offering2)!;
  const subjectLabel = `[${subject.code}] ${subject.name_th}`;

  // Re-resolve the offering record with teacher join so we can show "ครูผู้สอน"
  // at the top of the table (annual model: same teacher for both semesters).
  const anchorWithTeacher = offeringsData?.find(
    (o) => o.id === anchorOffering.id,
  );
  const teacherUser = anchorWithTeacher?.teacher?.user;
  const teacherLabel = teacherUser
    ? `${teacherUser.title ?? ""}${teacherUser.full_name}`
    : null;

  // ---------------------------------------------------------------
  // 5a. Pass-fail subjects (กิจกรรม) — read-only summary, no save here.
  //
  // Pulls ผ่าน/ไม่ผ่าน from BOTH semesters (period='semester' rows written by
  // the per-semester tabs) and computes:
  //   - both 'pass'                       → 'pass'
  //   - either 'fail'                     → 'fail'
  //   - either still null (unassessed)    → null  (shown as "—" / รอประเมิน)
  // ---------------------------------------------------------------
  if (subject.grading_mode === "pass_fail") {
    const semesterOfferingIds: string[] = [];
    if (offering1) semesterOfferingIds.push(offering1.id);
    if (offering2) semesterOfferingIds.push(offering2.id);

    const { data: semGradesData } =
      semesterOfferingIds.length > 0
        ? await supabase
            .from("grades")
            .select("student_id, offering_id, pass_fail")
            .in("offering_id", semesterOfferingIds)
            .eq("grading_period", "semester")
        : { data: [] };

    // Build per-student lookup of sem1 + sem2 results
    const semMap = new Map<
      string,
      { sem1: "pass" | "fail" | null; sem2: "pass" | "fail" | null }
    >();
    for (const s of students) semMap.set(s.id, { sem1: null, sem2: null });
    for (const g of semGradesData ?? []) {
      if (g.pass_fail !== "pass" && g.pass_fail !== "fail") continue;
      const entry = semMap.get(g.student_id);
      if (!entry) continue;
      if (offering1 && g.offering_id === offering1.id) entry.sem1 = g.pass_fail;
      if (offering2 && g.offering_id === offering2.id) entry.sem2 = g.pass_fail;
    }

    const passFailRows: SummaryRowPassFail[] = students.map((s) => {
      const entry = semMap.get(s.id) ?? { sem1: null, sem2: null };
      const { sem1, sem2 } = entry;
      let result: "pass" | "fail" | null;
      if (sem1 == null || sem2 == null) {
        result = null;
      } else if (sem1 === "pass" && sem2 === "pass") {
        result = "pass";
      } else {
        result = "fail";
      }
      return {
        id: s.id,
        student_number: s.student_number,
        full_label: s.full_label,
        sem1,
        sem2,
        result,
      };
    });

    return (
      <SummaryTable
        mode="pass_fail"
        students={passFailRows}
        subjectLabel={subjectLabel}
        teacherLabel={teacherLabel}
      />
    );
  }

  // ---------------------------------------------------------------
  // 5b. Numeric subjects (พื้นฐาน/เพิ่มเติม) — sum + cut grade
  // ---------------------------------------------------------------
  // Ensure 11 category slots exist for each semester (so missing slots count
  // as 0 cleanly).
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

  // Fetch ALL scores for both semesters in one round trip
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

  // Grade scales (8 thresholds — sorted by sort_order so the descending
  // ranges come first; cutGrade does linear scan anyway so order doesn't
  // technically matter, but sort_order=1 is the top scale).
  const { data: scalesData } = await supabase
    .from("grade_scales")
    .select("min_score, max_score, grade, sort_order")
    .order("sort_order");

  const scales: GradeScale[] = (scalesData ?? []).map((s) => ({
    min_score: Number(s.min_score),
    max_score: Number(s.max_score),
    grade: Number(s.grade),
  }));

  // Fetch any existing "special status" flags (ร / มส) admin has set for
  // this offering's annual grade. The grades row may not exist yet (the
  // numeric grade is computed on the fly), but it's still where the
  // is_incomplete + is_no_eligibility booleans live.
  //
  // Anchor is offering1 (or offering2 if 1 is missing — same as the save
  // path). grading_period='annual' for primary; 'semester' for secondary.
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

  // Compute one row per student. Phase 2.6: future semesters (relative to the
  // school's current_semester) show "—" instead of 0 so the table doesn't
  // make an unfinished year look like every student got a failing grade.
  //
  // No "saved grade" fetch for the numeric value — purely derived from
  // `scores` and re-computed on every view, so no drift possible.
  // BUT special-status flags ARE persisted (per user spec 2026-05-19) and
  // override the displayed grade with "ร" / "มส" when set.
  const rows: SummaryRowNumeric[] = students.map((student) => {
    // sem 1 is always reachable (current or past). sem 2 only when current=2.
    const total1 = sumStudentSemesterScore(student.id, cat1Ids, scoresByKey);
    const total2 =
      currentSemester >= 2
        ? sumStudentSemesterScore(student.id, cat2Ids, scoresByKey)
        : null;
    // Annual grade requires BOTH semesters. If sem 2 isn't here yet, the
    // final score and the cut grade are deferred until it is.
    const finalScore =
      total2 === null
        ? null
        : isPrimary
          ? averageTwoSemesters(total1, total2)
          : total1; // มัธยม: Phase 4
    const grade = finalScore === null ? null : cutGrade(finalScore, scales);
    const status = statusByStudent.get(student.id) ?? {
      is_incomplete: false,
      is_no_eligibility: false,
    };
    return {
      id: student.id,
      student_number: student.student_number,
      student_code: student.student_code,
      full_label: student.full_label,
      total1,
      total2,
      finalScore,
      grade,
      is_incomplete: status.is_incomplete,
      is_no_eligibility: status.is_no_eligibility,
    };
  });

  return (
    <SummaryTable
      mode="numeric"
      students={rows}
      isPrimary={isPrimary}
      subjectLabel={subjectLabel}
      teacherLabel={teacherLabel}
      offeringId={anchorOffering.id}
      gradingPeriod={gradingPeriod}
      classroomId={classroomId}
      subjectId={subjectId}
    />
  );
}
