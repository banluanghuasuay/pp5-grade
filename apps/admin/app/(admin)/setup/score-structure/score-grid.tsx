"use client";

import { ArrowRight, Target } from "lucide-react";
import { useState, useTransition } from "react";
import { saveCategoryMaxScore, saveScore } from "./actions";

export type Category = {
  id: string;
  /**
   * Primary:   1..10 = "ระหว่างภาค", 11 = "ปลายภาค" (is_final).
   * Secondary: 1..5 = ก่อนกลางภาค, 6 = กลางภาค (is_midterm),
   *            7..11 = หลังกลางภาค, 12 = ปลายภาค (is_final).
   */
  sort_order: number;
  max_score: number;
  is_midterm: boolean;
  is_final: boolean;
};

export type StudentRow = {
  id: string;
  student_number: number;
  /** Pre-abbreviated display label, e.g. "ด.ช.สมชาย ใจดี" */
  full_label: string;
  /** Map category_id → score (or null/undefined if not entered). */
  scores: Record<string, number | null>;
};

type Props = {
  categories: Category[]; // exactly 11, sort 1..11
  students: StudentRow[];
  /** Phase 2.6 — true for past/locked semesters: disable inputs, no save. */
  readonly?: boolean;
};

const COLLECT_SLOTS = 10;

/**
 * Column widths — inline styles (not Tailwind classes) because Tailwind
 * classes on `<col>` were not being honored by the browser, leaving columns
 * to be distributed evenly inside the container and squashing score inputs.
 *
 * Frozen panel = เลขที่ (48) + ชื่อ (160) = 208px
 * Total table  = 48 + 160 + 10*64 + 80 + 64 + 80 = 1072px
 *                (mobile viewport < 1072 → horizontal scroll kicks in)
 */
const W = {
  num: 48,
  name: 160,
  score: 64, // bumped from 56 — inputs were unreadable on mobile
  collectTotal: 80,
  final: 64,
  grandTotal: 80,
};

// Sticky-left offsets (must match cumulative widths above).
const NAME_LEFT = W.num; // 48

// Pre-compute total min-width — used to force horizontal scroll on small
// viewports even if the browser ignores <col> sizes.
const TABLE_MIN_W =
  W.num + W.name + COLLECT_SLOTS * W.score + W.collectTotal + W.final + W.grandTotal;

/** Round display: integers stay integer, decimals show as-is. */
function num(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? String(n) : String(n);
}

/**
 * Parse a raw input string into a score number.
 *
 * Negative → 0. Blank → null (clears the cell).
 *
 * NOTE: we deliberately allow values above the category's max_score so admin
 * can enter bonus points. The UI marks over-max cells in red, but the value
 * is stored as-is. The schema DECIMAL(5,2) ceiling is 999.99 so we clamp
 * there only to avoid Postgres overflow.
 */
function parseScore(v: string): number | null {
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 999.99) return 999.99;
  return n;
}

export function ScoreGrid({ categories, students, readonly = false }: Props) {
  // Local state: max_scores per category + scores per student×category
  // Optimistic — server is fire-and-forget on blur.
  const [maxScores, setMaxScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, c.max_score])),
  );
  const [scores, setScores] = useState<
    Record<string, Record<string, number | null>>
  >(() =>
    Object.fromEntries(students.map((s) => [s.id, { ...s.scores }])),
  );
  const [, startTransition] = useTransition();

  // Identify the 10 collect categories + 1 final category — defensive dedupe
  // by sort_order in case legacy data has duplicates the server cleanup missed.
  const sortedRaw = categories
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  const seenSort = new Set<number>();
  const sorted = sortedRaw.filter((c) => {
    if (seenSort.has(c.sort_order)) return false;
    seenSort.add(c.sort_order);
    return true;
  });
  const collectCats = sorted.filter((c) => c.sort_order <= COLLECT_SLOTS);
  const finalCat = sorted.find((c) => c.sort_order === COLLECT_SLOTS + 1);

  // Helpers: compute sums from local state
  const collectMax = collectCats.reduce(
    (sum, c) => sum + (maxScores[c.id] ?? 0),
    0,
  );
  const finalMax = finalCat ? (maxScores[finalCat.id] ?? 0) : 0;
  const grandMax = collectMax + finalMax;

  const studentCollectSum = (studentId: string) =>
    collectCats.reduce((s, c) => s + (scores[studentId]?.[c.id] ?? 0), 0);
  const studentFinalScore = (studentId: string) =>
    finalCat ? (scores[studentId]?.[finalCat.id] ?? 0) : 0;
  const studentTotal = (studentId: string) =>
    studentCollectSum(studentId) + studentFinalScore(studentId);

  // ----- handlers -----
  const onMaxBlur = (categoryId: string, value: string) => {
    const n = Math.max(0, Number.parseFloat(value || "0") || 0);
    setMaxScores((prev) => ({ ...prev, [categoryId]: n }));

    const fd = new FormData();
    fd.set("category_id", categoryId);
    fd.set("max_score", String(n));
    startTransition(async () => {
      try {
        await saveCategoryMaxScore(fd);
      } catch (e) {
        console.error("saveCategoryMaxScore failed", e);
      }
    });
  };

  const onScoreBlur = (
    studentId: string,
    categoryId: string,
    raw: string,
  ) => {
    const next = parseScore(raw);
    setScores((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [categoryId]: next },
    }));

    const fd = new FormData();
    fd.set("student_id", studentId);
    fd.set("category_id", categoryId);
    fd.set("score", next == null ? "" : String(next));
    startTransition(async () => {
      try {
        await saveScore(fd);
      } catch (e) {
        console.error("saveScore failed", e);
      }
    });
  };

  return (
    <>
      <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-xs font-bold">
          i
        </span>
        ตั้ง <strong>&ldquo;คะแนนเต็ม&rdquo;</strong>{" "}
        บรรทัดแรกก่อนกรอกคะแนนนักเรียน
      </div>

      <div className="overflow-x-auto">
        <table
          // w-full fills the card's white space when there's room; minWidth
          // keeps the 11-column layout intact on narrow viewports.
          className="w-full table-fixed border-separate border-spacing-0 text-sm"
          style={{ minWidth: TABLE_MIN_W }}
        >
          <colgroup>
            <col style={{ width: W.num }} />
            <col style={{ width: W.name }} />
            {collectCats.map((c) => (
              <col key={c.id} style={{ width: W.score }} />
            ))}
            <col style={{ width: W.collectTotal }} />
            <col style={{ width: W.final }} />
            <col style={{ width: W.grandTotal }} />
          </colgroup>

          <thead>
            {/* Row 1 — group headers */}
            <tr>
              <th
                style={{
                  left: 0,
                  width: W.num,
                  minWidth: W.num,
                  maxWidth: W.num,
                }}
                className="sticky z-10 border-b border-zinc-200 bg-zinc-100 px-2 py-2 text-xs font-medium uppercase text-zinc-500"
              >
                ที่
              </th>
              <th
                style={{
                  left: NAME_LEFT,
                  width: W.name,
                  minWidth: W.name,
                  maxWidth: W.name,
                }}
                className="sticky z-10 border-b border-zinc-200 bg-zinc-100 px-3 py-2 text-left text-xs font-medium uppercase text-zinc-500"
              >
                ชื่อ-สกุล
              </th>
              <th
                colSpan={COLLECT_SLOTS}
                className="border-b border-l border-zinc-200 bg-emerald-50 px-2 py-2 text-center text-xs font-semibold text-emerald-800"
              >
                คะแนนระหว่างภาค
              </th>
              <th
                style={{ width: W.collectTotal }}
                className="border-b border-l border-zinc-200 bg-emerald-100 px-2 py-2 text-center text-xs font-semibold text-emerald-800"
              >
                รวมระหว่างภาค
              </th>
              <th
                style={{ width: W.final }}
                className="border-b border-l border-zinc-200 bg-amber-50 px-2 py-2 text-center text-xs font-semibold text-amber-800"
              >
                ปลายภาค
              </th>
              <th
                style={{ width: W.grandTotal }}
                className="border-b border-l border-zinc-200 bg-violet-100 px-2 py-2 text-center text-xs font-semibold text-violet-800"
              >
                รวมทั้งหมด
              </th>
            </tr>
            {/* Row 2 — sub-column numbers (1..10) */}
            <tr>
              <th
                style={{ left: 0, width: W.num, minWidth: W.num, maxWidth: W.num }}
                className="sticky z-10 border-b border-zinc-200 bg-zinc-50"
              />
              <th
                style={{ left: NAME_LEFT, width: W.name, minWidth: W.name, maxWidth: W.name }}
                className="sticky z-10 border-b border-zinc-200 bg-zinc-50"
              />
              {collectCats.map((c) => (
                <th
                  key={c.id}
                  style={{ width: W.score }}
                  className="border-b border-l border-zinc-200 bg-zinc-50 px-1 py-1.5 text-center text-xs font-medium text-zinc-600"
                >
                  {c.sort_order}
                </th>
              ))}
              <th
                style={{ width: W.collectTotal }}
                className="border-b border-l border-zinc-200 bg-zinc-50"
              />
              <th
                style={{ width: W.final }}
                className="border-b border-l border-zinc-200 bg-zinc-50"
              />
              <th
                style={{ width: W.grandTotal }}
                className="border-b border-l border-zinc-200 bg-zinc-50"
              />
            </tr>
          </thead>

          <tbody>
            {/* "คะแนนเต็ม" row — admin sets max_score per column */}
            <tr className="bg-violet-50/50">
              <td
                style={{ left: 0, width: W.num, minWidth: W.num, maxWidth: W.num }}
                className="sticky z-10 border-b border-zinc-200 bg-violet-50 px-2 py-2 text-center"
              >
                <Target
                  className="mx-auto h-4 w-4 text-violet-700"
                  aria-hidden
                />
              </td>
              <td
                style={{
                  left: NAME_LEFT,
                  width: W.name,
                  minWidth: W.name,
                  maxWidth: W.name,
                }}
                className="sticky z-10 border-b border-zinc-200 bg-violet-50 px-3 py-2 font-semibold text-violet-900"
              >
                <div className="flex items-center justify-end gap-1.5">
                  บันทึกคะแนนเต็ม
                  <ArrowRight className="size-4" aria-hidden />
                </div>
              </td>
              {collectCats.map((c) => (
                <td
                  key={c.id}
                  style={{ width: W.score }}
                  className="border-b border-l border-zinc-200 px-1 py-1 text-center"
                >
                  <input
                    type="number"
                    min={0}
                    max={999}
                    step="1"
                    defaultValue={maxScores[c.id] ?? 0}
                    disabled={readonly}
                    onBlur={(e) => onMaxBlur(c.id, e.target.value)}
                    className="w-full rounded border border-violet-200 bg-white px-1 py-1 text-center text-sm font-medium text-violet-900 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:bg-zinc-100 disabled:text-zinc-400"
                  />
                </td>
              ))}
              <td
                style={{ width: W.collectTotal }}
                className="border-b border-l border-zinc-200 bg-emerald-100 px-2 py-2 text-center text-sm font-bold text-emerald-900"
              >
                {collectMax}
              </td>
              <td
                style={{ width: W.final }}
                className="border-b border-l border-zinc-200 px-1 py-1 text-center"
              >
                {finalCat && (
                  <input
                    type="number"
                    min={0}
                    max={999}
                    step="1"
                    defaultValue={maxScores[finalCat.id] ?? 0}
                    disabled={readonly}
                    onBlur={(e) => onMaxBlur(finalCat.id, e.target.value)}
                    className="w-full rounded border border-amber-200 bg-white px-1 py-1 text-center text-sm font-medium text-amber-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-zinc-100 disabled:text-zinc-400"
                  />
                )}
              </td>
              <td
                style={{ width: W.grandTotal }}
                className="border-b border-l border-zinc-200 bg-violet-100 px-2 py-2 text-center text-sm font-bold text-violet-900"
              >
                {grandMax}
              </td>
            </tr>

            {/* Student rows */}
            {students.map((s) => {
              const sCollect = studentCollectSum(s.id);
              const sTotal = studentTotal(s.id);
              return (
                <tr key={s.id} className="group">
                  <td
                    style={{ left: 0, width: W.num, minWidth: W.num, maxWidth: W.num }}
                    className="sticky z-10 border-b border-zinc-200 bg-white px-2 py-2 text-center font-mono text-xs text-zinc-700 group-hover:bg-zinc-50"
                  >
                    {s.student_number}
                  </td>
                  <td
                    style={{
                      left: NAME_LEFT,
                      width: W.name,
                      minWidth: W.name,
                      maxWidth: W.name,
                    }}
                    className="sticky z-10 border-b border-zinc-200 bg-white group-hover:bg-zinc-50"
                  >
                    {/*
                      Truncate with ellipsis instead of wrapping — keeps every
                      row the same height so the sticky columns stay vertically
                      aligned with the scrolling part. `title` shows full name.
                    */}
                    <div
                      className="truncate px-3 py-2 text-zinc-900"
                      title={s.full_label}
                    >
                      {s.full_label}
                    </div>
                  </td>
                  {collectCats.map((c) => {
                    const max = maxScores[c.id] ?? 0;
                    const val = scores[s.id]?.[c.id];
                    const overMax = val != null && max > 0 && val > max;
                    return (
                      <td
                        key={c.id}
                        style={{ width: W.score }}
                        className="border-b border-l border-zinc-200 px-1 py-1 text-center"
                      >
                        <input
                          type="number"
                          min={0}
                          max={max || undefined}
                          step="1"
                          defaultValue={val ?? ""}
                          disabled={max === 0 || readonly}
                          onBlur={(e) =>
                            onScoreBlur(s.id, c.id, e.target.value)
                          }
                          className={`w-full rounded border px-1 py-1 text-center text-sm disabled:bg-zinc-100 disabled:text-zinc-400 focus:outline-none focus:ring-1 ${
                            overMax
                              ? "border-rose-300 bg-rose-50 font-semibold text-rose-700 focus:border-rose-500 focus:ring-rose-500"
                              : "border-zinc-200 focus:border-primary-500 focus:ring-primary-500"
                          }`}
                        />
                      </td>
                    );
                  })}
                  <td
                    style={{ width: W.collectTotal }}
                    className="border-b border-l border-zinc-200 bg-emerald-50 px-2 py-2 text-center text-sm font-semibold text-emerald-700"
                  >
                    {num(sCollect)}
                  </td>
                  <td
                    style={{ width: W.final }}
                    className="border-b border-l border-zinc-200 px-1 py-1 text-center"
                  >
                    {finalCat &&
                      (() => {
                        const finalMax = maxScores[finalCat.id] ?? 0;
                        const finalVal = scores[s.id]?.[finalCat.id];
                        const overMaxFinal =
                          finalVal != null && finalMax > 0 && finalVal > finalMax;
                        return (
                          <input
                            type="number"
                            min={0}
                            max={finalMax || undefined}
                            step="1"
                            defaultValue={finalVal ?? ""}
                            disabled={finalMax === 0 || readonly}
                            onBlur={(e) =>
                              onScoreBlur(s.id, finalCat.id, e.target.value)
                            }
                            className={`w-full rounded border px-1 py-1 text-center text-sm disabled:bg-zinc-100 disabled:text-zinc-400 focus:outline-none focus:ring-1 ${
                              overMaxFinal
                                ? "border-rose-300 bg-rose-50 font-semibold text-rose-700 focus:border-rose-500 focus:ring-rose-500"
                                : "border-zinc-200 focus:border-primary-500 focus:ring-primary-500"
                            }`}
                          />
                        );
                      })()}
                  </td>
                  <td
                    style={{ width: W.grandTotal }}
                    className="border-b border-l border-zinc-200 bg-violet-50 px-2 py-2 text-center text-sm font-bold text-zinc-900"
                  >
                    {num(sTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
