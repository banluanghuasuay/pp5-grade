/**
 * Term-week date helpers for /setup/attendance/by-subject.
 *
 * ปพ.5 standard: 20 สัปดาห์/ภาค. Each week is Mon-Fri (5 weekdays).
 *
 * Term start anchor comes from `academic_years.start_date` (ภาค 1) and
 * `academic_years.end_date` (ภาค 2 — column repurposed; see schema). If the
 * column is NULL we fall back to the Thai standard calendar:
 *   - ภาค 1: 16 พ.ค.
 *   - ภาค 2: 1 พ.ย.
 *
 * If the anchor (configured or default) falls on Saturday or Sunday, week 1
 * starts on the FOLLOWING Monday (skip the weekend). For Mon-Fri anchors,
 * week 1 starts on the Monday of THAT same week — so the anchor day itself
 * is INSIDE week 1.
 */

import { THAI_MONTH_SHORT } from "../calendar";

/**
 * Default anchor (ISO date) for ภาค 1/2 of a given Buddhist Era year.
 * Used when `academic_years.start_date` / `end_date` are NULL.
 */
export function defaultAnchorIso(yearBe: number, semester: 1 | 2): string {
  const yearCe = yearBe - 543;
  // เทอม 2 starts in November of the SAME CE year as ภาค 1 (ภาค 2 ของปี
  // 2569 = พ.ย. 2026, ม.ค.-มี.ค. 2027). Both anchors live in baseCe.
  return semester === 1 ? `${yearCe}-05-16` : `${yearCe}-11-01`;
}

/**
 * Resolve the effective anchor date — admin-configured if set, otherwise
 * the standard Thai calendar default.
 */
export function resolveAnchorIso(
  yearBe: number,
  semester: 1 | 2,
  configured: { start_date: string | null; end_date: string | null },
): string {
  // start_date = ภาค 1, end_date = ภาค 2 (column repurpose — see /setup/academic-years)
  const raw = semester === 1 ? configured.start_date : configured.end_date;
  return raw ?? defaultAnchorIso(yearBe, semester);
}

/**
 * Parse an ISO date string (`YYYY-MM-DD`) into a local Date at midnight.
 * Avoids the timezone shift that `new Date("YYYY-MM-DD")` triggers in some
 * runtimes (UTC interpretation).
 */
function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => Number.parseInt(n, 10));
  return new Date(y, m - 1, d);
}

/**
 * Compute the Monday of week 1 from an anchor date.
 *
 * Rules:
 *   - Anchor on Monday          → use that day as week 1 Monday
 *   - Anchor on Tue-Fri         → step back to Monday of the same week
 *   - Anchor on Sat or Sun      → skip the weekend, use next Monday
 */
export function firstMondayFromAnchor(anchorIso: string): Date {
  const date = parseIsoDateLocal(anchorIso);
  const dow = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  if (dow === 0) {
    // Sunday → next Monday (+1)
    date.setDate(date.getDate() + 1);
  } else if (dow === 6) {
    // Saturday → next Monday (+2)
    date.setDate(date.getDate() + 2);
  } else if (dow >= 2) {
    // Tue-Fri → back to Monday of same week
    date.setDate(date.getDate() - (dow - 1));
  }
  // dow === 1 → already Monday
  return date;
}

/**
 * Mon..Fri date range for week N counting from the term anchor.
 * weekIndex is 1-based.
 */
export function weekDateRange(
  anchorIso: string,
  weekIndex: number,
): { start: Date; end: Date } {
  const firstMonday = firstMondayFromAnchor(anchorIso);
  const start = new Date(firstMonday);
  start.setDate(start.getDate() + (weekIndex - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 4); // Mon + 4 = Fri
  return { start, end };
}

/**
 * Compact Thai label for a week's date range — used in the grid header
 * directly below "สัปดาห์ N".
 *   - Same month   → "16-20 พ.ค."
 *   - Cross-month  → "30 พ.ค. - 3 มิ.ย."
 */
export function formatWeekRangeLabel(
  anchorIso: string,
  weekIndex: number,
): string {
  const { start, end } = weekDateRange(anchorIso, weekIndex);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = THAI_MONTH_SHORT[start.getMonth()];
  const endMonth = THAI_MONTH_SHORT[end.getMonth()];
  if (start.getMonth() === end.getMonth()) {
    return `${startDay}-${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}
