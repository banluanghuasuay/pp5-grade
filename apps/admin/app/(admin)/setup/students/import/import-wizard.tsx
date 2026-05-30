"use client";

import { Card } from "@pp5/ui";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  commitStudentImportBatch,
  finalizeStudentImport,
  parseStudentImport,
  type ImportFailedRow,
  type ImportResult,
  type ImportRow,
  type PreviewResult,
} from "./actions";

/** How many rows the client commits per server-action call. Smaller = more
 *  frequent progress updates; larger = fewer round-trips. */
const BATCH_SIZE = 5;

type Phase = "idle" | "parsing" | "preview" | "committing" | "done";
type SuccessPreview = Extract<PreviewResult, { ok: true }>;
type TabKey = "valid" | "duplicates" | "invalid_classroom" | "missing";

type CommitProgress = {
  processed: number;
  total: number;
  succeeded: number;
};

export function ImportWizard() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<SuccessPreview | null>(null);
  const [progress, setProgress] = useState<CommitProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Warn the user if they try to close/refresh the tab while commit is running
  useEffect(() => {
    if (phase !== "committing") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires `returnValue` to be set (deprecated but still works)
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  const handleUpload = (formData: FormData) => {
    setError(null);
    setPhase("parsing");
    startTransition(async () => {
      const res = await parseStudentImport(formData);
      if (!res.ok) {
        setError(res.error);
        setPhase("idle");
        return;
      }
      setPreview(res);
      setPhase("preview");
    });
  };

  const handleConfirm = async () => {
    if (!preview) return;
    const rows = preview.valid;
    setProgress({ processed: 0, total: rows.length, succeeded: 0 });
    setPhase("committing");

    const allFailed: ImportResult["failed"] = [];
    // Dedupe affected (classroom, semester) scopes across batches by
    // encoding the pair into a single string key.
    const affected = new Set<string>();
    let totalSucceeded = 0;

    // Commit in small batches so the progress bar updates frequently
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const res = await commitStudentImportBatch(batch);
      totalSucceeded += res.succeeded;
      allFailed.push(...res.failed);
      for (const s of res.affectedScopes) {
        affected.add(`${s.classroomId}|${s.semester}`);
      }
      setProgress({
        processed: Math.min(i + batch.length, rows.length),
        total: rows.length,
        succeeded: totalSucceeded,
      });
    }

    // Renumber affected (classroom, semester) scopes once each (sorted by
    // student_code within each scope).
    const scopes = Array.from(affected).map((k) => {
      const [classroomId, semStr] = k.split("|");
      return {
        classroomId,
        semester: Number(semStr) as 0 | 1 | 2,
      };
    });
    await finalizeStudentImport(scopes);

    setResult({ succeeded: totalSucceeded, failed: allFailed });
    setPhase("done");
  };

  const handleCancel = () => {
    setPreview(null);
    setResult(null);
    setError(null);
    setProgress(null);
    setPhase("idle");
  };

  return (
    <>
      {(phase === "idle" || phase === "parsing") && (
        <UploadForm
          onSubmit={handleUpload}
          busy={phase === "parsing"}
          error={error}
        />
      )}

      {phase === "preview" && preview && (
        <PreviewView
          preview={preview}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {phase === "done" && result && (
        <ResultView
          result={result}
          validCount={preview?.valid.length ?? 0}
          onAgain={handleCancel}
        />
      )}

      {phase === "committing" && progress && (
        <CommittingOverlay progress={progress} />
      )}
    </>
  );
}

// ============================================================
// Fullscreen overlay shown during the commit phase. Blocks all clicks
// on the surrounding page (sidebar, header) and shows live progress.
// ============================================================

function CommittingOverlay({ progress }: { progress: CommitProgress }) {
  const pct =
    progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;
  return (
    <div
      // z-[60] sits above the sidebar/header so they're un-clickable
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="กำลังบันทึกข้อมูลนักเรียน"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary-600" aria-hidden />
          <div>
            <h3 className="text-base font-semibold text-zinc-900">
              กำลังบันทึกข้อมูลนักเรียน
            </h3>
            <p className="text-xs text-zinc-500">
              กรุณาอย่าปิดหน้านี้ หรือเปลี่ยนเมนู
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full bg-emerald-500 transition-[width] duration-300 ease-out"
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

        {/* Live success count */}
        <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          ✓ บันทึกสำเร็จแล้ว: <strong>{progress.succeeded}</strong> คน
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Phase 1: Upload form
// ============================================================

function UploadForm({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (formData: FormData) => void;
  busy: boolean;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <Card padding="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onSubmit(fd);
        }}
        className="flex flex-col gap-4"
      >
        <h3 className="text-sm font-semibold text-zinc-900">2. อัปโหลดไฟล์</h3>

        <label
          className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100"
          htmlFor="file-input"
        >
          <FileSpreadsheet className="size-5 text-zinc-500" aria-hidden />
          {fileName ?? "เลือกไฟล์ .xlsx"}
        </label>
        <input
          id="file-input"
          ref={inputRef}
          name="file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />

        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
          >
            ❌ {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={busy || !fileName}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-4" aria-hidden />
            )}
            {busy ? "กำลังตรวจสอบ..." : "ตรวจสอบไฟล์"}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ============================================================
// Phase 2: Preview tabs
// ============================================================

function PreviewView({
  preview,
  onConfirm,
  onCancel,
}: {
  preview: SuccessPreview;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("valid");

  const tabs: Array<{
    key: TabKey;
    label: string;
    count: number;
    icon: typeof CheckCircle2;
    color: string;
  }> = [
    {
      key: "valid",
      label: "ที่ถูกต้อง",
      count: preview.valid.length,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
    {
      key: "duplicates",
      label: "เลขประจำตัวซ้ำ",
      count: preview.duplicates.length,
      icon: AlertTriangle,
      color: "text-amber-600",
    },
    {
      key: "invalid_classroom",
      label: "ชั้นเรียนไม่ถูก",
      count: preview.invalidClassroom.length,
      icon: AlertTriangle,
      color: "text-amber-600",
    },
    {
      key: "missing",
      label: "ข้อมูลไม่ครบ",
      count: preview.missingFields.length,
      icon: XCircle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card padding="sm" className="bg-zinc-50 text-sm text-zinc-700">
        <p>
          ตรวจพบ <strong>{preview.totalRows}</strong> แถว · ปีการศึกษา{" "}
          <strong>{preview.yearBe}</strong>
        </p>
      </Card>

      <div className="flex flex-wrap gap-1 border-b border-zinc-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "-mb-px inline-flex items-center gap-1.5 border-b-2 border-blue-600 px-4 py-2.5 text-sm font-semibold text-blue-700"
                  : "-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }
            >
              <Icon className={`size-4 ${active ? "" : t.color}`} aria-hidden />
              {t.label}
              <span
                className={`ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs ${
                  active
                    ? "bg-blue-100 text-blue-700"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "valid" && <ValidRowsTable rows={preview.valid} />}
      {tab === "duplicates" && (
        <FailedRowsTable rows={preview.duplicates} variant="warning" />
      )}
      {tab === "invalid_classroom" && (
        <FailedRowsTable rows={preview.invalidClassroom} variant="warning" />
      )}
      {tab === "missing" && (
        <FailedRowsTable rows={preview.missingFields} variant="error" />
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          ยกเลิก / เลือกไฟล์ใหม่
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={preview.valid.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle2 className="size-4" aria-hidden />
          บันทึก {preview.valid.length} คน
        </button>
      </div>
    </div>
  );
}

function ValidRowsTable({ rows }: { rows: ImportRow[] }) {
  if (rows.length === 0) {
    return (
      <Card variant="dashed" padding={false} className="p-8 text-center text-sm text-zinc-500">
        ไม่มีแถวที่ถูกต้อง
      </Card>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">แถว</th>
            <th className="px-3 py-2 font-medium">เลขประจำตัว</th>
            <th className="px-3 py-2 font-medium">ชื่อ-นามสกุล</th>
            <th className="px-3 py-2 font-medium">ห้อง</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {rows.map((r) => (
            <tr key={r.rowNumber} className="hover:bg-zinc-50">
              <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                {r.rowNumber}
              </td>
              <td className="px-3 py-2 font-mono text-zinc-700">
                {r.student_code}
              </td>
              <td className="px-3 py-2">
                {r.title}
                {r.first_name} {r.last_name}
              </td>
              <td className="px-3 py-2 font-medium text-zinc-900">
                {r.classroom_label}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FailedRowsTable({
  rows,
  variant,
}: {
  rows: ImportFailedRow[];
  variant: "warning" | "error";
}) {
  if (rows.length === 0) {
    return (
      <Card variant="dashed" padding={false} className="p-8 text-center text-sm text-zinc-500">
        ไม่มีแถวในกลุ่มนี้
      </Card>
    );
  }
  const reasonCellClass =
    variant === "error" ? "text-red-700" : "text-amber-700";
  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">แถว</th>
            <th className="px-3 py-2 font-medium">เลขประจำตัว</th>
            <th className="px-3 py-2 font-medium">ชื่อ-นามสกุล</th>
            <th className="px-3 py-2 font-medium">ห้องที่ระบุ</th>
            <th className="px-3 py-2 font-medium">เหตุผล</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {rows.map((r) => (
            <tr key={r.rowNumber} className="hover:bg-zinc-50">
              <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                {r.rowNumber}
              </td>
              <td className="px-3 py-2 font-mono text-zinc-700">
                {r.student_code || "—"}
              </td>
              <td className="px-3 py-2">
                {r.title ?? ""}
                {r.first_name} {r.last_name}
              </td>
              <td className="px-3 py-2 text-zinc-700">
                {r.grade_raw && r.room_raw
                  ? `${r.grade_raw}/${r.room_raw}`
                  : "—"}
              </td>
              <td className={`px-3 py-2 ${reasonCellClass}`}>{r.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Phase 3: Result summary
// ============================================================

function ResultView({
  result,
  validCount,
  onAgain,
}: {
  result: ImportResult;
  validCount: number;
  onAgain: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card padding="md" className="bg-emerald-50">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-6 text-emerald-600" aria-hidden />
          <div>
            <p className="text-base font-semibold text-emerald-900">
              บันทึกสำเร็จ {result.succeeded} จาก {validCount} คน
            </p>
            {result.failed.length > 0 && (
              <p className="text-sm text-emerald-800">
                ล้มเหลว {result.failed.length} คน — ดูรายละเอียดด้านล่าง
              </p>
            )}
          </div>
        </div>
      </Card>

      {result.failed.length > 0 && (
        <div className="overflow-hidden rounded-md border border-red-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-red-200 bg-red-50 text-left text-xs uppercase tracking-wide text-red-700">
              <tr>
                <th className="px-3 py-2 font-medium">แถว</th>
                <th className="px-3 py-2 font-medium">เลขประจำตัว</th>
                <th className="px-3 py-2 font-medium">เหตุผล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100">
              {result.failed.map((f) => (
                <tr key={f.rowNumber}>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                    {f.rowNumber}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-700">
                    {f.student_code}
                  </td>
                  <td className="px-3 py-2 text-red-700">{f.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onAgain}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          นำเข้ารอบใหม่
        </button>
        <Link
          href="/setup/students"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
        >
          กลับไปหน้านักเรียน
        </Link>
      </div>
    </div>
  );
}
