/**
 * Utility helpers for Phase 2.4 — สรุปผล/ตัดเกรด.
 *
 * Pure functions: no DB access, no React. The page server-component fetches
 * `grade_scales` + `scores` then passes data here.
 */

export type GradeScale = {
  min_score: number;
  max_score: number;
  grade: number; // 0, 0.5, 1, 1.5, ..., 4
};

/**
 * Sum all categories for one student in one semester offering.
 *
 * `categoryIds` is the offering's 11 category ids (10 ระหว่างภาค + ปลายภาค).
 * `scoresByStudentCategory` is a lookup: `${studentId}|${categoryId}` → number.
 *
 * Missing (un-entered) scores count as 0 — same convention as the score grid:
 * empty cell = "not entered yet" = 0 contribution.
 */
export function sumStudentSemesterScore(
  studentId: string,
  categoryIds: string[],
  scoresByStudentCategory: Map<string, number>,
): number {
  let sum = 0;
  for (const cid of categoryIds) {
    const v = scoresByStudentCategory.get(`${studentId}|${cid}`);
    if (typeof v === "number" && Number.isFinite(v)) sum += v;
  }
  return sum;
}

/**
 * Cut a numeric grade (0..4 in 0.5 steps) using the school's grade_scales.
 *
 * Convention from schema seed:
 *   80–100 → 4.0, 75–79 → 3.5, 70–74 → 3.0, ..., 0–49 → 0
 *
 * Falls back to 0 if no scale matches (shouldn't happen — the 0–49 row covers
 * everything below 50).
 */
export function cutGrade(score: number, scales: GradeScale[]): number {
  if (!Number.isFinite(score)) return 0;
  const clamped = Math.max(0, Math.min(100, score));
  for (const s of scales) {
    if (clamped >= s.min_score && clamped <= s.max_score) return s.grade;
  }
  return 0;
}

/**
 * Activity subjects (grading_mode = 'pass_fail') have NO scores entered.
 * The teacher/admin manually selects "ผ่าน" (pass) or "ไม่ผ่าน" (fail) on the
 * summary tab — there is no auto-cut from a numeric total.
 *
 * (So no helper needed here — the dropdown writes directly to grades.pass_fail.)
 */

/**
 * For ประถม (primary), annual grade is computed from the AVERAGE of two
 * semesters' totals (each total is out of 100).
 *
 * If only one semester has any data (e.g. before mid-year), we still average
 * against 0 — matches the user's instruction that ภาค 1 + ภาค 2 รวม / 2.
 */
export function averageTwoSemesters(s1: number, s2: number): number {
  return (s1 + s2) / 2;
}

/**
 * Abbreviate the Thai title prefix for compact display in tight columns
 * (score grid, pass-fail grid, summary). Mirrors the helper used in
 * /setup/attendance for visual consistency.
 *
 *   เด็กชาย  → ด.ช.
 *   เด็กหญิง → ด.ญ.
 *   นางสาว   → น.ส.
 *   (others, null, undefined → returned as-is / empty)
 */
export function abbreviateTitle(title: string | null | undefined): string {
  if (!title) return "";
  if (title === "เด็กชาย") return "ด.ช.";
  if (title === "เด็กหญิง") return "ด.ญ.";
  if (title === "นางสาว") return "น.ส.";
  return title;
}
