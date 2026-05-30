/**
 * Phase 2.7 — Shared rules for "ประเมินตามหลักสูตร" evaluations.
 *
 * Three features use the same 0-3 scale and the same summary thresholds:
 *   - คุณลักษณะอันพึงประสงค์ (variable count, default 8)
 *   - อ่าน คิด เขียน (3 fixed dimensions)
 *   - สมรรถนะสำคัญ (5 fixed dimensions)
 *
 * Summary rule (per user spec):
 *   - Any single dimension scored 0 → overall = "ไม่ผ่าน" (gating)
 *   - Otherwise → take the **mode** (most common value) and map:
 *       3 → ดีเยี่ยม
 *       2 → ดี
 *       1 → ผ่าน
 *     Ties between values break to the lower (conservative).
 */

export type EvalLabel = "ดีเยี่ยม" | "ดี" | "ผ่าน" | "ไม่ผ่าน";

/**
 * Compute the summary label from an array of 0-3 scores.
 *
 * Returns `null` if scores are missing (not yet evaluated) — UI shows "—".
 * Returns "ไม่ผ่าน" if any single score is 0 (gating rule).
 * Otherwise returns the label of the mode (most-frequent value), with ties
 * broken toward the LOWER value (conservative grading).
 *
 * Example: scores [2,2,3,3,3,2,2,3] → mode tied 2 vs 3 → returns "ดี" (=2).
 * Example: scores [3,3,3,1,2,2,3,3] → mode = 3 → returns "ดีเยี่ยม".
 */
export function summarize0to3(
  scores: Array<number | null | undefined>,
): EvalLabel | null {
  if (scores.length === 0) return null;
  // Missing data → defer the summary
  if (scores.some((s) => s == null)) return null;
  // Gating: any 0 → fail (regardless of mode below)
  if (scores.some((s) => s === 0)) return "ไม่ผ่าน";

  // Count each value 0..3. Ties broken by lowest value because we iterate
  // 0,1,2,3 with a STRICT > comparison — equal counts at a higher value
  // don't displace the lower one.
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const s of scores) {
    const n = s as number;
    if (counts[n] != null) counts[n]++;
  }

  let mode = 0;
  let best = -1;
  for (const v of [0, 1, 2, 3] as const) {
    if (counts[v] > best) {
      best = counts[v];
      mode = v;
    }
  }

  if (mode === 3) return "ดีเยี่ยม";
  if (mode === 2) return "ดี";
  if (mode === 1) return "ผ่าน";
  // Unreachable in practice — the "any 0" gate above catches mode=0 cases.
  return "ไม่ผ่าน";
}

/** Tailwind color classes for a single 0-3 cell value. Re-used in all grids. */
export function cellColorClass(score: number | null | undefined): string {
  if (score == null) return "bg-zinc-50 text-zinc-400";
  if (score === 3) return "bg-emerald-100 text-emerald-800";
  if (score === 2) return "bg-sky-100 text-sky-800";
  if (score === 1) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800"; // 0
}

/** Tailwind color classes for the summary label cell. */
export function summaryColorClass(label: EvalLabel | null): string {
  if (label === "ดีเยี่ยม") return "bg-emerald-100 text-emerald-800";
  if (label === "ดี") return "bg-sky-100 text-sky-800";
  if (label === "ผ่าน") return "bg-amber-100 text-amber-800";
  if (label === "ไม่ผ่าน") return "bg-rose-100 text-rose-800";
  return "bg-zinc-50 text-zinc-400";
}
