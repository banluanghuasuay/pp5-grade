"use client";

import { ArrowLeftRight, Loader2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import Swal from "sweetalert2";

/**
 * Inline "เปลี่ยนภาคเรียน" button for the row whose year is currently active.
 * Opens a SweetAlert2 radio dialog (1 / 2) and submits the parent <form>
 * with the chosen semester.
 */
export function ChangeSemesterButton({
  yearBe,
  current,
}: {
  yearBe: number;
  current: 1 | 2;
}) {
  const { pending } = useFormStatus();

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const form = e.currentTarget.form;
    if (!form) return;

    const result = await Swal.fire({
      title: `เปลี่ยนภาคเรียน — ปี ${yearBe}`,
      html: `<p class="text-sm text-zinc-600">ตอนนี้กำลังใช้ <strong>ภาคเรียนที่ ${current}</strong> · เลือกภาคเรียนใหม่</p>
<p class="mt-2 text-xs text-zinc-500">ระบบจะล็อคภาคเรียนเก่า · admin เปลี่ยนกลับได้ตลอด</p>`,
      input: "radio",
      inputOptions: {
        "1": "ภาคเรียนที่ 1",
        "2": "ภาคเรียนที่ 2",
      },
      inputValue: String(current),
      showCancelButton: true,
      confirmButtonText: "เปลี่ยน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#0284c7",
      cancelButtonColor: "#71717a",
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value) return "กรุณาเลือกภาคเรียน";
        if (Number(value) === current) return "กรุณาเลือกภาคเรียนใหม่ (ต้องไม่ใช่ภาคเรียนปัจจุบัน)";
        return null;
      },
    });

    if (
      result.isConfirmed &&
      (result.value === "1" || result.value === "2") &&
      Number(result.value) !== current
    ) {
      const input = form.querySelector(
        'input[name="current_semester"]',
      ) as HTMLInputElement | null;
      if (input) input.value = result.value;
      form.requestSubmit();
    }
  };

  return (
    <button
      type="submit"
      onClick={handleClick}
      disabled={pending}
      title="เปลี่ยนภาคเรียนที่กำลังใช้งาน"
      className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-2 py-1 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-50 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <ArrowLeftRight className="size-3.5" aria-hidden />
      )}
      {pending ? "กำลังเปลี่ยน..." : "เปลี่ยนภาคเรียน"}
    </button>
  );
}
