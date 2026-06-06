import { createClient } from "@pp5/database/server";

/**
 * Student report-card (ปพ.6) data layer.
 *
 * Subjects come from the student's ENROLLMENT → classroom → study plan (so the
 * report shows the full curriculum even before any grade is entered). Grades
 * are overlaid from the `grades` table (finalized only, via RLS) — a subject
 * with no finalized grade shows "—". GPA counts finalized grades only.
 *
 * Students can read: own enrollments, study_plans + study_plan_subjects (USING
 * TRUE), subjects/grade_levels/academic_years (USING TRUE), own finalized
 * grades + own evals. They CANNOT read raw `scores`.
 */

export type Term = {
  yearId: string;
  yearBe: number;
  /** 0 = annual (ประถม) · 1|2 = secondary semester */
  semester: 0 | 1 | 2;
  system: "primary" | "secondary";
  studyPlanId: string | null;
  label: string;
  /** stable key for URL + dedup, e.g. "2569-1" */
  key: string;
};

export type CurriculumSubject = {
  id: string;
  code: string;
  name: string;
  category: "core" | "additional" | "activity";
  creditHours: number | null;
  hoursPerYear: number | null;
  learningAreaSort: number;
};

export type NumericSubjectRow = {
  code: string;
  name: string;
  grade: number | null;
  special: "ร" | "มส" | null;
};

export type ActivitySubjectRow = {
  code: string;
  name: string;
  result: "ผ" | "มผ" | null;
};

export type TermReport = {
  numeric: NumericSubjectRow[];
  activity: ActivitySubjectRow[];
  gpa: number;
  /** how many numeric subjects actually have a finalized grade (drives whether
   *  the GPA box is meaningful yet) */
  gradedCount: number;
};

export type EvalSummary = {
  characteristic: number | null;
  reading: number | null;
  competency: number | null;
};

type GradeRow = {
  grading_period: "semester" | "annual";
  total_score: number | null;
  grade: number | null;
  pass_fail: "pass" | "fail" | null;
  is_incomplete: boolean | null;
  is_no_eligibility: boolean | null;
  offering: {
    semester: number;
    subject: { id: string } | null;
    classroom: { academic_year: { year_be: number } | null } | null;
  } | null;
};

const CATEGORY_ORDER: Record<"core" | "additional" | "activity", number> = {
  core: 0,
  additional: 1,
  activity: 2,
};

/** Overall level (0-3): any sub-score of 0 → 0 (ไม่ผ่าน); else MODE; tie → higher. */
function overallLevel(scores: Array<number | null | undefined>): number | null {
  const valid = scores.filter((n): n is number => typeof n === "number");
  if (valid.length === 0) return null;
  if (valid.some((n) => n === 0)) return 0;
  const counts = new Map<number, number>();
  for (const n of valid) counts.set(n, (counts.get(n) ?? 0) + 1);
  let best = -1;
  let bestCount = -1;
  for (const [val, cnt] of counts) {
    if (cnt > bestCount || (cnt === bestCount && val > best)) {
      best = val;
      bestCount = cnt;
    }
  }
  return best;
}

/** Level (0-3) → สพฐ label. null = ยังไม่ประเมิน. */
export function levelLabel(level: number | null): string {
  if (level == null) return "—";
  if (level >= 3) return "ดีเยี่ยม";
  if (level === 2) return "ดี";
  if (level === 1) return "ผ่าน";
  return "ไม่ผ่าน";
}

/** Terms the student is enrolled in (newest first) — independent of grades. */
export async function fetchTerms(studentId: string): Promise<Term[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select(
      `
      semester,
      classroom:classrooms!classroom_id (
        study_plan_id,
        grade_level:grade_levels!grade_level_id ( system ),
        academic_year:academic_years!academic_year_id ( id, year_be )
      )
    `,
    )
    .eq("student_id", studentId);

  const map = new Map<string, Term>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const e of (data ?? []) as any[]) {
    const c = e.classroom;
    const ay = c?.academic_year;
    const system: "primary" | "secondary" | undefined = c?.grade_level?.system;
    if (!ay?.id || !ay.year_be || !system) continue;
    const semester: 0 | 1 | 2 =
      system === "primary" ? 0 : e.semester === 2 ? 2 : 1;
    const key = `${ay.year_be}-${semester}`;
    if (!map.has(key)) {
      map.set(key, {
        yearId: ay.id,
        yearBe: ay.year_be,
        semester,
        system,
        studyPlanId: c.study_plan_id ?? null,
        key,
        label:
          semester === 0
            ? `ปีการศึกษา ${ay.year_be}`
            : `ภาคเรียนที่ ${semester} ปีการศึกษา ${ay.year_be}`,
      });
    }
  }
  return [...map.values()].sort(
    (a, b) => b.yearBe - a.yearBe || b.semester - a.semester,
  );
}

/** Pick the term matching `key`, else the latest. */
export function pickTerm(terms: Term[], key?: string): Term | null {
  if (terms.length === 0) return null;
  if (key) {
    const found = terms.find((t) => t.key === key);
    if (found) return found;
  }
  return terms[0];
}

/** Curriculum subjects for a term, ordered พื้นฐาน→เพิ่มเติม→กิจกรรม, then by
 *  กลุ่มสาระ (learning_areas.sort_order), then code. */
export async function fetchTermSubjects(
  studyPlanId: string,
  yearId: string,
  semester: 0 | 1 | 2,
): Promise<CurriculumSubject[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_plan_subjects")
    .select(
      `
      subject:subjects!subject_id (
        id, code, name_th, category, credit_hours, hours_per_year,
        semester, academic_year_id,
        learning_area:learning_areas!learning_area_id ( sort_order )
      )
    `,
    )
    .eq("study_plan_id", studyPlanId);

  const subjects: CurriculumSubject[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data ?? []) as any[]) {
    const s = r.subject;
    if (!s) continue;
    if (s.academic_year_id !== yearId) continue;
    if (s.semester !== semester) continue;
    subjects.push({
      id: s.id,
      code: s.code,
      name: s.name_th,
      category: s.category,
      creditHours: s.credit_hours,
      hoursPerYear: s.hours_per_year,
      learningAreaSort: s.learning_area?.sort_order ?? 999,
    });
  }

  subjects.sort((a, b) => {
    const byCat = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (byCat !== 0) return byCat;
    if (a.learningAreaSort !== b.learningAreaSort) {
      return a.learningAreaSort - b.learningAreaSort;
    }
    return a.code.localeCompare(b.code, "th");
  });
  return subjects;
}

/** Fetch the student's finalized grades (RLS-scoped) — overlaid onto the
 *  curriculum subject list. Empty before any grade is finalized. */
async function fetchGrades(studentId: string): Promise<GradeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grades")
    .select(
      `
      grading_period, total_score, grade, pass_fail, is_incomplete, is_no_eligibility,
      offering:subject_offerings!offering_id (
        semester,
        subject:subjects!subject_id ( id ),
        classroom:classrooms!classroom_id (
          academic_year:academic_years!academic_year_id ( year_be )
        )
      )
    `,
    )
    .eq("student_id", studentId)
    .not("finalized_at", "is", null);

  return (data ?? []) as unknown as GradeRow[];
}

/** Build the term's report: every curriculum subject, with its finalized grade
 *  overlaid (or "—"), plus GPA over the graded numeric subjects. */
export async function buildTermReport(
  studentId: string,
  curriculum: CurriculumSubject[],
  term: Term,
): Promise<TermReport> {
  const grades = await fetchGrades(studentId);

  // index this term's grades by subject id
  const gradeBySubject = new Map<string, GradeRow>();
  for (const g of grades) {
    const off = g.offering;
    if (off?.classroom?.academic_year?.year_be !== term.yearBe) continue;
    const sem: 0 | 1 | 2 =
      g.grading_period === "annual" ? 0 : off!.semester === 2 ? 2 : 1;
    if (sem !== term.semester) continue;
    if (off?.subject?.id) gradeBySubject.set(off.subject.id, g);
  }

  const numeric: NumericSubjectRow[] = [];
  const activity: ActivitySubjectRow[] = [];
  let weightedGradeSum = 0;
  let weightSum = 0;
  let gradedCount = 0;

  for (const subj of curriculum) {
    const g = gradeBySubject.get(subj.id);

    if (subj.category === "activity") {
      activity.push({
        code: subj.code,
        name: subj.name,
        result:
          g?.pass_fail === "pass" ? "ผ" : g?.pass_fail === "fail" ? "มผ" : null,
      });
      continue;
    }

    const special: "ร" | "มส" | null = g?.is_no_eligibility
      ? "มส"
      : g?.is_incomplete
        ? "ร"
        : null;
    const grade = g?.grade ?? null;

    numeric.push({ code: subj.code, name: subj.name, grade, special });

    if (grade != null && !special) {
      gradedCount += 1;
      const weight =
        term.system === "primary"
          ? (subj.hoursPerYear ?? 0) / 40
          : (subj.creditHours ?? 1);
      weightedGradeSum += grade * weight;
      weightSum += weight;
    }
  }

  const gpa = weightSum > 0 ? weightedGradeSum / weightSum : 0;
  return { numeric, activity, gpa, gradedCount };
}

/**
 * The three สพฐ evaluations for a term, each summarised to one level via
 * `overallLevel` (mode, any-0 → ไม่ผ่าน). RLS scopes to the student's own rows.
 */
export async function fetchTermEvals(
  studentId: string,
  yearId: string,
  semester: 0 | 1 | 2,
): Promise<EvalSummary> {
  const supabase = await createClient();
  const [charRes, rtRes, compRes] = await Promise.all([
    supabase
      .from("characteristic_evaluations")
      .select("score")
      .eq("student_id", studentId)
      .eq("academic_year_id", yearId)
      .eq("semester", semester),
    supabase
      .from("reading_thinking_evaluations")
      .select("reading_score, thinking_score, writing_score")
      .eq("student_id", studentId)
      .eq("academic_year_id", yearId)
      .eq("semester", semester)
      .maybeSingle(),
    supabase
      .from("competency_evaluations")
      .select(
        "communication_score, thinking_score, problem_solving_score, life_skills_score, technology_score",
      )
      .eq("student_id", studentId)
      .eq("academic_year_id", yearId)
      .eq("semester", semester)
      .maybeSingle(),
  ]);

  const charScores = (charRes.data ?? []).map((r) => r.score);
  const rt = rtRes.data;
  const comp = compRes.data;

  return {
    characteristic: overallLevel(charScores),
    reading: rt
      ? overallLevel([rt.reading_score, rt.thinking_score, rt.writing_score])
      : null,
    competency: comp
      ? overallLevel([
          comp.communication_score,
          comp.thinking_score,
          comp.problem_solving_score,
          comp.life_skills_score,
          comp.technology_score,
        ])
      : null,
  };
}
