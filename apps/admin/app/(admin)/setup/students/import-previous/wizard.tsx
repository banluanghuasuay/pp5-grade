"use client";

import { Card, Select } from "@pp5/ui";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  commitPromoteBatch,
  finalizePromote,
  getPromotePreview,
  type PreviewResult,
  type PromoteRow,
} from "./actions";

const BATCH_SIZE = 5;

type Year = { id: string; year_be: number; semester: 0 | 1 | 2 };

export type SourceGrade = {
  id: string;
  label: string;
  rooms: Array<{ id: string; room_number: number }>;
};

type Mode = "year" | "semester";

type Phase =
  | "selectYears"
  | "loadingPreview"
  | "review"
  | "committing"
  | "done";

type Progress = { processed: number; total: number; promoted: number };

type Result = {
  promoted: number;
  failed: Array<{ studentId: string; reason: string }>;
};

type SuccessPreview = Extract<PreviewResult, { ok: true }>;

export function ImportPreviousWizard({
  source,
  target,
  mode,
  grades,
}: {
  source: Year;
  target: Year;
  mode: Mode;
  grades: SourceGrade[];
}) {
  const [phase, setPhase] = useState<Phase>("selectYears");
  /** Selected source grade_level_id ("" = not chosen yet) */
  const [gradeId, setGradeId] = useState<string>("");
  /** Selected source classroom_id (only required when grade has 2+ rooms) */
  const [roomId, setRoomId] = useState<string>("");
  const [preview, setPreview] = useState<SuccessPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** studentIds the admin has UNCHECKED (i.e. won't be promoted) */
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [, startTransition] = useTransition();

  // Convenience: rooms of the currently-selected grade
  const selectedGrade = grades.find((g) => g.id === gradeId) ?? null;
  const needsRoomChoice = (selectedGrade?.rooms.length ?? 0) > 1;
  const resolvedClassroomId = !selectedGrade
    ? null
    : needsRoomChoice
      ? roomId || null
      : selectedGrade.rooms[0]?.id ?? null;

  // Warn on tab close during commit
  useEffect(() => {
    if (phase !== "committing") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  const handleLoadPreview = () => {
    setError(null);
    setSkipped(new Set());
    if (!resolvedClassroomId) {
      setError(
        needsRoomChoice
          ? "กรุณาเลือกห้องเรียน"
          : "กรุณาเลือกชั้นที่ต้องการนำเข้า",
      );
      return;
    }
    setPhase("loadingPreview");
    startTransition(async () => {
      const res = await getPromotePreview(
        source.id,
        target.id,
        source.semester,
        target.semester,
        resolvedClassroomId,
      );
      if (!res.ok) {
        setError(res.error);
        setPhase("selectYears");
        return;
      }
      setPreview(res);
      setPhase("review");
    });
  };

  const handleConfirm = async () => {
    if (!preview) return;
    const promoteRows = preview.rows.filter(
      (r) => r.status === "will_promote" && !skipped.has(r.studentId),
    );
    if (promoteRows.length === 0) return;

    setPhase("committing");
    setProgress({ processed: 0, total: promoteRows.length, promoted: 0 });

    const allFailed: Result["failed"] = [];
    const affected = new Set<string>();
    let totalPromoted = 0;

    for (let i = 0; i < promoteRows.length; i += BATCH_SIZE) {
      const batch = promoteRows.slice(i, i + BATCH_SIZE).map((r) => ({
        studentId: r.studentId,
        targetClassroomId: r.targetClassroomId!,
        targetSemester: target.semester,
      }));
      const res = await commitPromoteBatch(batch);
      totalPromoted += res.promoted;
      allFailed.push(...res.failed);
      for (const cid of res.affectedClassroomIds) affected.add(cid);
      setProgress({
        processed: Math.min(i + batch.length, promoteRows.length),
        total: promoteRows.length,
        promoted: totalPromoted,
      });
    }

    await finalizePromote(Array.from(affected), target.semester);
    setResult({ promoted: totalPromoted, failed: allFailed });
    setPhase("done");
  };

  const handleStartOver = () => {
    setPreview(null);
    setResult(null);
    setSkipped(new Set());
    setError(null);
    setProgress(null);
    // Keep grade/room selection so admin can quickly verify another room
    setPhase("selectYears");
  };

  return (
    <>
      {phase === "selectYears" && (
        <YearConfirmStep
          source={source}
          target={target}
          mode={mode}
          grades={grades}
          gradeId={gradeId}
          roomId={roomId}
          needsRoomChoice={needsRoomChoice}
          canProceed={!!resolvedClassroomId}
          onGradeChange={(v) => {
            setGradeId(v);
            setRoomId(""); // reset room when grade changes
            setError(null);
          }}
          onRoomChange={(v) => {
            setRoomId(v);
            setError(null);
          }}
          onNext={handleLoadPreview}
          error={error}
        />
      )}

      {phase === "loadingPreview" && (
        <Card padding="md" className="flex items-center gap-3 text-zinc-700">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span className="text-sm">กำลังโหลดข้อมูลและคำนวณการย้ายชั้น...</span>
        </Card>
      )}

      {phase === "review" && preview && (
        <ReviewStep
          preview={preview}
          skipped={skipped}
          onToggle={(id) => {
            setSkipped((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onConfirm={handleConfirm}
          onBack={handleStartOver}
        />
      )}

      {phase === "committing" && progress && (
        <CommittingOverlay progress={progress} />
      )}

      {phase === "done" && result && preview && (
        <ResultStep
          result={result}
          preview={preview}
          skippedCount={skipped.size}
          onStartOver={handleStartOver}
        />
      )}
    </>
  );
}

// ============================================================
// Step 1: confirm fixed years (read-only display)
// ============================================================

function YearConfirmStep({
  source,
  target,
  mode,
  grades,
  gradeId,
  roomId,
  needsRoomChoice,
  canProceed,
  onGradeChange,
  onRoomChange,
  onNext,
  error,
}: {
  source: Year;
  target: Year;
  mode: Mode;
  grades: SourceGrade[];
  gradeId: string;
  roomId: string;
  needsRoomChoice: boolean;
  canProceed: boolean;
  onGradeChange: (v: string) => void;
  onRoomChange: (v: string) => void;
  onNext: () => void;
  error: string | null;
}) {
  const selectedGrade = grades.find((g) => g.id === gradeId);
  const isSemesterMode = mode === "semester";
  // Detect intra-year (same year, different semester) — no grade advancement
  const isIntraYear = source.id === target.id;
  return (
    <Card padding="md">
      <h3 className="text-base font-semibold text-zinc-900">
        1. {isSemesterMode ? "ภาคเรียน + ชั้น" : "ปีการศึกษา + ชั้น"}ที่จะนำเข้า
      </h3>
      <p className="mt-1 text-sm text-zinc-600">
        {isIntraYear ? (
          <>
            ระบบจะ <strong>สร้าง enrollment ใหม่ในภาคเรียนปัจจุบัน</strong>{" "}
            (ห้องเดิม ชั้นเดิม คนละภาคเรียน) ·{" "}
            <strong>ข้อมูลภาคเรียนก่อนหน้าจะคงไว้เป็นประวัติ</strong>
          </>
        ) : (
          <>
            ระบบจะ <strong>สร้าง enrollment ใหม่ในปีปัจจุบัน</strong>{" "}
            ตามการแมปอัตโนมัติ (ห้องเดิม, ชั้นถัดไป) ·{" "}
            <strong>ข้อมูลก่อนหน้าจะคงไว้เป็นประวัติ</strong>
          </>
        )}
      </p>

      {/* Fixed year+semester display */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <YearChip
          label={isSemesterMode ? "ภาคเรียนก่อนหน้า (จาก)" : "ปีที่แล้ว (จาก)"}
          year={source.year_be}
          semester={source.semester}
          tone="zinc"
        />
        <ArrowRight
          className="hidden size-5 text-zinc-400 sm:block"
          aria-hidden
        />
        <YearChip
          label={
            isSemesterMode ? "ภาคเรียนปัจจุบัน (ไป)" : "ปีปัจจุบัน (ไป)"
          }
          year={target.year_be}
          semester={target.semester}
          tone="emerald"
        />
      </div>

      {/* Grade + (conditional) room dropdowns */}
      <div className="mt-5 flex flex-wrap items-end gap-4 border-t border-zinc-200 pt-5">
        <div className="min-w-[180px]">
          <label className="block text-sm font-medium text-zinc-700">
            ชั้นที่จะนำเข้า
          </label>
          <Select
            value={gradeId}
            onChange={(e) => onGradeChange(e.target.value)}
            className="mt-1 w-44"
          >
            <option value="">— เลือกชั้น —</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label} ({g.rooms.length} ห้อง)
              </option>
            ))}
          </Select>
        </div>

        {needsRoomChoice && selectedGrade && (
          <div className="min-w-[140px]">
            <label className="block text-sm font-medium text-zinc-700">
              ห้อง
            </label>
            <Select
              value={roomId}
              onChange={(e) => onRoomChange(e.target.value)}
              className="mt-1 w-32"
            >
              <option value="">— เลือกห้อง —</option>
              {selectedGrade.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  ห้อง {r.room_number}
                </option>
              ))}
            </Select>
          </div>
        )}

        <p className="ml-auto text-xs text-zinc-500">
          เลือก 1 ชั้น/ห้อง ต่อรอบ — ลดเวลานำเข้า
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          ❌ {error}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ตรวจสอบรายชื่อ
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </Card>
  );
}

function YearChip({
  label,
  year,
  semester,
  tone,
}: {
  label: string;
  year: number;
  semester: 0 | 1 | 2;
  tone: "zinc" | "emerald";
}) {
  const palette =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-zinc-200 bg-zinc-50 text-zinc-700";
  return (
    <div className={`rounded-md border ${palette} px-4 py-3`}>
      <p className="text-xs">{label}</p>
      <p className="mt-0.5 font-mono text-2xl font-bold leading-tight">
        {year}
        {semester > 0 && (
          <span className="ml-2 text-base font-semibold">ภาค {semester}</span>
        )}
      </p>
    </div>
  );
}

// ============================================================
// Step 2: review table
// ============================================================

function ReviewStep({
  preview,
  skipped,
  onToggle,
  onConfirm,
  onBack,
}: {
  preview: SuccessPreview;
  skipped: Set<string>;
  onToggle: (id: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const counts = useMemo(() => {
    let willPromote = 0;
    let willGraduate = 0;
    let noTarget = 0;
    let alreadyEnrolled = 0;
    for (const r of preview.rows) {
      if (r.status === "will_promote") willPromote++;
      else if (r.status === "will_graduate") willGraduate++;
      else if (r.status === "no_target") noTarget++;
      else if (r.status === "already_enrolled") alreadyEnrolled++;
    }
    const skippedCount = preview.rows.filter(
      (r) => r.status === "will_promote" && skipped.has(r.studentId),
    ).length;
    return {
      willPromote,
      willGraduate,
      noTarget,
      alreadyEnrolled,
      skippedCount,
      finalPromote: willPromote - skippedCount,
    };
  }, [preview, skipped]);

  const canConfirm = counts.finalPromote > 0;

  return (
    <div className="flex flex-col gap-4">
      <Card padding="sm" className="bg-zinc-50">
        <p className="text-sm text-zinc-700">
          จาก{" "}
          <strong className="font-mono">
            {preview.source.year_be}
            {preview.source.semester > 0 ? ` ภาค ${preview.source.semester}` : ""}
          </strong>{" "}
          → ไป{" "}
          <strong className="font-mono">
            {preview.target.year_be}
            {preview.target.semester > 0 ? ` ภาค ${preview.target.semester}` : ""}
          </strong>{" "}
          · นักเรียนทั้งหมด <strong>{preview.rows.length}</strong> คน
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatusCard
          color="emerald"
          icon={CheckCircle2}
          label="จะนำเข้า"
          value={counts.finalPromote}
          subtle={
            counts.skippedCount > 0
              ? `(ข้าม ${counts.skippedCount} คน)`
              : undefined
          }
        />
        <StatusCard
          color="blue"
          icon={GraduationCap}
          label="จะจบ (ม.3)"
          value={counts.willGraduate}
        />
        <StatusCard
          color="amber"
          icon={AlertTriangle}
          label="ไม่พบห้องปลายทาง"
          value={counts.noTarget}
        />
        <StatusCard
          color="zinc"
          icon={Sparkles}
          label="อยู่ปลายทางแล้ว"
          value={counts.alreadyEnrolled}
        />
      </div>

      {preview.rows.length === 0 ? (
        <Card variant="dashed" padding={false} className="p-12 text-center">
          <p className="text-sm text-zinc-500">
            ไม่มีนักเรียนที่ลงทะเบียนในปีที่แล้ว
          </p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">นำเข้า</th>
                <th className="px-3 py-2 font-medium">รหัส</th>
                <th className="px-3 py-2 font-medium">ชื่อ-นามสกุล</th>
                <th className="px-3 py-2 font-medium">ปัจจุบัน</th>
                <th className="px-3 py-2 font-medium">→</th>
                <th className="px-3 py-2 font-medium">ปลายทาง / สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {preview.rows.map((r) => (
                <PromoteRowItem
                  key={r.studentId}
                  row={r}
                  skipped={skipped.has(r.studentId)}
                  onToggle={() => onToggle(r.studentId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm + actions */}
      <Card padding="md" className="bg-emerald-50/50">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-700">
            จะสร้าง enrollment ใหม่จำนวน{" "}
            <strong className="text-emerald-700">{counts.finalPromote}</strong>{" "}
            คน
            {preview.target.semester > 0 ? (
              <>
                {" "}ในปีการศึกษา{" "}
                <strong className="font-mono">
                  {preview.target.year_be}
                </strong>{" "}
                ภาคเรียนที่{" "}
                <strong className="font-mono">
                  {preview.target.semester}
                </strong>
              </>
            ) : (
              <>
                {" "}ในปีการศึกษา{" "}
                <strong className="font-mono">{preview.target.year_be}</strong>
              </>
            )}
          </p>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          ← ย้อนกลับ
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="size-4" aria-hidden />
          ยืนยันนำเข้า {counts.finalPromote} คน
        </button>
      </div>
    </div>
  );
}

function StatusCard({
  color,
  icon: Icon,
  label,
  value,
  subtle,
}: {
  color: "emerald" | "blue" | "amber" | "zinc";
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  subtle?: string;
}) {
  const palette = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    zinc: "border-zinc-200 bg-zinc-50 text-zinc-700",
  }[color];
  return (
    <div className={`rounded-md border ${palette} px-3 py-2`}>
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <p className="mt-1 font-mono text-2xl font-bold leading-none">{value}</p>
      {subtle && <p className="mt-0.5 text-[11px] opacity-75">{subtle}</p>}
    </div>
  );
}

function PromoteRowItem({
  row,
  skipped,
  onToggle,
}: {
  row: PromoteRow;
  skipped: boolean;
  onToggle: () => void;
}) {
  const canToggle = row.status === "will_promote";
  const rowClass = skipped
    ? "bg-zinc-50 text-zinc-400 line-through"
    : "hover:bg-zinc-50";

  return (
    <tr className={rowClass}>
      <td className="px-3 py-1.5">
        {canToggle ? (
          <input
            type="checkbox"
            checked={!skipped}
            onChange={onToggle}
            className="size-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500"
            aria-label={`นำเข้า ${row.displayName}`}
          />
        ) : (
          <span className="text-xs text-zinc-400">—</span>
        )}
      </td>
      <td className="px-3 py-1.5 font-mono text-xs text-zinc-600">
        {row.studentCode}
      </td>
      <td className="px-3 py-1.5 text-zinc-900">{row.displayName}</td>
      <td className="px-3 py-1.5 font-medium">{row.sourceClassroomLabel}</td>
      <td className="px-3 py-1.5 text-zinc-400">→</td>
      <td className="px-3 py-1.5">
        <StatusCell row={row} skipped={skipped} />
      </td>
    </tr>
  );
}

function StatusCell({ row, skipped }: { row: PromoteRow; skipped: boolean }) {
  if (row.status === "will_promote") {
    return skipped ? (
      <span className="text-xs text-amber-700">ข้าม / ไม่นำเข้า</span>
    ) : (
      <span className="font-medium text-emerald-700">
        {row.targetClassroomLabel}
      </span>
    );
  }
  if (row.status === "will_graduate") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
        <GraduationCap className="size-3.5" aria-hidden /> จบการศึกษา
      </span>
    );
  }
  if (row.status === "no_target") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <AlertTriangle className="size-3.5" aria-hidden />{" "}
        ไม่พบห้องปลายทาง
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
      <Sparkles className="size-3.5" aria-hidden /> อยู่ปลายทางแล้ว
    </span>
  );
}

// ============================================================
// Fullscreen overlay during commit
// ============================================================

function CommittingOverlay({ progress }: { progress: Progress }) {
  const pct =
    progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <Loader2
            className="size-6 animate-spin text-emerald-600"
            aria-hidden
          />
          <div>
            <h3 className="text-base font-semibold text-zinc-900">
              กำลังนำเข้านักเรียน
            </h3>
            <p className="text-xs text-zinc-500">
              กรุณาอย่าปิดหน้านี้ หรือเปลี่ยนเมนู
            </p>
          </div>
        </div>

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
            <span className="font-mono font-semibold text-zinc-900">{pct}%</span>
          </p>
        </div>

        <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          ✓ นำเข้าสำเร็จแล้ว: <strong>{progress.promoted}</strong> คน
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Step 4: result
// ============================================================

function ResultStep({
  result,
  preview,
  skippedCount,
  onStartOver,
}: {
  result: Result;
  preview: SuccessPreview;
  skippedCount: number;
  onStartOver: () => void;
}) {
  const willGraduate = preview.rows.filter(
    (r) => r.status === "will_graduate",
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <Card padding="md" className="bg-emerald-50">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-6 text-emerald-600" aria-hidden />
          <div>
            <p className="text-base font-semibold text-emerald-900">
              นำเข้าสำเร็จ {result.promoted} คน
            </p>
            <ul className="mt-1 text-sm text-emerald-800">
              <li>• ปีปัจจุบัน: <strong>{preview.target.year_be}</strong></li>
              {willGraduate > 0 && (
                <li>• ม.3 จบการศึกษา: <strong>{willGraduate}</strong> คน</li>
              )}
              {skippedCount > 0 && (
                <li>• ข้าม / ไม่นำเข้า: <strong>{skippedCount}</strong> คน</li>
              )}
              {result.failed.length > 0 && (
                <li className="text-red-700">
                  • ล้มเหลว: <strong>{result.failed.length}</strong> คน
                </li>
              )}
            </ul>
          </div>
        </div>
      </Card>

      {result.failed.length > 0 && (
        <div className="overflow-hidden rounded-md border border-red-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-red-200 bg-red-50 text-left text-xs uppercase tracking-wide text-red-700">
              <tr>
                <th className="px-3 py-2 font-medium">student_id</th>
                <th className="px-3 py-2 font-medium">เหตุผล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100">
              {result.failed.map((f) => (
                <tr key={f.studentId}>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-700">
                    {f.studentId}
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
          onClick={onStartOver}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          เริ่มใหม่
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
