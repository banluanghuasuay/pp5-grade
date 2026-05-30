/**
 * Thai standard government holidays.
 *
 * `FIXED_HOLIDAYS` recur on the same Gregorian date every year.
 * `LUNAR_HOLIDAYS_BY_BE_YEAR` are pegged to the Buddhist lunar calendar and
 * must be maintained manually per BE year (no library does this reliably).
 *
 * Coverage: BE 2569 (CE 2026) is the seed year — extend as the school uses
 * later years. Admin can also override via the "+ เพิ่ม" form.
 */

export type StandardHoliday = {
  /** ISO date string YYYY-MM-DD (CE). */
  date: string;
  name: string;
};

/** Holidays that fall on the same Gregorian date every year. */
const FIXED_HOLIDAY_TEMPLATE: Array<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: "วันขึ้นปีใหม่" },
  { month: 4, day: 6, name: "วันจักรี" },
  { month: 4, day: 13, name: "วันสงกรานต์" },
  { month: 4, day: 14, name: "วันสงกรานต์" },
  { month: 4, day: 15, name: "วันสงกรานต์" },
  { month: 5, day: 1, name: "วันแรงงาน" },
  { month: 5, day: 4, name: "วันฉัตรมงคล" },
  { month: 6, day: 3, name: "วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ" },
  { month: 7, day: 28, name: "วันเฉลิมพระชนมพรรษา ร.10" },
  { month: 8, day: 12, name: "วันเฉลิมพระชนมพรรษา พระบรมราชชนนีพันปีหลวง / วันแม่" },
  { month: 10, day: 13, name: "วันนวมินทรมหาราช" },
  { month: 10, day: 23, name: "วันปิยมหาราช" },
  { month: 12, day: 5, name: "วันคล้ายวันพระบรมราชสมภพ ร.9 / วันพ่อ" },
  { month: 12, day: 10, name: "วันรัฐธรรมนูญ" },
  { month: 12, day: 31, name: "วันสิ้นปี" },
];

/**
 * Lunar holidays — varies per year. Maintain manually per BE year.
 *
 * ⚠️ These dates are based on the Thai government's official Buddhist calendar.
 * Lunar dates can shift by 1 day depending on observation rules — verify with
 * the Royal Thai Government Gazette before relying on these for a new year.
 * Admin can also fix via the UI (✏ edit on each row).
 */
const LUNAR_HOLIDAYS_BY_BE_YEAR: Record<
  number,
  Array<{ date: string; name: string }>
> = {
  2569: [
    { date: "2026-03-04", name: "วันมาฆบูชา" },
    { date: "2026-05-31", name: "วันวิสาขบูชา" },
    { date: "2026-07-29", name: "วันอาสาฬหบูชา" },
    { date: "2026-07-30", name: "วันเข้าพรรษา" },
  ],
  2570: [
    { date: "2027-02-21", name: "วันมาฆบูชา" },
    { date: "2027-05-20", name: "วันวิสาขบูชา" },
    { date: "2027-07-18", name: "วันอาสาฬหบูชา" },
    { date: "2027-07-19", name: "วันเข้าพรรษา" },
  ],
};

/** Format Date → "YYYY-MM-DD" using local time (avoids UTC offset issues). */
function isoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Add Thai substitute holidays (วันหยุดชดเชย) for any holiday that falls on
 * a weekend — convention: shift to the next working day (skipping further
 * weekends/holidays).
 *
 * Example: วันวิสาขบูชา 31 พ.ค. 2569 (อาทิตย์) → ชดเชย 1 มิ.ย. (จันทร์).
 */
function addSubstituteHolidays(
  holidays: StandardHoliday[],
): StandardHoliday[] {
  const taken = new Set(holidays.map((h) => h.date));
  const result: StandardHoliday[] = [...holidays];

  for (const h of holidays) {
    const [y, m, d] = h.date.split("-").map((s) => Number.parseInt(s, 10));
    const date = new Date(y, m - 1, d);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) continue; // weekday — no substitute needed

    // Walk forward until we hit a non-weekend, non-already-taken day
    const next = new Date(date);
    for (let safety = 0; safety < 10; safety++) {
      next.setDate(next.getDate() + 1);
      const nDow = next.getDay();
      if (nDow === 0 || nDow === 6) continue;
      const nIso = isoFromDate(next);
      if (taken.has(nIso)) continue;
      result.push({ date: nIso, name: `ชดเชย${h.name}` });
      taken.add(nIso);
      break;
    }
  }
  return result;
}

/**
 * Build the full list of standard Thai holidays whose dates fall inside
 * the given academic year window.
 *
 * @param yearBe Academic year in BE (e.g. 2569). Fixed-date holidays are
 *   generated for both the start CE year (yearBe - 543) and the next CE
 *   year, then filtered to the [startIso, endIso] range.
 * @param startIso Academic year start date, ISO format (e.g. "2026-05-16").
 * @param endIso Academic year end date, ISO format (e.g. "2027-05-15").
 */
export function buildStandardHolidaysForYear(
  yearBe: number,
  startIso: string,
  endIso: string,
): StandardHoliday[] {
  const baseCe = yearBe - 543;
  const out: StandardHoliday[] = [];

  // Fixed holidays for both calendar years that the school year spans
  for (const ceYear of [baseCe, baseCe + 1]) {
    for (const tpl of FIXED_HOLIDAY_TEMPLATE) {
      const mm = String(tpl.month).padStart(2, "0");
      const dd = String(tpl.day).padStart(2, "0");
      out.push({ date: `${ceYear}-${mm}-${dd}`, name: tpl.name });
    }
  }

  // Lunar holidays for both BE years involved
  for (const beYear of [yearBe, yearBe + 1]) {
    const lunar = LUNAR_HOLIDAYS_BY_BE_YEAR[beYear];
    if (lunar) out.push(...lunar);
  }

  // Add substitute holidays for weekend overlaps
  const withSubstitutes = addSubstituteHolidays(out);

  // Filter to academic year window + sort
  return withSubstitutes
    .filter((h) => h.date >= startIso && h.date <= endIso)
    .sort((a, b) => a.date.localeCompare(b.date));
}
