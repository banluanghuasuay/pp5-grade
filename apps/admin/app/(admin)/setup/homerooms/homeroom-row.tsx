"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  assignHomeroomTeacher,
  clearHomeroomTeacher,
  type HomeroomRole,
} from "./actions";

type TeacherOption = { id: string; label: string };

type Props = {
  classroomId: string;
  classroomLabel: string;
  teachers: TeacherOption[];
  /** Currently-assigned teacher_id for each role (null = ไม่จัด). */
  current: { primary: string | null; secondary: string | null };
};

/**
 * One row of the homeroom-teachers table:
 *
 *   ชั้น ป.1/1   [ ครูประจำชั้น (หลัก) ▾ ]   [ ครูประจำชั้น (รอง) ▾ ]
 *
 * Both selects auto-save on change via server action. Same teacher
 * can't be in both roles of the same room (DB UNIQUE constraint); we
 * filter the secondary dropdown to exclude whoever's in primary
 * (and vice versa) so the user can't even pick the conflict.
 *
 * Optimistic local state is reset to server value on action failure
 * (alert shows the Postgres-translated error).
 */
export function HomeroomRow({
  classroomId,
  classroomLabel,
  teachers,
  current,
}: Props) {
  const [primary, setPrimary] = useState<string | null>(current.primary);
  const [secondary, setSecondary] = useState<string | null>(current.secondary);
  const [pendingRole, setPendingRole] = useState<HomeroomRole | null>(null);
  const [, startTransition] = useTransition();

  const save = (role: HomeroomRole, teacherId: string | null) => {
    // Optimistic update first
    const prevPrimary = primary;
    const prevSecondary = secondary;
    if (role === "primary") setPrimary(teacherId);
    else setSecondary(teacherId);
    setPendingRole(role);

    startTransition(async () => {
      try {
        if (teacherId === null) {
          const fd = new FormData();
          fd.set("classroom_id", classroomId);
          fd.set("role", role);
          await clearHomeroomTeacher(fd);
        } else {
          const fd = new FormData();
          fd.set("classroom_id", classroomId);
          fd.set("role", role);
          fd.set("teacher_id", teacherId);
          await assignHomeroomTeacher(fd);
        }
      } catch (e) {
        // Rollback this role's optimistic update
        if (role === "primary") setPrimary(prevPrimary);
        else setSecondary(prevSecondary);
        const msg = e instanceof Error ? e.message : String(e);
        alert(msg);
      } finally {
        setPendingRole(null);
      }
    });
  };

  const handleChange = (role: HomeroomRole, value: string) => {
    save(role, value === "" ? null : value);
  };

  return (
    <tr className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/60">
      <td className="px-3 py-2 text-sm font-medium text-zinc-900">
        {classroomLabel}
      </td>
      <td className="px-3 py-2">
        <HomeroomSelect
          value={primary ?? ""}
          teachers={teachers}
          /* Exclude whoever's in the other slot so the user can't pick a
             conflict the DB would reject anyway. The "primary"/"secondary"
             DB role values are just slot identifiers — both teachers have
             equal status per user spec. */
          excludeTeacherId={secondary}
          pending={pendingRole === "primary"}
          onChange={(v) => handleChange("primary", v)}
          ariaLabel={`ครูประจำชั้นคนที่ 1 ของ ${classroomLabel}`}
        />
      </td>
      <td className="px-3 py-2">
        <HomeroomSelect
          value={secondary ?? ""}
          teachers={teachers}
          excludeTeacherId={primary}
          pending={pendingRole === "secondary"}
          onChange={(v) => handleChange("secondary", v)}
          ariaLabel={`ครูประจำชั้นคนที่ 2 ของ ${classroomLabel}`}
        />
      </td>
    </tr>
  );
}

function HomeroomSelect({
  value,
  teachers,
  excludeTeacherId,
  pending,
  onChange,
  ariaLabel,
}: {
  value: string;
  teachers: TeacherOption[];
  excludeTeacherId: string | null;
  pending: boolean;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  const visible = teachers.filter((t) => t.id !== excludeTeacherId);
  return (
    <div className="relative flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        aria-label={ariaLabel}
        className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">— ยังไม่จัด —</option>
        {visible.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      {pending && (
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin text-zinc-400"
          aria-hidden
        />
      )}
    </div>
  );
}
