"use client";

import { Loader2, RefreshCw } from "lucide-react";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import Swal from "sweetalert2";
import { setClassroomPlan } from "./actions";

export type PlanOption = { id: string; label: string };

function ChangeButton({
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
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      {pending ? "กำลังเปลี่ยน..." : "เปลี่ยนแผนการเรียน"}
    </button>
  );
}

export function ChangePlanButton({
  classroomId,
  currentPlanId,
  currentPlanName,
  availablePlans,
  gradeId,
  roomLabel,
}: {
  classroomId: string;
  /** Empty string if no plan assigned yet. */
  currentPlanId: string;
  /** Display name of the current plan (or "—" if none). */
  currentPlanName: string;
  /** All plans in this grade — current one is filtered out inside. */
  availablePlans: PlanOption[];
  gradeId: string;
  /** Room label for dialog title — e.g. "ป.5/1". */
  roomLabel: string;
}) {
  const handlePreSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Capture form ref BEFORE await — React 19 nulls `currentTarget` after.
    const form = e.currentTarget.form;

    // Exclude the current plan from options — user must pick something different
    const otherPlans = availablePlans.filter((p) => p.id !== currentPlanId);

    if (otherPlans.length === 0) {
      await Swal.fire({
        title: "ไม่มีแผนการเรียนอื่นให้เลือก",
        html: `<p class="text-sm text-zinc-600">ระดับชั้นนี้มีแค่ "<strong>${currentPlanName}</strong>" อย่างเดียว · ใช้หน้า "ข้อมูลรายวิชา" เพื่อสร้างแผนการเรียนใหม่</p>`,
        icon: "info",
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#0284c7",
      });
      return;
    }

    const inputOptions: Record<string, string> = {};
    for (const p of otherPlans) inputOptions[p.id] = p.label;

    const result = await Swal.fire({
      title: `เปลี่ยนแผนการเรียนของห้อง ${roomLabel}`,
      html: `<p class="text-sm text-zinc-600">ปัจจุบันห้องนี้ใช้แผนการเรียน <strong>${currentPlanName}</strong></p>
<p class="mt-3 text-xs text-amber-700">⚠️ ครูที่บันทึกไว้ในวิชาเดิมจะถูกเก็บในระบบ — แต่ถ้าวิชาในแผนการเรียนใหม่ไม่ตรงกัน คุณต้องกำหนดครูใหม่</p>`,
      input: "select",
      inputLabel: "เลือกแผนการเรียนใหม่",
      inputPlaceholder: "เลือกแผนการเรียน",
      inputOptions,
      showCancelButton: true,
      confirmButtonText: "เปลี่ยนแผนการเรียน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d97706",
      cancelButtonColor: "#71717a",
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value) return "กรุณาเลือกแผนการเรียน";
        return null;
      },
    });

    if (result.isConfirmed && result.value && form) {
      const input = form.querySelector(
        'input[name="plan_id"]',
      ) as HTMLInputElement | null;
      if (input) input.value = String(result.value);
      form.requestSubmit();
    }
  };

  return (
    <form action={setClassroomPlan} className="inline">
      <input type="hidden" name="classroom_id" value={classroomId} />
      <input type="hidden" name="grade_id" value={gradeId} />
      <input type="hidden" name="semester" value="1" />
      <input type="hidden" name="plan_id" value="" />
      <ChangeButton onPreSubmit={handlePreSubmit} />
    </form>
  );
}
