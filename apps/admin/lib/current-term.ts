import { createClient } from "@pp5/database/server";

/**
 * Phase 2.6 — Current academic year + semester state.
 *
 * Drives the "ภาคเรียนปัจจุบัน" lock:
 *   - past  (sem < current)  → readonly (admin must switch current to edit)
 *   - current                → editable
 *   - future (sem > current) → disabled with "ยังไม่เริ่ม"
 *
 * Returns `null` only when no row has is_current=true — every other case
 * (including when current_semester column is missing on legacy data) falls
 * back to a sensible default so callers don't have to special-case it.
 */
export type CurrentTerm = {
  yearId: string;
  yearBe: number;
  /** 1 = ภาคเรียนที่ 1 (default), 2 = ภาคเรียนที่ 2 */
  semester: 1 | 2;
};

export async function getCurrentTerm(): Promise<CurrentTerm | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_years")
    .select("id, year_be, current_semester")
    .eq("is_current", true)
    .maybeSingle();
  if (!data) return null;
  return {
    yearId: data.id,
    yearBe: data.year_be,
    semester: data.current_semester === 2 ? 2 : 1,
  };
}

/**
 * Human-readable "ภาคเรียนที่ X ปีการศึกษา YYYY" for the current term.
 * Used to name downloaded report PDFs — the print iframe's document.title
 * becomes the browser's Save-as-PDF filename, so each report sets its
 * title to "<ชื่องาน> <suffix>". Empty string when no current year.
 * User spec 2026-05-31.
 */
export async function currentTermSuffix(): Promise<string> {
  const t = await getCurrentTerm();
  return t ? `ภาคเรียนที่ ${t.semester} ปีการศึกษา ${t.yearBe}` : "";
}

/**
 * Compare a target semester against the current term to determine
 * lock state. Useful in both UI (decide disabled/readonly) and
 * server actions (guard writes).
 *
 * If there's no current term at all, treat everything as `future` so the
 * UI shows a clear "ยังไม่มีปีปัจจุบัน" path instead of accidentally
 * letting writes through.
 */
export type SemesterState = "past" | "current" | "future";

export function semesterStateOf(
  target: 1 | 2,
  current: CurrentTerm | null,
): SemesterState {
  if (!current) return "future";
  if (target === current.semester) return "current";
  return target < current.semester ? "past" : "future";
}

/**
 * Server-action guard — throws if the target semester is not the school's
 * current_semester (defense-in-depth alongside the UI readonly state).
 *
 * Pattern: every action that writes to per-semester data (scores,
 * attendance, workdays, pass_fail) should call this before performing the
 * write.
 *
 * `semester=0` ("ทั้งปี" — used by primary characteristic / RT / competency
 * evaluations) is always editable as long as an academic year is active.
 * The per-semester lock only applies to 1 vs 2.
 *
 * Throws with a Thai message so the error surfaces to the user via our
 * existing `alert()`/banner pattern.
 */
export async function ensureSemesterEditable(
  semester: 0 | 1 | 2,
): Promise<void> {
  const current = await getCurrentTerm();
  if (!current) {
    throw new Error("ยังไม่มีปีการศึกษาปัจจุบัน — admin ต้องตั้งปีก่อน");
  }
  // semester=0 is annual scope (primary) — editable whenever there's a
  // current year, regardless of which sub-semester is currently active.
  if (semester === 0) return;
  if (current.semester !== semester) {
    throw new Error(
      `ภาคเรียนที่ ${semester} ถูกล็อค — admin ต้องเปลี่ยน "ภาคเรียนปัจจุบัน" ที่ /setup/academic-years ก่อนแก้`,
    );
  }
}
