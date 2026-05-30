"use client";

import { Select } from "@pp5/ui";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteEnrollmentsBatch,
  finalizeEnrollmentDelete,
  getEnrollmentsToDelete,
} from "./delete-actions";

const CONFIRM_PHRASE = "ลบรายชื่อ";
const BATCH_SIZE = 5;

type GradeOption = { id: string; label: string; count: number };

type Phase = "idle" | "resolving" | "deleting" | "done";

type Progress = {
  processed: number;
  total: number;
  deleted: number;
};

type Result = {
  deleted: number;
  failed: number;
  firstError: string | null;
};

export function DeleteStudentsDialog({
  gradeOptions,
  totalCount,
  currentSemester,
}: {
  gradeOptions: GradeOption[];
  totalCount: number;
  /** School's current semester (1 or 2) — used to scope secondary deletes. */
  currentSemester: 1 | 2;
}) {
  const [open, setOpen] = useState(false);
  const [gradeId, setGradeId] = useState<string>(""); // "" | "all" | gradeId
  const [confirmText, setConfirmText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const resetDialog = () => {
    setGradeId("");
    setConfirmText("");
    setError(null);
    setProgress(null);
    setResult(null);
    setPhase("idle");
  };

  const handleOpen = () => {
    resetDialog();
    setOpen(true);
  };
  const handleClose = () => {
    if (phase === "deleting") return; // can't close mid-delete
    setOpen(false);
    resetDialog();
  };

  // Warn before unloading the tab during a delete in progress
  useEffect(() => {
    if (phase !== "deleting") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // The currently-selected scope's predicted count (from server-rendered props)
  const selectedCount =
    gradeId === ""
      ? null
      : gradeId === "all"
        ? totalCount
        : (gradeOptions.find((g) => g.id === gradeId)?.count ?? 0);

  const canConfirm =
    !!gradeId &&
    confirmText.trim() === CONFIRM_PHRASE &&
    phase === "idle";

  const handleDelete = async () => {
    if (!canConfirm) return;
    setError(null);
    setPhase("resolving");

    const target = await getEnrollmentsToDelete(gradeId, currentSemester);
    if (!target.ok) {
      setError(target.error);
      setPhase("idle");
      return;
    }
    if (target.ids.length === 0) {
      setResult({ deleted: 0, failed: 0, firstError: null });
      setPhase("done");
      return;
    }

    setProgress({ processed: 0, total: target.ids.length, deleted: 0 });
    setPhase("deleting");

    let totalDeleted = 0;
    let totalFailed = 0;
    let firstError: string | null = null;
    const affected = new Set<string>();

    for (let i = 0; i < target.ids.length; i += BATCH_SIZE) {
      const batch = target.ids.slice(i, i + BATCH_SIZE);
      const res = await deleteEnrollmentsBatch(batch);
      totalDeleted += res.deleted;
      totalFailed += res.failed.length;
      if (firstError == null && res.failed[0]) {
        firstError = res.failed[0].reason;
      }
      for (const cid of res.affectedClassroomIds) affected.add(cid);
      setProgress({
        processed: Math.min(i + batch.length, target.ids.length),
        total: target.ids.length,
        deleted: totalDeleted,
      });
    }

    // Renumber every classroom that lost enrollments
    await finalizeEnrollmentDelete(Array.from(affected));
    setResult({
      deleted: totalDeleted,
      failed: totalFailed,
      firstError,
    });
    setPhase("done");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
      >
        <Trash2 className="size-4" aria-hidden />
        ลบข้อมูล
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            {/* ---------- IDLE / RESOLVING: form ---------- */}
            {(phase === "idle" || phase === "resolving") && (
              <>
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="size-6 shrink-0 text-amber-600"
                    aria-hidden
                  />
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">
                      ลบรายชื่อจากปีปัจจุบัน
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      ลบ enrollment ของนักเรียนออกจากห้องในปีปัจจุบันเท่านั้น
                      ·{" "}
                      <span className="text-xs text-zinc-500">
                        ประวัติปีก่อนหน้า (คะแนน · เวลาเรียน · ฯลฯ)
                        จะยังคงอยู่
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">
                      เลือกขอบเขต
                    </label>
                    <Select
                      value={gradeId}
                      onChange={(e) => {
                        setGradeId(e.target.value);
                        setConfirmText(""); // re-require confirmation
                      }}
                      className="mt-1 w-full"
                      disabled={phase === "resolving"}
                    >
                      <option value="">— เลือก —</option>
                      <option value="all">ทั้งหมด ({totalCount} คน)</option>
                      {gradeOptions.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label} ({g.count} คน)
                        </option>
                      ))}
                    </Select>
                  </div>

                  {selectedCount !== null && (
                    <div
                      className={
                        selectedCount > 0
                          ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                          : "rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                      }
                    >
                      {selectedCount > 0 ? (
                        <>
                          จะลบ <strong>{selectedCount}</strong> รายชื่อ{" "}
                          <span className="text-zinc-600">
                            (ประวัติปีก่อนคงไว้)
                          </span>
                        </>
                      ) : (
                        <>ไม่มีรายชื่อในขอบเขตที่เลือก</>
                      )}
                    </div>
                  )}

                  {gradeId && (selectedCount ?? 0) > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-700">
                        พิมพ์ <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono">{CONFIRM_PHRASE}</code>{" "}
                        เพื่อยืนยัน
                      </label>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        autoComplete="off"
                        autoFocus
                        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                        disabled={phase === "resolving"}
                      />
                    </div>
                  )}

                  {error && (
                    <p
                      role="alert"
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                    >
                      ❌ {error}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={phase === "resolving"}
                    className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-60"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={!canConfirm}
                    className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {phase === "resolving" ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="size-4" aria-hidden />
                    )}
                    ลบรายชื่อ
                  </button>
                </div>
              </>
            )}

            {/* ---------- DELETING: live progress ---------- */}
            {phase === "deleting" && progress && (
              <DeleteProgress progress={progress} />
            )}

            {/* ---------- DONE: result summary ---------- */}
            {phase === "done" && result && (
              <DeleteResult result={result} onClose={handleClose} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function DeleteProgress({ progress }: { progress: Progress }) {
  const pct =
    progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;
  return (
    <div>
      <div className="flex items-center gap-3">
        <Loader2 className="size-6 animate-spin text-red-600" aria-hidden />
        <div>
          <h3 className="text-base font-semibold text-zinc-900">
            กำลังลบรายชื่อ
          </h3>
          <p className="text-xs text-zinc-500">
            กรุณาอย่าปิดหน้านี้ หรือเปลี่ยนเมนู
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full bg-red-500 transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="mt-2 flex items-center justify-between text-sm">
          <span className="text-zinc-700">
            ดำเนินการ <strong>{progress.processed}</strong> /{" "}
            <strong>{progress.total}</strong> คน
          </span>
          <span className="font-mono font-semibold text-zinc-900">
            {pct}%
          </span>
        </p>
      </div>

      <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">
        ลบสำเร็จแล้ว: <strong>{progress.deleted}</strong> รายชื่อ
      </div>
    </div>
  );
}

function DeleteResult({
  result,
  onClose,
}: {
  result: Result;
  onClose: () => void;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold text-zinc-900">
        ลบรายชื่อเสร็จสิ้น
      </h3>

      <div className="mt-4 space-y-2 text-sm">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
          ✓ ลบสำเร็จ <strong>{result.deleted}</strong> รายชื่อ
        </div>
        {result.failed > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900">
            ❌ ล้มเหลว <strong>{result.failed}</strong> รายชื่อ
            {result.firstError && (
              <p className="mt-1 text-xs text-red-700">
                ตัวอย่าง: {result.firstError}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
        >
          ปิด
        </button>
      </div>
    </div>
  );
}
