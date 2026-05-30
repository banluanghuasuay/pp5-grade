"use client";

import { CheckCircle2, History, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  commitCloneSubjects,
  getCloneSubjectsPreview,
  type CloneSubjectRow,
  type CloneSubjectsPreview,
} from "./actions";

const CATEGORY_LABEL: Record<string, string> = {
  core: "พื้นฐาน",
  additional: "เพิ่มเติม",
  activity: "กิจกรรม",
};

type Phase = "idle" | "loading" | "preview" | "committing" | "done";

type SuccessPreview = Extract<CloneSubjectsPreview, { ok: true }>;

export type SourcePlan = { id: string; name: string };

export function CloneSubjectsDialog({
  gradeLevelId,
  planId,
  gradeShort,
  planName,
  sourcePlans,
}: {
  gradeLevelId: string;
  planId: string;
  gradeShort: string;
  planName: string;
  /** All study_plans for this grade — admin picks which one to clone from. */
  sourcePlans: SourcePlan[];
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<SuccessPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; relinked: number }>(
    { inserted: 0, relinked: 0 },
  );
  /** Selected source plan id — defaults to same as target plan, so admin
   *  cloning into "ทั่วไป" sees "ทั่วไป" of last year by default. */
  const [sourcePlanId, setSourcePlanId] = useState<string>(planId);
  /** When true, dialog is already open and we're just re-fetching after a
   *  dropdown change — show an inline spinner overlay instead of closing. */
  const [isReloading, setIsReloading] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const reset = () => {
    setPhase("idle");
    setPreview(null);
    setSelected(new Set());
    setError(null);
    setResult({ inserted: 0, relinked: 0 });
    setSourcePlanId(planId);
    setIsReloading(false);
  };

  const loadPreview = (planForSource: string, isInitial: boolean) => {
    setError(null);
    if (isInitial) {
      setPhase("loading");
    } else {
      setIsReloading(true);
    }
    startTransition(async () => {
      const res = await getCloneSubjectsPreview(
        gradeLevelId,
        planId,
        planForSource,
      );
      if (!res.ok) {
        setError(res.error);
        if (isInitial) setPhase("idle");
        setIsReloading(false);
        return;
      }
      setPreview(res);
      // Pre-select rows that need action (new + relink). Skip in_plan.
      setSelected(
        new Set(
          res.subjects.filter((s) => s.status !== "in_plan").map((s) => s.id),
        ),
      );
      setPhase("preview");
      setIsReloading(false);
    });
  };

  const handleOpen = () => {
    setSourcePlanId(planId);
    loadPreview(planId, true);
  };

  const handleSourcePlanChange = (newSourcePlanId: string) => {
    setSourcePlanId(newSourcePlanId);
    loadPreview(newSourcePlanId, false);
  };

  const handleClose = () => {
    if (phase === "loading" || phase === "committing") return;
    reset();
  };

  const handleCommit = () => {
    if (!preview) return;
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setError(null);
    setPhase("committing");
    startTransition(async () => {
      const res = await commitCloneSubjects(gradeLevelId, planId, ids);
      if (!res.ok) {
        setError(res.error);
        setPhase("preview");
        return;
      }
      setResult({ inserted: res.inserted, relinked: res.relinked });
      setPhase("done");
      router.refresh();
    });
  };

  const selectedCount = selected.size;
  const newCount = preview?.subjects.filter((s) => s.status === "new").length ?? 0;
  const relinkCount =
    preview?.subjects.filter((s) => s.status === "relink").length ?? 0;
  const inPlanCount =
    preview?.subjects.filter((s) => s.status === "in_plan").length ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={phase === "loading"}
        title="ดูรายการวิชาที่จะนำเข้าก่อน · เลือกเฉพาะที่ต้องการ"
        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60"
      >
        {phase === "loading" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <History className="h-3.5 w-3.5" aria-hidden />
        )}
        นำเข้าจากปีที่แล้ว
      </button>

      {phase !== "idle" && phase !== "loading" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
            {/* ---------- PREVIEW ---------- */}
            {phase === "preview" && preview && (
              <>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">
                    นำเข้าวิชา {gradeShort} → แผน <strong>{planName}</strong>
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    จากปี <strong>{preview.sourceLabel}</strong>{" "}
                    ไปยังปี <strong>{preview.targetLabel}</strong>
                  </p>
                </div>

                {preview.subjects.length === 0 ? (
                  <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
                    ไม่พบวิชาในขอบเขตต้นทาง — ไม่มีอะไรให้นำเข้า
                  </div>
                ) : (
                  <>
                    {/* Quick stats */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      {newCount > 0 && (
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">
                          ✓ เพิ่มใหม่ {newCount} วิชา
                        </span>
                      )}
                      {relinkCount > 0 && (
                        <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-800">
                          ↻ ใส่กลับเข้าแผน {relinkCount} วิชา
                        </span>
                      )}
                      {inPlanCount > 0 && (
                        <span className="rounded-md bg-zinc-100 px-2 py-1 text-zinc-600">
                          • อยู่ในแผนแล้ว {inPlanCount} วิชา
                        </span>
                      )}
                    </div>

                    {/* Toolbar — source plan picker + select all / none */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      <label
                        htmlFor="clone-source-plan"
                        className="font-medium text-zinc-700"
                      >
                        แผนต้นทาง:
                      </label>
                      <select
                        id="clone-source-plan"
                        value={sourcePlanId}
                        onChange={(e) =>
                          handleSourcePlanChange(e.target.value)
                        }
                        disabled={isReloading}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-wait disabled:opacity-60"
                      >
                        {sourcePlans.map((p) => (
                          <option key={p.id} value={p.id}>
                            แผน {p.name}
                            {p.id === planId ? " (เดียวกัน)" : ""}
                          </option>
                        ))}
                      </select>
                      {isReloading && (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <Loader2 className="size-3 animate-spin" aria-hidden />
                          กำลังโหลด...
                        </span>
                      )}
                      <span className="text-zinc-300">·</span>
                      <button
                        type="button"
                        disabled={isReloading}
                        onClick={() =>
                          setSelected(
                            new Set(
                              preview.subjects
                                .filter((s) => s.status !== "in_plan")
                                .map((s) => s.id),
                            ),
                          )
                        }
                        className="font-medium text-blue-700 hover:underline disabled:opacity-60"
                      >
                        เลือกทั้งหมด (ที่ยังไม่อยู่ในแผน)
                      </button>
                      <span className="text-zinc-300">·</span>
                      <button
                        type="button"
                        disabled={isReloading}
                        onClick={() => setSelected(new Set())}
                        className="font-medium text-zinc-700 hover:underline disabled:opacity-60"
                      >
                        ล้างทั้งหมด
                      </button>
                    </div>

                    {/* Table */}
                    <div className="mt-3 max-h-[50vh] overflow-y-auto rounded-md border border-zinc-200">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                          <tr>
                            <th className="px-3 py-2 font-medium" />
                            <th className="px-3 py-2 font-medium">รหัส</th>
                            <th className="px-3 py-2 font-medium">ชื่อวิชา</th>
                            <th className="px-3 py-2 font-medium">ประเภท</th>
                            <th className="px-3 py-2 font-medium">หน่วยกิต/ชม.</th>
                            <th className="px-3 py-2 font-medium">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {preview.subjects.map((s) => (
                            <SubjectPreviewRow
                              key={s.id}
                              row={s}
                              checked={selected.has(s.id)}
                              onToggle={() => {
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(s.id)) next.delete(s.id);
                                  else next.add(s.id);
                                  return next;
                                });
                              }}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {error && (
                  <p
                    role="alert"
                    className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                  >
                    ❌ {error}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleCommit}
                    disabled={selectedCount === 0}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    ดำเนินการ {selectedCount} วิชา
                  </button>
                </div>
              </>
            )}

            {/* ---------- COMMITTING ---------- */}
            {phase === "committing" && (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="size-5 animate-spin text-emerald-600" />
                <span className="text-sm text-zinc-700">
                  กำลังนำเข้าวิชา...
                </span>
              </div>
            )}

            {/* ---------- DONE ---------- */}
            {phase === "done" && (
              <>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="size-6 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">
                      นำเข้าสำเร็จ
                    </h3>
                    <ul className="mt-1 text-sm text-zinc-600 space-y-0.5">
                      {result.inserted > 0 && (
                        <li>
                          ✓ เพิ่มวิชาใหม่ <strong>{result.inserted}</strong>{" "}
                          รายการ
                        </li>
                      )}
                      {result.relinked > 0 && (
                        <li>
                          ↻ ใส่กลับเข้าแผน <strong>{result.relinked}</strong>{" "}
                          รายการ
                        </li>
                      )}
                      {result.inserted === 0 && result.relinked === 0 && (
                        <li>(ไม่มีการเปลี่ยนแปลง)</li>
                      )}
                    </ul>
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
                  >
                    ปิด
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Inline error when dialog never opened (e.g. preview failed) */}
      {phase === "idle" && error && (
        <span
          role="alert"
          className="ml-2 text-xs text-red-700"
        >
          ❌ {error}
        </span>
      )}
    </>
  );
}

function SubjectPreviewRow({
  row,
  checked,
  onToggle,
}: {
  row: CloneSubjectRow;
  checked: boolean;
  onToggle: () => void;
}) {
  const isInPlan = row.status === "in_plan";
  const canToggle = !isInPlan;
  const rowClass = isInPlan
    ? "bg-zinc-50 text-zinc-400"
    : checked
      ? row.status === "relink"
        ? "bg-blue-50/40"
        : "bg-emerald-50/30"
      : "";

  return (
    <tr className={rowClass}>
      <td className="px-3 py-1.5">
        <input
          type="checkbox"
          checked={canToggle && checked}
          disabled={!canToggle}
          onChange={onToggle}
          className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
          aria-label={`นำเข้า ${row.code}`}
        />
      </td>
      <td className="px-3 py-1.5 font-mono text-xs text-zinc-700">
        {row.code}
      </td>
      <td className="px-3 py-1.5 text-zinc-900">{row.name_th}</td>
      <td className="px-3 py-1.5 text-xs text-zinc-600">
        {CATEGORY_LABEL[row.category] ?? row.category}
      </td>
      <td className="px-3 py-1.5 font-mono text-xs text-zinc-700">
        {row.category === "activity"
          ? row.hours_per_year != null
            ? `${row.hours_per_year} ชม./ปี`
            : "—"
          : row.credit_hours != null
            ? String(row.credit_hours)
            : "—"}
      </td>
      <td className="px-3 py-1.5">
        <StatusBadge status={row.status} />
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: CloneSubjectRow["status"] }) {
  if (status === "new") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
        ✓ เพิ่มใหม่
      </span>
    );
  }
  if (status === "relink") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
        ↻ ใส่กลับเข้าแผน
      </span>
    );
  }
  // in_plan
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500">
      <Sparkles className="size-3" aria-hidden /> อยู่ในแผนแล้ว
    </span>
  );
}
