"use client";

import { Button } from "@pp5/ui";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import Swal from "sweetalert2";

/**
 * "ตั้งเป็นปัจจุบัน" toggle in a year-row.
 *
 * Phase 2.6 — opens a SweetAlert2 dialog asking which semester to set as
 * the active working term, then submits the parent <form> with the hidden
 * `current_semester` input populated from the user's choice.
 */
export function SetCurrentButton({ yearBe }: { yearBe: number }) {
  const { pending } = useFormStatus();

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Capture form ref BEFORE await — React 19 nulls `currentTarget` after.
    const form = e.currentTarget.form;
    if (!form) return;

    const result = await Swal.fire({
      title: `ตั้งปีการศึกษา ${yearBe} เป็นปีปัจจุบัน`,
      html: `<p class="text-sm text-zinc-600">เลือกว่าตอนนี้กำลังทำงานในภาคเรียนไหน</p>
<p class="mt-2 text-xs text-zinc-500">ระบบจะล็อคภาคเรียนอื่นโดยอัตโนมัติ — admin เปลี่ยนภายหลังได้</p>`,
      input: "radio",
      inputOptions: {
        "1": "ภาคเรียนที่ 1",
        "2": "ภาคเรียนที่ 2",
      },
      inputValue: "1",
      showCancelButton: true,
      confirmButtonText: "ตั้งเป็นปัจจุบัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#0284c7",
      cancelButtonColor: "#71717a",
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value) return "กรุณาเลือกภาคเรียน";
        return null;
      },
    });

    if (result.isConfirmed && (result.value === "1" || result.value === "2")) {
      const input = form.querySelector(
        'input[name="current_semester"]',
      ) as HTMLInputElement | null;
      if (input) input.value = result.value;
      form.requestSubmit();
    }
  };

  return (
    <Button
      type="submit"
      variant="secondary"
      size="sm"
      pending={pending}
      onClick={handleClick}
    >
      {pending ? "กำลังตั้ง..." : "ตั้งเป็นปัจจุบัน"}
    </Button>
  );
}
