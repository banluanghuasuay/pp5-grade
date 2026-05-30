"use client";

import { Select } from "@pp5/ui";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { saveSemesterPassFail, setAllPassFail } from "./actions";

/**
 * Per-semester grid for activity subjects (subject.grading_mode = 'pass_fail').
 *
 * Replaces the 10+1 score grid — activity subjects have no scores; the
 * teacher/admin just decides ผ่าน / ไม่ผ่าน for the semester.
 *
 * Layout uses `table-fixed` with a filler column so:
 *   - the visible columns sit tight on the left (close to the name),
 *   - the table still fills its card width visually.
 *
 * Spinner during auto-save is rendered with `invisible` (not conditionally
 * mounted) so the cell width is stable — no layout shift when toggling.
 */

export type PassFailStudent = {
  id: string;
  student_number: number;
  full_label: string;
  /** Current saved value (or "" if no row exists yet) */
  passFail: "pass" | "fail" | "";
};

type Props = {
  students: PassFailStudent[];
  offeringId: string;
  /** Phase 2.6 — true for past/locked semesters: disable Select, no save. */
  readonly?: boolean;
};

export function PassFailGrid({
  students,
  offeringId,
  readonly = false,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-sm">
      <colgroup>
        {/*
          Trimmed ชื่อ column from 288 → 192 so the dropdown column absorbs
          the slack and the whole table fits a typical phone viewport in one
          page (no horizontal scroll). The dropdown is w-full so it grows
          into whatever space the third column has — using up the gap that
          used to sit empty between the short name text and the dropdown.
        */}
        <col style={{ width: 48 }} />
        <col style={{ width: 144 }} />
        {/* ผลการประเมิน — no explicit width, takes the remaining space */}
      </colgroup>
      <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
        <tr>
          <th className="px-3 py-1.5 text-left font-medium">เลขที่</th>
          <th className="px-3 py-1.5 text-left font-medium">ชื่อ-สกุล</th>
          <th className="px-3 py-1.5 text-center font-medium">ผลการประเมิน</th>
        </tr>
      </thead>
      <tbody>
        {students.map((s, i) => (
          // Key includes passFail so the row remounts when the server
          // revalidates with a new value (e.g. after "ผ่านทั้งห้อง" bulk
          // action). Without this, the Row's `useState(student.passFail)`
          // would stay stuck at the value from initial mount.
          <Row
            key={`${s.id}|${s.passFail}`}
            student={s}
            offeringId={offeringId}
            alt={i % 2 === 0}
            readonly={readonly}
          />
        ))}
      </tbody>
      </table>
    </div>
  );
}

function Row({
  student,
  offeringId,
  alt,
  readonly,
}: {
  student: PassFailStudent;
  offeringId: string;
  alt: boolean;
  readonly: boolean;
}) {
  // Local optimistic state — the dropdown reflects what the user just picked
  // while the server action runs. After revalidation the parent re-renders
  // with the canonical value as defaultValue/value.
  const [value, setValue] = useState<"pass" | "fail" | "">(student.passFail);
  const [isPending, startTransition] = useTransition();

  const handleChange = (next: string) => {
    if (next !== "" && next !== "pass" && next !== "fail") return;
    setValue(next as "pass" | "fail" | "");
    const fd = new FormData();
    fd.set("student_id", student.id);
    fd.set("offering_id", offeringId);
    fd.set("value", next);
    startTransition(() => {
      saveSemesterPassFail(fd);
    });
  };

  return (
    <tr
      className={
        alt
          ? "bg-white hover:bg-zinc-50"
          : "bg-zinc-50/50 hover:bg-zinc-100/60"
      }
    >
      <td className="px-3 py-1 text-zinc-600 tabular-nums">
        {student.student_number}
      </td>
      <td className="px-3 py-1">
        {/* Truncate long names — keeps row height constant + sticky col aligned */}
        <div className="truncate" title={student.full_label}>
          {student.full_label}
        </div>
      </td>
      <td className="px-3 py-1 text-center">
        <div className="inline-flex items-center justify-center gap-1.5">
          <Select
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending || readonly}
            // w-full fills the entire cell — column 3 now absorbs the slack
            // that was previously empty space, so the dropdown is comfortably
            // wide on both mobile (~120-170px) and desktop (200px+).
            className="w-full"
          >
            <option value="">—</option>
            <option value="pass">ผ่าน</option>
            <option value="fail">ไม่ผ่าน</option>
          </Select>
          {/*
            Always rendered with a reserved 14px slot — `invisible` removes
            it visually but keeps the layout stable.
          */}
          <Loader2
            className={`size-3.5 text-zinc-400 ${
              isPending ? "animate-spin" : "invisible"
            }`}
          />
        </div>
      </td>
    </tr>
  );
}

/**
 * Top-right bulk toggle button:
 *   - if NOT all students currently 'pass'  → label: "ผ่านทั้งห้อง"
 *     click → upsert every student to 'pass'
 *   - if every student is currently 'pass'  → label: "ล้างทั้งห้อง"
 *     click → delete every student's row for this offering+period
 */
export function PassFailBulkButton({
  classroomId,
  offeringId,
  allPass,
}: {
  classroomId: string;
  offeringId: string;
  allPass: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const fd = new FormData();
    fd.set("classroom_id", classroomId);
    fd.set("offering_id", offeringId);
    fd.set("set_pass", allPass ? "false" : "true");
    // Wrap with try/catch — if the server action throws (auth, DB constraint,
    // etc.) we want the user to see the error instead of silent failure.
    startTransition(async () => {
      try {
        await setAllPassFail(fd);
      } catch (err) {
        console.error("setAllPassFail failed:", err);
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
        allPass
          ? "inline-flex items-center gap-1.5 rounded-md bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
          : "inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : null}
      {isPending
        ? "กำลังบันทึก…"
        : allPass
          ? "ล้างทั้งห้อง"
          : "ผ่านทั้งห้อง"}
    </button>
  );
}
