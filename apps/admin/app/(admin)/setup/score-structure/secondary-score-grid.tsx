"use client";

import { ArrowRight, Target } from "lucide-react";
import { useState, useTransition } from "react";
import {
  saveCategoryMaxScore,
  saveScore,
  setGradeSpecialStatus,
} from "./actions";
import { cutGrade, type GradeScale } from "./grading-utils";
import type { Category, StudentRow } from "./score-grid";

/**
 * Phase 4 — Secondary (มัธยม) score grid with 12-slot layout.
 *
 * Column groups (matches the curriculum's ก่อน/หลังกลางภาค + 2 exam pattern):
 *   ก่อนกลางภาค: sort_order 1-5     (regular collect cells)
 *   กลางภาค:    sort_order 6       (is_midterm=true · displays "สอบ")
 *   หลังกลางภาค: sort_order 7-11    (regular · displays as 6-10 to user)
 *   ปลายภาค:    sort_order 12      (is_final=true · displays "สอบ")
 *
 * Cell widths are tighter than primary's ScoreGrid so the full 12-column
 * layout fits a typical 1200-1366px desktop without horizontal scroll.
 * Mobile / narrow viewports still scroll horizontally with the sticky
 * #/ชื่อ panel frozen on the left.
 *
 * เกรด is computed per-semester on every render (Plan B: no save). The
 * column shows the cut grade derived from `cutGrade(rowSum, scales)`.
 */

type SpecialStatus = "" | "incomplete" | "no_eligibility";

type Props = {
  categories: Category[]; // exactly 12, sort_order 1..12
  students: StudentRow[];
  scales: GradeScale[];
  /** Phase 2.6 — true for past/locked semesters: disable inputs, no save. */
  readonly?: boolean;
  /** Anchor offering for this semester — used as the FK in grades when
   *  saving ร / มส flags via `setGradeSpecialStatus`. */
  offeringId: string;
  /** Starting ร/มส flags (server-fetched). Used as the initial value of
   *  the client-side `status` mirror; subsequent edits update it
   *  optimistically and persist via the server action. */
  initialStatus: Record<
    string,
    { is_incomplete: boolean; is_no_eligibility: boolean }
  >;
};

/** Column widths — narrower than primary because we have +1 column to fit. */
const W = {
  num: 40,
  name: 160,
  score: 48, // ก่อน/หลังกลางภาค cells
  exam: 56, // กลางภาค + ปลายภาค (slightly wider for the bigger scores)
  total: 56, // รวม
  grade: 64, // เกรด pill
  status: 110, // สถานะ (dropdown — needs room for "มส (เวลาเรียนไม่ครบ)")
};
const NAME_LEFT = W.num;

function num(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Same semantics as the primary grid — admin can enter scores ABOVE the
 * configured max_score (cell shows red but the value is saved verbatim).
 * Schema's DECIMAL(5,2) ceiling caps absolute extremes only.
 */
function parseScore(v: string): number | null {
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 999.99) return 999.99;
  return n;
}

function gradePillClass(g: number): string {
  if (g >= 4) return "bg-emerald-100 text-emerald-800";
  if (g >= 3) return "bg-teal-100 text-teal-800";
  if (g >= 2) return "bg-amber-100 text-amber-800";
  if (g >= 1) return "bg-orange-100 text-orange-800";
  return "bg-rose-100 text-rose-800";
}

function formatGrade(g: number): string {
  return g % 1 === 0 ? `${g}.0` : g.toFixed(1);
}

export function SecondaryScoreGrid({
  categories,
  students,
  scales,
  readonly = false,
  offeringId,
  initialStatus,
}: Props) {
  // Sort + de-dup categories defensively, then slice into the 4 groups.
  const sortedRaw = categories
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  const seenSort = new Set<number>();
  const sorted = sortedRaw.filter((c) => {
    if (seenSort.has(c.sort_order)) return false;
    seenSort.add(c.sort_order);
    return true;
  });
  const beforeMid = sorted.filter(
    (c) => c.sort_order >= 1 && c.sort_order <= 5,
  );
  const midCat = sorted.find((c) => c.sort_order === 6);
  const afterMid = sorted.filter(
    (c) => c.sort_order >= 7 && c.sort_order <= 11,
  );
  const finalCat = sorted.find((c) => c.sort_order === 12);

  // Pre-compute table min-width so narrow viewports scroll cleanly.
  const tableMinW =
    W.num +
    W.name +
    W.score * beforeMid.length +
    W.exam +
    W.score * afterMid.length +
    W.exam +
    W.total +
    W.grade +
    W.status;

  // Local state (optimistic max + scores)
  const [maxScores, setMaxScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, c.max_score])),
  );
  const [scores, setScores] = useState<
    Record<string, Record<string, number | null>>
  >(() =>
    Object.fromEntries(students.map((s) => [s.id, { ...s.scores }])),
  );
  // Local mirror of ร/มส per student. "" = ปกติ. Saves on change via
  // setGradeSpecialStatus + revalidatePath, so the server-side fetch
  // converges back to whatever we wrote here.
  const [status, setStatus] = useState<Record<string, SpecialStatus>>(() => {
    const out: Record<string, SpecialStatus> = {};
    for (const s of students) {
      const flags = initialStatus[s.id];
      if (flags?.is_incomplete) out[s.id] = "incomplete";
      else if (flags?.is_no_eligibility) out[s.id] = "no_eligibility";
      else out[s.id] = "";
    }
    return out;
  });
  const [, startTransition] = useTransition();

  const onStatusChange = (studentId: string, next: SpecialStatus) => {
    if (readonly) return;
    setStatus((prev) => ({ ...prev, [studentId]: next }));
    const fd = new FormData();
    fd.set("student_id", studentId);
    fd.set("offering_id", offeringId);
    fd.set("grading_period", "semester");
    fd.set("status", next);
    startTransition(async () => {
      try {
        await setGradeSpecialStatus(fd);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("setGradeSpecialStatus failed", e);
      }
    });
  };

  const allMidsAndFinals = [
    ...(midCat ? [midCat] : []),
    ...(finalCat ? [finalCat] : []),
  ];
  const allCellCats = [...beforeMid, ...afterMid, ...allMidsAndFinals];

  const grandMax = allCellCats.reduce(
    (sum, c) => sum + (maxScores[c.id] ?? 0),
    0,
  );

  const studentTotal = (sid: string): number => {
    const sScores = scores[sid] ?? {};
    let total = 0;
    for (const c of allCellCats) total += sScores[c.id] ?? 0;
    return total;
  };

  const studentGrade = (sid: string): number =>
    cutGrade(studentTotal(sid), scales);

  const onMaxBlur = (categoryId: string, value: string) => {
    if (readonly) return;
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
    if (readonly) return;
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

  // Display number for the after-mid cells — they're sort_order 7-11 but
  // the user sees them as "6..10" (continuing the regular numbering after
  // กลางภาค interrupts at slot 6).
  const afterMidLabel = (sortOrder: number): string => String(sortOrder - 1);

  return (
    <>
      {!readonly && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-xs font-bold">
            i
          </span>
          ตั้ง <strong>&ldquo;คะแนนเต็ม&rdquo;</strong>{" "}
          บรรทัดแรกก่อนกรอกคะแนนนักเรียน · เกรดคำนวณรายภาคอัตโนมัติ
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          // w-full stretches the table to the card's white space when there's
          // room; minWidth keeps the 12-column layout intact on narrow viewports
          // (mobile/tablet scroll horizontally).
          className="w-full table-fixed border-separate border-spacing-0 text-sm"
          style={{ minWidth: tableMinW }}
        >
          <colgroup>
            <col style={{ width: W.num }} />
            <col style={{ width: W.name }} />
            {beforeMid.map((c) => (
              <col key={c.id} style={{ width: W.score }} />
            ))}
            {midCat ? <col style={{ width: W.exam }} /> : null}
            {afterMid.map((c) => (
              <col key={c.id} style={{ width: W.score }} />
            ))}
            {finalCat ? <col style={{ width: W.exam }} /> : null}
            <col style={{ width: W.total }} />
            <col style={{ width: W.grade }} />
            <col style={{ width: W.status }} />
          </colgroup>

          <thead>
            {/* Row 1 — column groups */}
            <tr>
              <th
                rowSpan={2}
                style={{
                  left: 0,
                  width: W.num,
                  minWidth: W.num,
                  maxWidth: W.num,
                }}
                className="sticky z-10 border-b border-zinc-200 bg-zinc-100 px-1 py-2 text-xs font-medium uppercase text-zinc-500"
              >
                #
              </th>
              <th
                rowSpan={2}
                style={{
                  left: NAME_LEFT,
                  width: W.name,
                  minWidth: W.name,
                  maxWidth: W.name,
                }}
                className="sticky z-10 border-b border-zinc-200 bg-zinc-100 px-3 py-2 text-left text-xs font-medium uppercase text-zinc-500"
              >
                ชื่อ – สกุล
              </th>
              <th
                colSpan={beforeMid.length}
                className="border-b border-l border-zinc-200 bg-sky-50 px-2 py-2 text-center text-xs font-semibold text-sky-800"
              >
                ก่อนกลางภาค
              </th>
              {midCat ? (
                <th
                  style={{ width: W.exam }}
                  className="border-b border-l border-zinc-200 bg-rose-50 px-2 py-2 text-center text-xs font-semibold text-rose-800"
                >
                  กลางภาค
                </th>
              ) : null}
              <th
                colSpan={afterMid.length}
                className="border-b border-l border-zinc-200 bg-emerald-50 px-2 py-2 text-center text-xs font-semibold text-emerald-800"
              >
                หลังกลางภาค
              </th>
              {finalCat ? (
                <th
                  style={{ width: W.exam }}
                  className="border-b border-l border-zinc-200 bg-amber-50 px-2 py-2 text-center text-xs font-semibold text-amber-800"
                >
                  ปลายภาค
                </th>
              ) : null}
              <th
                rowSpan={2}
                style={{ width: W.total }}
                className="border-b border-l border-zinc-200 bg-zinc-100 px-2 py-2 text-center text-xs font-semibold text-zinc-700"
              >
                รวม
              </th>
              <th
                rowSpan={2}
                style={{ width: W.grade }}
                className="border-b border-l border-zinc-200 bg-violet-100 px-2 py-2 text-center text-xs font-semibold text-violet-800"
              >
                เกรด
              </th>
              <th
                rowSpan={2}
                style={{ width: W.status }}
                className="border-b border-l border-zinc-200 bg-zinc-100 px-2 py-2 text-center text-xs font-semibold text-zinc-700"
              >
                สถานะ
              </th>
            </tr>
            {/* Row 2 — sub-column labels */}
            <tr>
              {beforeMid.map((c) => (
                <th
                  key={c.id}
                  style={{ width: W.score }}
                  className="border-b border-l border-zinc-200 bg-sky-50/40 px-1 py-1.5 text-center text-xs font-medium text-sky-700"
                >
                  {c.sort_order}
                </th>
              ))}
              {midCat ? (
                <th
                  style={{ width: W.exam }}
                  className="border-b border-l border-zinc-200 bg-rose-50/40 px-1 py-1.5 text-center text-xs font-medium text-rose-700"
                >
                  สอบ
                </th>
              ) : null}
              {afterMid.map((c) => (
                <th
                  key={c.id}
                  style={{ width: W.score }}
                  className="border-b border-l border-zinc-200 bg-emerald-50/40 px-1 py-1.5 text-center text-xs font-medium text-emerald-700"
                >
                  {afterMidLabel(c.sort_order)}
                </th>
              ))}
              {finalCat ? (
                <th
                  style={{ width: W.exam }}
                  className="border-b border-l border-zinc-200 bg-amber-50/40 px-1 py-1.5 text-center text-xs font-medium text-amber-700"
                >
                  สอบ
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {/* คะแนนเต็ม row */}
            <tr className="bg-violet-50/50">
              <td
                style={{
                  left: 0,
                  width: W.num,
                  minWidth: W.num,
                  maxWidth: W.num,
                }}
                className="sticky z-10 border-b border-zinc-200 bg-violet-50 px-1 py-2 text-center"
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
                  คะแนนเต็ม
                  <ArrowRight className="size-4" aria-hidden />
                </div>
              </td>
              {beforeMid.map((c) => (
                <MaxCell
                  key={c.id}
                  value={maxScores[c.id] ?? 0}
                  borderClass="border-violet-200"
                  textClass="text-violet-900 focus:border-violet-500 focus:ring-violet-500"
                  width={W.score}
                  disabled={readonly}
                  onBlurValue={(v) => onMaxBlur(c.id, v)}
                />
              ))}
              {midCat ? (
                <MaxCell
                  value={maxScores[midCat.id] ?? 0}
                  borderClass="border-rose-200"
                  textClass="text-rose-900 focus:border-rose-500 focus:ring-rose-500"
                  width={W.exam}
                  disabled={readonly}
                  onBlurValue={(v) => onMaxBlur(midCat.id, v)}
                />
              ) : null}
              {afterMid.map((c) => (
                <MaxCell
                  key={c.id}
                  value={maxScores[c.id] ?? 0}
                  borderClass="border-violet-200"
                  textClass="text-violet-900 focus:border-violet-500 focus:ring-violet-500"
                  width={W.score}
                  disabled={readonly}
                  onBlurValue={(v) => onMaxBlur(c.id, v)}
                />
              ))}
              {finalCat ? (
                <MaxCell
                  value={maxScores[finalCat.id] ?? 0}
                  borderClass="border-amber-200"
                  textClass="text-amber-900 focus:border-amber-500 focus:ring-amber-500"
                  width={W.exam}
                  disabled={readonly}
                  onBlurValue={(v) => onMaxBlur(finalCat.id, v)}
                />
              ) : null}
              <td
                style={{ width: W.total }}
                className="border-b border-l border-zinc-200 bg-zinc-100 px-2 py-2 text-center text-sm font-bold tabular-nums text-zinc-900"
              >
                {grandMax}
              </td>
              <td
                style={{ width: W.grade }}
                className="border-b border-l border-zinc-200 bg-violet-50 px-2 py-2 text-center text-xs text-violet-700"
              >
                —
              </td>
              <td
                style={{ width: W.status }}
                className="border-b border-l border-zinc-200 bg-violet-50 px-2 py-2 text-center text-xs text-violet-700"
              >
                —
              </td>
            </tr>

            {/* Student rows */}
            {students.map((s) => {
              const sTotal = studentTotal(s.id);
              const sGrade = studentGrade(s.id);
              const sStatus = status[s.id] ?? "";
              return (
                <tr key={s.id} className="group">
                  <td
                    style={{
                      left: 0,
                      width: W.num,
                      minWidth: W.num,
                      maxWidth: W.num,
                    }}
                    className="sticky z-10 border-b border-zinc-200 bg-white px-1 py-2 text-center font-mono text-xs text-zinc-700 group-hover:bg-zinc-50"
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
                    <div
                      className="truncate px-3 py-2 text-zinc-900"
                      title={s.full_label}
                    >
                      {s.full_label}
                    </div>
                  </td>
                  {beforeMid.map((c) => (
                    <ScoreCell
                      key={c.id}
                      width={W.score}
                      max={maxScores[c.id] ?? 0}
                      value={scores[s.id]?.[c.id]}
                      disabled={readonly}
                      onBlurValue={(v) => onScoreBlur(s.id, c.id, v)}
                    />
                  ))}
                  {midCat ? (
                    <ScoreCell
                      width={W.exam}
                      max={maxScores[midCat.id] ?? 0}
                      value={scores[s.id]?.[midCat.id]}
                      disabled={readonly}
                      onBlurValue={(v) => onScoreBlur(s.id, midCat.id, v)}
                    />
                  ) : null}
                  {afterMid.map((c) => (
                    <ScoreCell
                      key={c.id}
                      width={W.score}
                      max={maxScores[c.id] ?? 0}
                      value={scores[s.id]?.[c.id]}
                      disabled={readonly}
                      onBlurValue={(v) => onScoreBlur(s.id, c.id, v)}
                    />
                  ))}
                  {finalCat ? (
                    <ScoreCell
                      width={W.exam}
                      max={maxScores[finalCat.id] ?? 0}
                      value={scores[s.id]?.[finalCat.id]}
                      disabled={readonly}
                      onBlurValue={(v) => onScoreBlur(s.id, finalCat.id, v)}
                    />
                  ) : null}
                  <td
                    style={{ width: W.total }}
                    className="border-b border-l border-zinc-200 bg-zinc-50 px-2 py-2 text-center text-sm font-bold tabular-nums text-zinc-900"
                  >
                    {num(sTotal)}
                  </td>
                  <td
                    style={{ width: W.grade }}
                    className="border-b border-l border-zinc-200 px-2 py-2 text-center"
                  >
                    {/* Special status overrides the numeric grade — when
                        admin marks ร or มส the เกรด column shows that
                        instead of the computed pill (user spec 2026-05-19:
                        "เกรดจาก 4 กรอก ร ไปให้แสดง ร"). */}
                    {sStatus === "incomplete" ? (
                      <span className="inline-flex min-w-[2.5rem] justify-center rounded-md bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-800">
                        ร
                      </span>
                    ) : sStatus === "no_eligibility" ? (
                      <span className="inline-flex min-w-[2.5rem] justify-center rounded-md bg-rose-100 px-2 py-0.5 text-sm font-semibold text-rose-800">
                        มส
                      </span>
                    ) : (
                      <span
                        className={`inline-flex min-w-[2.5rem] justify-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${gradePillClass(sGrade)}`}
                      >
                        {formatGrade(sGrade)}
                      </span>
                    )}
                  </td>
                  <td
                    style={{ width: W.status }}
                    className="border-b border-l border-zinc-200 bg-white px-1.5 py-1.5 text-center group-hover:bg-zinc-50"
                  >
                    <select
                      value={sStatus}
                      disabled={readonly}
                      onChange={(e) =>
                        onStatusChange(s.id, e.target.value as SpecialStatus)
                      }
                      className={`w-full rounded-md border px-1.5 py-1 text-[11px] ${
                        readonly
                          ? "border-zinc-200 bg-zinc-100 text-zinc-400"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      <option value="">— ปกติ —</option>
                      <option value="incomplete">ร</option>
                      <option value="no_eligibility">มส</option>
                    </select>
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

// ---- Small input cells (DRY for the 12-cell row + คะแนนเต็ม row) -----------

function MaxCell({
  value,
  borderClass,
  textClass,
  width,
  disabled,
  onBlurValue,
}: {
  value: number;
  borderClass: string;
  textClass: string;
  width: number;
  disabled: boolean;
  onBlurValue: (raw: string) => void;
}) {
  return (
    <td
      style={{ width }}
      className="border-b border-l border-zinc-200 px-0.5 py-1 text-center"
    >
      <input
        type="number"
        min={0}
        max={999}
        step="1"
        defaultValue={value}
        disabled={disabled}
        onBlur={(e) => onBlurValue(e.target.value)}
        className={`w-full rounded border bg-white px-0.5 py-1 text-center text-sm font-medium ${borderClass} ${textClass} focus:outline-none focus:ring-1 disabled:bg-zinc-100 disabled:text-zinc-400`}
      />
    </td>
  );
}

function ScoreCell({
  width,
  max,
  value,
  disabled,
  onBlurValue,
}: {
  width: number;
  max: number;
  value: number | null | undefined;
  disabled: boolean;
  onBlurValue: (raw: string) => void;
}) {
  // Red highlight when admin enters a score above max_score (bonus points).
  // Value is saved as-is; the styling is a visual warning only.
  const overMax = value != null && max > 0 && value > max;
  return (
    <td
      style={{ width }}
      className="border-b border-l border-zinc-200 px-0.5 py-1 text-center"
    >
      <input
        type="number"
        min={0}
        max={max || undefined}
        step="1"
        defaultValue={value ?? ""}
        disabled={max === 0 || disabled}
        onBlur={(e) => onBlurValue(e.target.value)}
        className={`w-full rounded border px-0.5 py-1 text-center text-sm disabled:bg-zinc-100 disabled:text-zinc-400 focus:outline-none focus:ring-1 ${
          overMax
            ? "border-rose-300 bg-rose-50 font-semibold text-rose-700 focus:border-rose-500 focus:ring-rose-500"
            : "border-zinc-200 focus:border-primary-500 focus:ring-primary-500"
        }`}
      />
    </td>
  );
}
