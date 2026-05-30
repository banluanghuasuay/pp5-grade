/**
 * Thai school calendar helpers for the attendance page.
 *
 * Term boundaries (hard-coded — standard Thai school year):
 *   - เทอม 1: 16 พ.ค. - 10 ต.ค.   (months 5-10)
 *   - เทอม 2: 1 พ.ย. - 31 มี.ค.    (months 11-3 across the year boundary)
 */

export type Term = 1 | 2;

export const THAI_MONTH_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/** Full Thai month names — used on printed reports where space allows. */
export const THAI_MONTH_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** Thai day-of-week (Sun=index 0). One character abbreviation. */
export const THAI_DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/** Months in each term, in the order they appear in tabs. */
export const TERM_MONTHS: Record<Term, number[]> = {
  1: [5, 6, 7, 8, 9, 10],
  2: [11, 12, 1, 2, 3],
};

/**
 * Resolve the Christian calendar year for a given (academic year BE, month, term).
 *
 * For เทอม 1: all months stay in the same CE year (BE - 543).
 * For เทอม 2: months 11-12 are in BE-543, months 1-3 roll over to BE-542.
 */
export function resolveCalendarYear(
  yearBe: number,
  month: number,
  term: Term,
): number {
  const baseCe = yearBe - 543;
  if (term === 1) return baseCe;
  if (month >= 11) return baseCe;
  return baseCe + 1;
}

/** Number of days in a given (CE year, 1-12 month). */
export function daysInMonth(yearCe: number, month: number): number {
  return new Date(yearCe, month, 0).getDate();
}

/** Build day-of-week label for a given date. */
export function dayOfWeekLabel(yearCe: number, month: number, day: number): string {
  const d = new Date(yearCe, month - 1, day);
  return THAI_DOW[d.getDay()];
}

/** Format a Date as 'YYYY-MM-DD' for DB storage. */
export function formatIsoDate(yearCe: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yearCe}-${mm}-${dd}`;
}

/** Pick the default month for a term (used as initial tab). */
export function defaultMonthForTerm(term: Term): number {
  return TERM_MONTHS[term][0];
}

/** Validate that a month belongs to a term — defensive. */
export function isMonthInTerm(month: number, term: Term): boolean {
  return TERM_MONTHS[term].includes(month);
}

/**
 * Phase 2.6 — map a calendar date (YYYY-MM-DD) to its Thai semester.
 * Returns null for April (between-term break — no attendance allowed).
 * Used by server-action guards to look up which semester a date belongs to.
 */
export function semesterFromIsoDate(iso: string): Term | null {
  // "2026-05-16" → month part = "05"
  const m = Number.parseInt(iso.split("-")[1] ?? "", 10);
  if (!Number.isFinite(m)) return null;
  if (TERM_MONTHS[1].includes(m)) return 1;
  if (TERM_MONTHS[2].includes(m)) return 2;
  return null;
}
