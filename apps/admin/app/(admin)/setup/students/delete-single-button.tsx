"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSingleEnrollment } from "./delete-actions";

/**
 * Per-row trash icon button next to the edit pencil. Removes the student
 * **from the current academic year only** — the student record, auth
 * account, and historical data (previous years' scores/attendance) all
 * stay intact.
 */
export function DeleteSingleStudentButton({
  enrollmentId,
  displayName,
  classroomLabel,
  yearBe,
}: {
  enrollmentId: string;
  displayName: string;
  classroomLabel: string;
  yearBe: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleOpen = () => {
    setError(null);
    setOpen(true);
  };
  const handleClose = () => {
    if (pending) return; // don't close mid-delete
    setOpen(false);
    setError(null);
  };

  const handleDelete = () => {
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
                onClick={handleDelete}
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
          </div>
        </div>
      )}
    </>
  );
}
