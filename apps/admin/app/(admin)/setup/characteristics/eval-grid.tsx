"use client";

import { Select } from "@pp5/ui";
import { useState, useTransition } from "react";
import {
  cellColorClass,
  summarize0to3,
  summaryColorClass,
  type EvalLabel,
} from "@/lib/curriculum-eval-utils";
import {
  saveCharacteristicScore,
  setAllCharacteristicForColumn,
} from "./actions";

export type StudentRow = {
  id: string;
  student_number: number;
  full_label: string;
  /** Map characteristic_id → score (0-3) or null if not evaluated yet. */
  scores: Record<string, number | null>;
};

export type CharCol = {
  id: string;
  name: string;
};

type Props = {
  students: StudentRow[];
  characteristics: CharCol[];
  classroomId: string;
  yearId: string;
  /** 0 = annual (primary) · 1 / 2 = per-semester (secondary). Used as the
   *  scope for read + write of `characteristic_evaluations.semester`. */
  semester: 0 | 1 | 2;
  readonly?: boolean;
};

const NUM_W = 40;
const NAME_W = 160;
const CHAR_W = 72; // narrower so 8 characteristics fit a desktop card
const SUMMARY_W = 80;

const SCORE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "—" },
  { value: "3", label: "3" },
  { value: "2", label: "2" },
  { value: "1", label: "1" },
  { value: "0", label: "0" },
];

export function CharacteristicEvalGrid({
  students,
  characteristics,
  classroomId,
  yearId,
  semester,
  readonly = false,
}: Props) {
  const tableMinW =
    NUM_W + NAME_W + CHAR_W * characteristics.length + SUMMARY_W;

  return (
    <div className="overflow-x-auto">
      <table
        // w-full fills the card's white space when available; minWidth keeps
        // the layout intact on narrow viewports (mobile scrolls horizontally).
        className="w-full table-fixed border-separate border-spacing-0 text-sm"
        style={{ minWidth: tableMinW }}
      >
        <colgroup>
          <col style={{ width: NUM_W }} />
          <col style={{ width: NAME_W }} />
          {characteristics.map((c) => (
            <col key={c.id} style={{ width: CHAR_W }} />
          ))}
          <col style={{ width: SUMMARY_W }} />
        </colgroup>

        <thead>
          <tr>
            <th
              style={{ left: 0, width: NUM_W, minWidth: NUM_W, maxWidth: NUM_W }}
              className="sticky z-10 border-b border-zinc-200 bg-zinc-100 px-2 py-2 text-center text-xs font-medium text-zinc-600"
            >
              #
            </th>
            <th
              style={{
                left: NUM_W,
                width: NAME_W,
                minWidth: NAME_W,
                maxWidth: NAME_W,
              }}
              className="sticky z-10 border-b border-zinc-200 bg-zinc-100 px-3 py-2 text-left text-xs font-medium text-zinc-600"
            >
              ชื่อ – สกุล
            </th>
            {characteristics.map((c) => {
              const allAre3 =
                students.length > 0 &&
                students.every((s) => s.scores[c.id] === 3);
              return (
                <th
                  key={c.id}
                  style={{ width: CHAR_W }}
                  className="border-b border-l border-zinc-200 bg-zinc-50 px-2 py-2 text-center text-xs font-medium text-zinc-600"
                  title={c.name}
                >
                  <div className="mb-1.5 line-clamp-2 leading-tight">
                    {c.name}
                  </div>
                  {readonly ? null : (
                    <BulkColumnButton
                      classroomId={classroomId}
                      yearId={yearId}
                      semester={semester}
                      characteristicId={c.id}
                      allAre3={allAre3}
                    />
                  )}
                </th>
              );
            })}
            <th
              style={{ width: SUMMARY_W }}
              className="border-b border-l border-zinc-200 bg-zinc-100 px-2 py-2 text-center text-xs font-medium text-zinc-700"
            >
              สรุป
            </th>
          </tr>
        </thead>

        <tbody>
          {students.map((s, i) => (
            <Row
              // Include scores in the key so bulk-column changes force a
              // re-mount and the dropdowns re-init with fresh values.
              key={`${s.id}|${characteristics.map((c) => s.scores[c.id] ?? "").join(",")}`}
              student={s}
              characteristics={characteristics}
              yearId={yearId}
              semester={semester}
              readonly={readonly}
              alt={i % 2 === 0}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===================================================================
// Header bulk-toggle button — "ทุกคน 3" / "ล้าง"
// ===================================================================

function BulkColumnButton({
  classroomId,
  yearId,
  semester,
  characteristicId,
  allAre3,
}: {
  classroomId: string;
  yearId: string;
  /** 0 = annual (primary) · 1 / 2 = per-semester (secondary). Used as the
   *  scope for read + write of `characteristic_evaluations.semester`. */
  semester: 0 | 1 | 2;
  characteristicId: string;
  allAre3: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const fd = new FormData();
    fd.set("classroom_id", classroomId);
    fd.set("characteristic_id", characteristicId);
    fd.set("year_id", yearId);
    fd.set("semester", String(semester));
    fd.set("value", allAre3 ? "" : "3");
    startTransition(async () => {
      try {
        await setAllCharacteristicForColumn(fd);
      } catch (err) {
        console.error("bulk action failed:", err);
        alert(
          `บันทึกไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={
        allAre3
          ? "inline-flex w-full justify-center rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-300 disabled:opacity-60"
          : "inline-flex w-full justify-center rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
      }
      title={
        allAre3
          ? "ล้างค่าทั้งคอลัมน์ของห้องนี้"
          : "ตั้งทุกคนในห้องเป็น 3 (กดอีกที = ล้าง)"
      }
    >
      {isPending ? "..." : allAre3 ? "ล้าง" : "ทุกคน 3"}
    </button>
  );
}

// ===================================================================
// Row — dropdowns per characteristic + summary cell
// ===================================================================

function Row({
  student,
  characteristics,
  yearId,
  semester,
  readonly,
  alt,
}: {
  student: StudentRow;
  characteristics: CharCol[];
  yearId: string;
  /** 0 = annual (primary) · 1 / 2 = per-semester (secondary). Used as the
   *  scope for read + write of `characteristic_evaluations.semester`. */
  semester: 0 | 1 | 2;
  readonly: boolean;
  alt: boolean;
}) {
  // Optimistic per-cell overrides; cleared on save success (revalidate
  // brings prop into sync, and the row's key re-mounts it as well).
  const [pending, setPending] = useState<Record<string, number | null>>({});
  const [isPending, startTransition] = useTransition();

  const view = (cid: string): number | null =>
    cid in pending ? pending[cid] : (student.scores[cid] ?? null);

  const summary: EvalLabel | null = summarize0to3(
    characteristics.map((c) => view(c.id)),
  );

  const handleChange = (characteristicId: string, raw: string) => {
    if (readonly) return;
    const next: number | null =
      raw === ""
        ? null
        : raw === "0" || raw === "1" || raw === "2" || raw === "3"
          ? (Number.parseInt(raw, 10) as 0 | 1 | 2 | 3)
          : null;

    const prevValue = view(characteristicId);
    setPending((p) => ({ ...p, [characteristicId]: next }));

    const fd = new FormData();
    fd.set("student_id", student.id);
    fd.set("characteristic_id", characteristicId);
    fd.set("year_id", yearId);
    fd.set("semester", String(semester));
    fd.set("score", next == null ? "" : String(next));
    startTransition(async () => {
      try {
        await saveCharacteristicScore(fd);
        setPending((p) => {
          const { [characteristicId]: _omit, ...rest } = p;
          return rest;
        });
      } catch (err) {
        console.error("save failed:", err);
        alert(
          `บันทึกไม่สำเร็จ: ${err instanceof Error ? err.message : String(err)}`,
        );
        setPending((p) => ({ ...p, [characteristicId]: prevValue }));
      }
    });
  };

  const rowBg = alt
    ? "bg-white hover:bg-zinc-50"
    : "bg-zinc-50/50 hover:bg-zinc-100/60";

  return (
    <tr>
      <td
        style={{ left: 0, width: NUM_W, minWidth: NUM_W, maxWidth: NUM_W }}
        className={`sticky z-10 border-b border-zinc-200 px-2 py-1.5 text-center text-xs tabular-nums text-zinc-600 ${rowBg}`}
      >
        {student.student_number}
      </td>
      <td
        style={{
          left: NUM_W,
          width: NAME_W,
          minWidth: NAME_W,
          maxWidth: NAME_W,
        }}
        className={`sticky z-10 border-b border-zinc-200 ${rowBg}`}
      >
        <div
          className="truncate px-3 py-1.5 text-zinc-900"
          title={student.full_label}
        >
          {student.full_label}
        </div>
      </td>
      {characteristics.map((c) => {
        const v = view(c.id);
        const tint = cellColorClass(v);
        return (
          <td
            key={c.id}
            style={{ width: CHAR_W }}
            className="border-b border-l border-zinc-200 px-1.5 py-1 text-center"
          >
            <Select
              value={v == null ? "" : String(v)}
              onChange={(e) => handleChange(c.id, e.target.value)}
              disabled={readonly || isPending}
              className={`w-full text-center font-semibold tabular-nums ${tint}`}
            >
              {SCORE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </td>
        );
      })}
      <td
        style={{ width: SUMMARY_W }}
        className="border-b border-l border-zinc-200 px-2 py-1 text-center"
      >
        <span
          className={`inline-flex min-w-[4rem] justify-center rounded-md px-2 py-0.5 text-xs font-semibold ${summaryColorClass(summary)}`}
        >
          {summary ?? "—"}
        </span>
      </td>
    </tr>
  );
}
