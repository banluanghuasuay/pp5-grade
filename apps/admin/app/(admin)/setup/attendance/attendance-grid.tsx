"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import {
  saveAttendance,
  setAllForDay,
  toggleWorkday,
  type AttendanceStatus,
} from "./actions";
import { dayOfWeekLabel, formatIsoDate } from "./calendar";

export type StudentRow = {
  id: string;
  student_number: number;
  student_code: string;
  full_label: string;
  /** Map day-of-month (1-31) → status (or undefined if not entered). */
  statuses: Record<number, AttendanceStatus | undefined>;
};

type Props = {
  classroomId: string;
  yearCe: number;
  /** 1-12 */
  month: number;
  daysInMonth: number;
  /** Set of day-of-month integers (1-31) that are workdays. */
  workdays: number[];
  /** Set of day-of-month integers (1-31) that are public/school holidays. */
  holidayDays: number[];
  /** Holiday name keyed by day-of-month — used for tooltip. */
  holidayNames: Record<number, string>;
  students: StudentRow[];
  /** Phase 2.6 — true for past/locked terms: no toggles, no cell cycles. */
  readonly?: boolean;
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "✓",
  absent: "×",
  leave: "ล",
  sick: "ป",
};

const STATUS_CLASS: Record<AttendanceStatus, string> = {
  present: "bg-emerald-50 text-emerald-700",
  absent: "bg-red-50 text-red-700",
  leave: "bg-amber-50 text-amber-700",
  sick: "bg-sky-50 text-sky-700",
};

/** 5-state cycle: empty → present → absent → leave → sick → empty. */
function nextStatus(
  current: AttendanceStatus | undefined,
): AttendanceStatus | undefined {
  if (!current) return "present";
  if (current === "present") return "absent";
  if (current === "absent") return "leave";
  if (current === "leave") return "sick";
  return undefined; // sick → empty
}

// Sticky column geometry — # then ชื่อ-สกุล. Widths must match the offsets.
const STICKY_LEFT = {
  num: "0px",
  name: "48px", // # column is w-12 = 48px
} as const;

export function AttendanceGrid({
  classroomId,
  yearCe,
  month,
  daysInMonth,
  workdays: initialWorkdays,
  holidayDays,
  holidayNames,
  students,
  readonly = false,
}: Props) {
  const holidaySet = new Set(holidayDays);

  /** Is this day a Saturday or Sunday? */
  const isWeekend = (day: number): boolean => {
    const dow = new Date(yearCe, month - 1, day).getDay();
    return dow === 0 || dow === 6;
  };
  /** Holiday from holidays table — takes priority over weekend tint. */
  const isHoliday = (day: number): boolean => holidaySet.has(day);

  /**
   * Background class for non-workday tint. Priority: holiday (red) > weekend (yellow).
   * Returns empty string for normal non-workdays (zinc-100 elsewhere).
   */
  const nonSchoolTint = (day: number): "red" | "yellow" | null => {
    if (isHoliday(day)) return "red";
    if (isWeekend(day)) return "yellow";
    return null;
  };
  const [workdaySet, setWorkdaySet] = useState<Set<number>>(
    () => new Set(initialWorkdays),
  );
  const [statusMap, setStatusMap] = useState<
    Record<string, Record<number, AttendanceStatus | undefined>>
  >(() => {
    const map: Record<string, Record<number, AttendanceStatus | undefined>> = {};
    for (const s of students) map[s.id] = { ...s.statuses };
    return map;
  });
  const [, startTransition] = useTransition();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // --- handlers ---
  const toggleDay = (day: number) => {
    if (readonly) return; // Phase 2.6 — locked term
    const nextIsWorkday = !workdaySet.has(day);
    setWorkdaySet((prev) => {
      const next = new Set(prev);
      if (nextIsWorkday) next.add(day);
      else next.delete(day);
      return next;
    });

    // Turning OFF a workday: also clear every student's status for that day
    // in local state. Server-side `toggleWorkday` does the corresponding
    // DELETE on attendance rows.
    if (!nextIsWorkday) {
      setStatusMap((prev) => {
        const next: typeof prev = { ...prev };
        for (const s of students) {
          if (next[s.id]?.[day] !== undefined) {
            next[s.id] = { ...next[s.id], [day]: undefined };
          }
        }
        return next;
      });
    }

    const fd = new FormData();
    fd.set("classroom_id", classroomId);
    fd.set("date", formatIsoDate(yearCe, month, day));
    fd.set("is_workday", String(nextIsWorkday));
    startTransition(async () => {
      try {
        await toggleWorkday(fd);
      } catch (e) {
        console.error("toggleWorkday failed", e);
      }
    });
  };

  const cycleStatus = (studentId: string, day: number) => {
    if (readonly) return; // Phase 2.6 — locked term
    if (!workdaySet.has(day)) return;
    const current = statusMap[studentId]?.[day];
    const next = nextStatus(current);

    setStatusMap((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [day]: next },
    }));

    const fd = new FormData();
    fd.set("student_id", studentId);
    fd.set("classroom_id", classroomId);
    fd.set("date", formatIsoDate(yearCe, month, day));
    fd.set("status", next ?? "");
    startTransition(async () => {
      try {
        await saveAttendance(fd);
      } catch (e) {
        console.error("saveAttendance failed", e);
      }
    });
  };

  /** Mark all students as present for this day, or clear all if already all-present. */
  const toggleAllForDay = (day: number) => {
    if (readonly) return; // Phase 2.6 — locked term
    if (!workdaySet.has(day)) return;
    const allPresent =
      students.length > 0 &&
      students.every((s) => statusMap[s.id]?.[day] === "present");
    const setPresent = !allPresent;

    setStatusMap((prev) => {
      const next = { ...prev };
      for (const s of students) {
        next[s.id] = {
          ...(prev[s.id] ?? {}),
          [day]: setPresent ? "present" : undefined,
        };
      }
      return next;
    });

    const fd = new FormData();
    fd.set("classroom_id", classroomId);
    fd.set("date", formatIsoDate(yearCe, month, day));
    fd.set("set_present", String(setPresent));
    startTransition(async () => {
      try {
        await setAllForDay(fd);
      } catch (e) {
        console.error("setAllForDay failed", e);
      }
    });
  };

  // Per-student summary counts
  const summary = (studentId: string) => {
    const counts = { present: 0, absent: 0, leave: 0, sick: 0 };
    for (const day of days) {
      if (!workdaySet.has(day)) continue;
      const s = statusMap[studentId]?.[day];
      if (s) counts[s]++;
    }
    return counts;
  };

  const workdayCount = workdaySet.size;

  // For "all present" toggle state — derived from current statusMap
  const isAllPresent = (day: number) =>
    students.length > 0 &&
    students.every((s) => statusMap[s.id]?.[day] === "present");

  return (
    <div>
      {/* Legend */}
      <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        คลิกวงกลม{" "}
        <span className="mx-0.5 inline-block h-2.5 w-2.5 translate-y-px rounded-full bg-emerald-500" />
        <span className="mx-0.5 inline-block h-2.5 w-2.5 translate-y-px rounded-full border border-zinc-300" />{" "}
        ที่หัวคอลัมน์เพื่อ <strong>เปิด/ปิดวันทำการ</strong> · คลิก{" "}
        <span className="mx-0.5 inline-flex h-4 w-4 translate-y-px items-center justify-center rounded-sm bg-emerald-500 text-[10px] text-white">
          ✓
        </span>{" "}
        ใต้วันที่เพื่อ <strong>เช็คมาทั้งห้อง</strong> · คลิกเซลล์เพื่อสลับสถานะ:{" "}
        <span className="ml-1 inline-flex items-center gap-1">
          <kbd className="rounded bg-emerald-100 px-1 text-emerald-700">✓</kbd>
          มา
        </span>{" "}
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded bg-red-100 px-1 text-red-700">×</kbd>
          ขาด
        </span>{" "}
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded bg-amber-100 px-1 text-amber-700">ล</kbd>
          ลา
        </span>{" "}
        <span className="inline-flex items-center gap-1">
          <kbd className="rounded bg-sky-100 px-1 text-sky-700">ป</kbd>
          ป่วย
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border border-zinc-200">
        {/* table-fixed + colgroup makes column widths STRICT.
            NO min-w-full — that would force the table to fill the container
            and stretch columns beyond their declared widths, causing the
            sticky offset (left: 48px) to no longer match the # column's
            actual right edge → a visible gap appears. */}
        <table className="table-fixed border-separate border-spacing-0 text-sm">
          <colgroup>
            <col style={{ width: "48px" }} />
            <col style={{ width: "180px" }} />
            {days.map((d) => (
              <col key={`col-${d}`} style={{ width: "44px" }} />
            ))}
            <col style={{ width: "64px" }} />
            <col style={{ width: "80px" }} />
            <col style={{ width: "48px" }} />
            <col style={{ width: "48px" }} />
          </colgroup>
          <thead>
            {/* Row 1 — workday toggles */}
            <tr>
              <th
                className="sticky z-10 border-b border-zinc-200 bg-zinc-100"
                style={{ left: STICKY_LEFT.num, width: "48px", minWidth: "48px" }}
              />
              <th
                className="sticky z-10 border-b border-r border-zinc-200 bg-zinc-100"
                style={{ left: STICKY_LEFT.name, width: "180px", minWidth: "180px" }}
              />
              {days.map((d) => {
                const isWorkday = workdaySet.has(d);
                return (
                  <th
                    key={`wd-${d}`}
                    className="border-b border-r border-zinc-200 bg-zinc-100 p-0 text-center"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDay(d)}
                      aria-label={`สลับวันทำการ วันที่ ${d}`}
                      title={isWorkday ? "ปิดวันทำการ" : "เปิดวันทำการ"}
                      className={
                        isWorkday
                          ? "my-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200 hover:bg-emerald-600"
                          : "my-1 h-3 w-3 rounded-full border border-zinc-300 bg-white hover:border-zinc-500"
                      }
                    />
                  </th>
                );
              })}
              <th
                colSpan={4}
                className="border-b border-zinc-200 bg-zinc-100"
              />
            </tr>

            {/* Row 2 — date labels + summary headers */}
            <tr>
              <th
                className="sticky z-10 border-b border-zinc-200 bg-zinc-50 px-1 py-2 text-xs font-semibold text-zinc-600"
                style={{ left: STICKY_LEFT.num, width: "48px", minWidth: "48px" }}
              >
                #
              </th>
              <th
                className="sticky z-10 border-b border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs font-semibold text-zinc-600"
                style={{ left: STICKY_LEFT.name, width: "180px", minWidth: "180px" }}
              >
                ชื่อ-สกุล
              </th>
              {days.map((d) => {
                const isWorkday = workdaySet.has(d);
                const dow = dayOfWeekLabel(yearCe, month, d);
                const tint = nonSchoolTint(d);
                const holidayName = holidayNames[d];
                const tintBg =
                  tint === "red"
                    ? "bg-red-50"
                    : tint === "yellow"
                      ? "bg-yellow-50"
                      : "bg-zinc-100 text-zinc-400";
                const headerClass = isWorkday
                  ? "border-b border-r border-zinc-200 bg-emerald-50/60 px-1 py-1 text-center"
                  : `border-b border-r border-zinc-200 ${tintBg} px-1 py-1 text-center`;
                return (
                  <th
                    key={`day-${d}`}
                    className={headerClass}
                    title={holidayName ?? undefined}
                  >
                    <div className="text-xs font-semibold leading-tight text-zinc-700">
                      {d}
                    </div>
                    <div className="text-[10px] leading-tight text-zinc-500">
                      {dow}
                    </div>
                  </th>
                );
              })}
              <th className="border-b border-r border-zinc-200 bg-zinc-50 px-1 py-2 text-center text-[10px] font-semibold uppercase text-zinc-600">
                วันเปิด
              </th>
              <th className="border-b border-r border-zinc-200 bg-emerald-50 px-1 py-2 text-center text-[10px] font-semibold uppercase text-emerald-800">
                มา %
              </th>
              <th className="border-b border-r border-zinc-200 bg-amber-50 px-1 py-2 text-center text-[10px] font-semibold uppercase text-amber-800">
                ลา
              </th>
              <th className="border-b border-r border-zinc-200 bg-red-50 px-1 py-2 text-center text-[10px] font-semibold uppercase text-red-800">
                ขาด
              </th>
            </tr>

            {/* Row 3 — "all present" toggle row */}
            <tr>
              <th
                className="sticky z-10 border-b border-zinc-200 bg-zinc-50"
                style={{ left: STICKY_LEFT.num, width: "48px", minWidth: "48px" }}
              />
              <th
                className="sticky z-10 border-b border-r border-zinc-200 bg-zinc-50 px-3 py-1 text-right text-[10px] text-zinc-500"
                style={{ left: STICKY_LEFT.name, width: "180px", minWidth: "180px" }}
              >
                เช็คมาทั้งห้อง →
              </th>
              {days.map((d) => {
                const isWorkday = workdaySet.has(d);
                const allPresent = isAllPresent(d);
                return (
                  <th
                    key={`all-${d}`}
                    className="border-b border-r border-zinc-200 bg-zinc-50 p-0 text-center"
                  >
                    <button
                      type="button"
                      onClick={() => toggleAllForDay(d)}
                      disabled={!isWorkday}
                      aria-label={`เช็คมาทั้งห้อง วันที่ ${d}`}
                      title={
                        !isWorkday
                          ? "เปิดวันทำการก่อน"
                          : allPresent
                            ? "ล้างทั้งห้อง"
                            : "เช็คมาทั้งห้อง"
                      }
                      className={
                        !isWorkday
                          ? "my-1 inline-flex h-5 w-5 cursor-not-allowed items-center justify-center rounded text-zinc-300"
                          : allPresent
                            ? "my-1 inline-flex h-5 w-5 items-center justify-center rounded bg-emerald-500 text-white hover:bg-emerald-600"
                            : "my-1 inline-flex h-5 w-5 items-center justify-center rounded border border-emerald-300 bg-white text-emerald-500 hover:bg-emerald-50"
                      }
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </th>
                );
              })}
              <th
                colSpan={4}
                className="border-b border-zinc-200 bg-zinc-50"
              />
            </tr>
          </thead>

          <tbody>
            {students.length === 0 ? (
              <tr>
                <td
                  colSpan={2 + daysInMonth + 4}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
                >
                  ห้องนี้ยังไม่มีนักเรียน
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const counts = summary(s.id);
                const attendPct =
                  workdayCount === 0
                    ? 0
                    : Math.round((counts.present / workdayCount) * 100);
                return (
                  <tr key={s.id} className="hover:bg-zinc-50">
                    <td
                      className="sticky z-10 border-b border-zinc-200 bg-white px-1 py-1.5 text-center font-mono text-xs text-zinc-700"
                      style={{ left: STICKY_LEFT.num, width: "48px", minWidth: "48px" }}
                    >
                      {s.student_number}
                    </td>
                    <td
                      className="sticky z-10 whitespace-nowrap border-b border-r border-zinc-200 bg-white px-3 py-1.5 text-zinc-900"
                      style={{ left: STICKY_LEFT.name, width: "180px", minWidth: "180px" }}
                    >
                      {s.full_label}
                    </td>
                    {days.map((d) => {
                      const isWorkday = workdaySet.has(d);
                      const status = statusMap[s.id]?.[d];
                      const tint = nonSchoolTint(d);
                      const cellClass = !isWorkday
                        ? tint === "red"
                          ? "bg-red-50"
                          : tint === "yellow"
                            ? "bg-yellow-50"
                            : "bg-zinc-100"
                        : status
                          ? STATUS_CLASS[status]
                          : "bg-white hover:bg-zinc-50";
                      return (
                        <td
                          key={`${s.id}-${d}`}
                          className={`border-b border-r border-zinc-200 p-0 text-center ${cellClass}`}
                        >
                          <button
                            type="button"
                            onClick={() => cycleStatus(s.id, d)}
                            disabled={!isWorkday}
                            aria-label={`${s.full_label} วันที่ ${d}`}
                            className="h-7 w-full text-sm font-medium disabled:cursor-not-allowed"
                          >
                            {status ? STATUS_LABEL[status] : ""}
                          </button>
                        </td>
                      );
                    })}
                    <td className="border-b border-r border-zinc-200 bg-zinc-50 px-1 py-1.5 text-center font-mono text-xs text-zinc-700">
                      {workdayCount}
                    </td>
                    <td className="border-b border-r border-zinc-200 bg-emerald-50 px-1 py-1.5 text-center text-xs font-semibold text-emerald-700">
                      {counts.present}
                      <span className="ml-1 text-[10px] font-normal text-emerald-600">
                        ({attendPct}%)
                      </span>
                    </td>
                    <td className="border-b border-r border-zinc-200 px-1 py-1.5 text-center text-xs text-amber-800">
                      {counts.leave || "—"}
                    </td>
                    <td className="border-b border-r border-zinc-200 px-1 py-1.5 text-center text-xs text-red-700">
                      {counts.absent || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
