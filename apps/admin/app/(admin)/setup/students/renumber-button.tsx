"use client";

import { Loader2, ListOrdered } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { renumberClassroomById } from "./actions";

/**
 * "เรียงเลขที่ใหม่" button for the students list page. Renumbers only the
 * currently-displayed classroom (sorted by student_code).
 *
 * The label below the button reminds the admin that only this room is
 * affected, not the whole grade or all students.
 */
export function RenumberClassroomButton({
  classroomId,
  classroomLabel,
  semester,
}: {
  classroomId: string;
  classroomLabel: string;
  /** Semester scope for the renumber (0 = primary, 1/2 = secondary). */
  semester: 0 | 1 | 2;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { ok: true; text: string }
    | { ok: false; text: string }
    | null
  >(null);
  const router = useRouter();

  // Auto-dismiss the success message after a few seconds
  useEffect(() => {
    if (!feedback || !feedback.ok) return;
    const t = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleClick = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await renumberClassroomById(classroomId, semester);
      if (res.ok) {
        setFeedback({
          ok: true,
          text: `เรียงเลขที่ใหม่แล้ว (${res.count} คน)`,
        });
        router.refresh();
      } else {
        setFeedback({ ok: false, text: res.error });
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        title={`เรียงเลขที่ใหม่ในห้อง ${classroomLabel} ตามรหัสนักเรียน · ไม่กระทบห้องอื่น`}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <ListOrdered className="size-3.5" aria-hidden />
        )}
        {pending ? "กำลังเรียง..." : "เรียงเลขที่ใหม่"}
      </button>
      <span className="text-[11px] text-zinc-500">
        เฉพาะห้อง <strong>{classroomLabel}</strong> เท่านั้น
      </span>
      {feedback && (
        <span
          role="status"
          className={
            feedback.ok
              ? "text-[11px] font-medium text-emerald-700"
              : "text-[11px] font-medium text-red-700"
          }
        >
          {feedback.ok ? "✓" : "❌"} {feedback.text}
        </span>
      )}
    </div>
  );
}
