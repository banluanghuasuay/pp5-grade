"use client";

import { Copy, Loader2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import Swal from "sweetalert2";
import { copyPlan } from "./actions";

function CopyButton({
  onPreSubmit,
}: {
  onPreSubmit: (e: MouseEvent<HTMLButtonElement>) => Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      onClick={onPreSubmit}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {pending ? "กำลังคัดลอก..." : "คัดลอก"}
    </button>
  );
}

export type CopyableSource = {
  id: string;
  name: string;
  subjectCount: number;
};

export function CopyPlanButton({
  targetId,
  targetName,
  gradeShort,
  sources,
}: {
  /** The plan we're currently viewing — subjects get added INTO this plan. */
  targetId: string;
  targetName: string;
  /** e.g. "ป.1" — for context in the prompt. */
  gradeShort: string;
  /** Other plans in same grade that can serve as the source. */
  sources: CopyableSource[];
}) {
  const handlePreSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Capture form ref BEFORE await — React 19 nulls `currentTarget` after.
    const form = e.currentTarget.form;

    if (sources.length === 0) {
      await Swal.fire({
        title: "ไม่มีแผนต้นทางให้คัดลอก",
        html: `<p class="text-sm text-zinc-600">ระดับชั้น <strong>${gradeShort}</strong> มีแค่แผน "${targetName}" อย่างเดียว · ใช้ปุ่ม "+ สร้างแผนใหม่" เพื่อสร้างแผนอื่นก่อน</p>`,
        icon: "info",
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#0284c7",
      });
      return;
    }

    // Build dropdown options: source plan id → label "name (X วิชา)"
    const inputOptions: Record<string, string> = {};
    for (const s of sources) {
      inputOptions[s.id] = `${s.name} (${s.subjectCount} วิชา)`;
    }

    const result = await Swal.fire({
      title: "คัดลอกวิชาจากแผน",
      html: `<p class="text-sm text-zinc-600">เลือกแผนใน <strong>${gradeShort}</strong> ที่ต้องการดึงวิชามาใส่ใน "<strong>${targetName}</strong>" (ข้ามวิชาที่มีอยู่แล้ว)</p>`,
      input: "select",
      inputLabel: "แผนต้นทาง",
      inputPlaceholder: "เลือกแผนต้นทาง",
      inputOptions,
      showCancelButton: true,
      confirmButtonText: "คัดลอก",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#0284c7",
      cancelButtonColor: "#71717a",
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value) return "กรุณาเลือกแผนต้นทาง";
        return null;
      },
    });

    if (result.isConfirmed && result.value && form) {
      const input = form.querySelector(
        'input[name="source_id"]',
      ) as HTMLInputElement | null;
      if (input) input.value = String(result.value);
      form.requestSubmit();
    }
  };

  return (
    <form action={copyPlan} className="inline">
      <input type="hidden" name="source_id" value="" />
      <input type="hidden" name="target_id" value={targetId} />
      <CopyButton onPreSubmit={handlePreSubmit} />
    </form>
  );
}
