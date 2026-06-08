"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteStudentCompletely, deleteSingleEnrollment } from "./delete-actions";

/**
 * Per-row trash icon button next to the edit pencil.
 *
 * **ลบออกจากห้อง (soft delete)** — removes the enrollment row for the
 * current academic year. Student record, auth account, and historical data
 * all stay intact.
 *
 * **ลบถาวร (hard delete)** — removes the auth.users row AND the students row
 * (CASCADE handles enrollments). Use when you need to re-add the student with
 * the same student_code.
 */
export function DeleteSingleStudentButton({
  enrollmentId,
  displayName,
  classroomLabel,
  yearBe,
  studentId,
}: {
  enrollmentId: string;
  displayName: string;
  classroomLabel: string;
  yearBe: number;
  /** students.id — needed for hard delete */
  studentId: string;
}) {
  const [open, setOpen] = useState(false);
  /** "soft" = remove from classroom only; "hard" = delete permanently */
  const [view, setView] = useState<"soft" | "hard">("soft");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleOpen = () => {
    setError(null);
    setView("soft");
    setOpen(true);
  };
  const handleClose = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
    setView("soft");
  };

  const handleSoftDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteSingleEnrollment(enrollmentId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  const handleHardDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteStudentCompletely(studentId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="ลบ"
        aria-label={`ลบ ${displayName}`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            {view === "soft" ? (
              /* ── Soft-delete confirmation ─────────────────────────── */
              <>
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="size-6 shrink-0 text-amber-600"
                    aria-hidden
                  />
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">
                      ลบออกจากห้อง
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      ลบ <strong>{displayName}</strong> ออกจากห้อง{" "}
                      <strong>{classroomLabel}</strong> (ปี{" "}
                      <strong className="font-mono">{yearBe}</strong>) เท่านั้น
                      <br />
                      <span className="text-xs text-zinc-500">
                        ประวัติปีก่อนหน้า (คะแนน · เวลาเรียน · ฯลฯ) จะยังคงอยู่
                      </span>
                    </p>
                  </div>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                  >
                    ❌ {error}
                  </p>
                )}

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={pending}
                    className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSoftDelete}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="size-4" aria-hidden />
                    )}
                    {pending ? "กำลังลบ..." : "ลบออกจากห้อง"}
                  </button>
                </div>

                {/* Hard-delete escape hatch — small & unobtrusive */}
                <div className="mt-4 border-t border-zinc-100 pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setView("hard");
                    }}
                    disabled={pending}
                    className="text-xs text-zinc-400 underline hover:text-red-600 disabled:pointer-events-none"
                  >
                    ลบถาวร (ลบออกจากระบบทั้งหมด)
                  </button>
                </div>
              </>
            ) : (
              /* ── Hard-delete confirmation ──────────────────────────── */
              <>
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="size-6 shrink-0 text-red-600"
                    aria-hidden
                  />
                  <div>
                    <h3 className="text-base font-semibold text-red-700">
                      ลบถาวรออกจากระบบ
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      ลบ <strong>{displayName}</strong>{" "}
                      ออกจากระบบทั้งหมด รวมถึงบัญชีผู้ใช้
                    </p>
                    <p className="mt-1 text-sm font-medium text-red-600">
                      ไม่สามารถกู้คืนได้
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      ใช้เมื่อต้องการเพิ่มนักเรียนคนนี้ใหม่ด้วยรหัสเดิม
                    </p>
                  </div>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                  >
                    ❌ {error}
                  </p>
                )}

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setView("soft");
                    }}
                    disabled={pending}
                    className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="button"
                    onClick={handleHardDelete}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-800 disabled:opacity-60"
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="size-4" aria-hidden />
                    )}
                    {pending ? "กำลังลบ..." : "ลบถาวร"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
