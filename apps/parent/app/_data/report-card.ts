import { createClient } from "@pp5/database/server";

/**
 * Student report-card (ปพ.6) data layer — reads the student's OWN finalized
 * grades + evaluations via RLS. The `grades` table already stores the computed
 * grade/total/pass-fail per subject, so the student app just reads + groups
 * them; no recompute from raw scores (which students can't read anyway).
 */

export type GradeRow = {
  grading_period: "semester" | "annual";
  total_score: number | null;
  grade: number | null;
  pass_fail: "pass" | "fail" | null;
  is_incomplete: boolean | null;
  is_no_eligibility: boolean | null;
  offering: {
    semester: number;
    subject: {
      id: string;
      code: string;
      name_th: string;
      category: "core" | "additional" | "activity";
      credit_hours: number | null;
      hours_per_year: number | null;
    } | null;
    classroom: {
      room_number: number;
      grade_level: {
        name_th: string;
        name_short: string;
        system: "primary" | "secondary";
      } | null;
      academic_year: { id: string; year_be: number } | null;
    } | null;
  } | null;
};

export type Term = {
  yearId: string;
  yearBe: number;
  /** 0 = annual (ประถม) · 1|2 = secondary semester */
  semester: 0 | 1 | 2;
  system: "primary" | "secondary";
  label: string;
  /** stable key for URL + dedup, e.g. "2569-1" */
  key: string;
};

export type NumericSubjectRow = {
  code: string;
  name: string;
  category: "core" | "additional";
  grade: number | null;
  totalScore: number | null;
  /** "ร" (incomplete) · "มส" (no exam eligibility) · null */
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
};

/** Overall level (0-3) per user spec: any sub-score of 0 → 0 (ไม่ผ่าน);
 *  otherwise the MODE (ฐานนิยม) of the scores; on a tie → the higher level. */
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

export type EvalSummary = {
  characteristic: number | null;
  reading: number | null;
  competency: number | null;
};

/** Fetch all of the logged-in student's finalized grades (RLS-scoped). */
export async function fetchStudentGrades(studentId: string): Promise<GradeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grades")
    .select(
      `
      grading_period, total_score, grade, pass_fail, is_incomplete, is_no_eligibility,
      offering:subject_offerings!offering_id (
        semester,
        subject:subjects!subject_id (
          id, code, name_th, category, credit_hours, hours_per_year
        ),
        classroom:classrooms!classroom_id (
          room_number,
          grade_level:grade_levels!grade_level_id ( name_th, name_short, system ),
          academic_year:academic_years!academic_year_id ( id, year_be )
        )
      )
    `,
    )
    .eq("student_id", studentId)
    .not("finalized_at", "is", null);

  return (data ?? []) as unknown as GradeRow[];
}

/** Which (year, semester) the student has grades for — newest first. */
export function deriveTerms(grades: GradeRow[]): Term[] {
  const map = new Map<string, Term>();
  for (const g of grades) {
    const ay = g.offering?.classroom?.academic_year;
    const system = g.offering?.classroom?.grade_level?.system;
    if (!ay?.id || !ay.year_be || !system) continue;
    const semester: 0 | 1 | 2 =
      g.grading_period === "annual" ? 0 : g.offering!.semester === 2 ? 2 : 1;
    const key = `${ay.year_be}-${semester}`;
    if (!map.has(key)) {
      map.set(key, {
        yearId: ay.id,
        yearBe: ay.year_be,
        semester,
        system,
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

/** Build numeric-subject rows + activity rows + GPA for one term. */
export function buildTermReport(grades: GradeRow[], term: Term): TermReport {
  const numeric: NumericSubjectRow[] = [];
  const activity: ActivitySubjectRow[] = [];
  let weightedGradeSum = 0;
  let weightSum = 0;

  for (const g of grades) {
    const off = g.offering;
    if (off?.classroom?.academic_year?.year_be !== term.yearBe) continue;
    const sem: 0 | 1 | 2 =
      g.grading_period === "annual" ? 0 : off!.semester === 2 ? 2 : 1;
    if (sem !== term.semester) continue;

    const subj = off?.subject;
    if (!subj) continue;

    if (subj.category === "activity") {
      activity.push({
        code: subj.code,
        name: subj.name_th,
        result:
          g.pass_fail === "pass" ? "ผ" : g.pass_fail === "fail" ? "มผ" : null,
      });
      continue;
    }

    const special: "ร" | "มส" | null = g.is_no_eligibility
      ? "มส"
      : g.is_incomplete
        ? "ร"
        : null;

    numeric.push({
      code: subj.code,
      name: subj.name_th,
      category: subj.category as "core" | "additional",
      grade: g.grade,
      totalScore: g.total_score,
      special,
    });

    // GPA — weighted by หน่วยกิต (มัธยม) / hours_per_year/40 (ประถม).
    // Only count subjects with a real grade (skip ร/มส).
    if (g.grade != null && !special) {
      const weight =
        term.system === "primary"
          ? (subj.hours_per_year ?? 0) / 40
          : (subj.credit_hours ?? 1);
      weightedGradeSum += g.grade * weight;
      weightSum += weight;
    }
  }

  numeric.sort((a, b) => a.code.localeCompare(b.code, "th"));
  activity.sort((a, b) => a.code.localeCompare(b.code, "th"));
  const gpa = weightSum > 0 ? weightedGradeSum / weightSum : 0;
  return { numeric, activity, gpa };
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
