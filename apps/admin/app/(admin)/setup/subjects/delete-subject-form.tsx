"use client";

import { Loader2, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import Swal from "sweetalert2";
import { deleteSubject } from "./actions";

function DeleteButton({
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
      title="เอาออกจากแผน"
      aria-label="เอาออกจากแผน"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function DeleteSubjectForm({
  subjectId,
  subjectLabel,
  gradeLevelId,
  planId,
}: {
  subjectId: string;
  /** Display label, e.g. "ค13101 คณิตศาสตร์ 1" */
  subjectLabel: string;
  gradeLevelId: string;
  planId?: string;
}) {
  const handlePreSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Capture form ref BEFORE await — React 19 nulls `currentTarget` after.
    const form = e.currentTarget.form;

    const result = await Swal.fire({
      title: `ลบวิชา "${subjectLabel}" ออกจากแผนนี้?`,
      html: "<p>เอาวิชาออกจาก<strong>แผนนี้เท่านั้น</strong> · แผนอื่นไม่กระทบ</p><p class='mt-2 text-xs text-zinc-500'>ตัววิชายังคงอยู่ในระบบ — สามารถนำกลับมาใส่แผนได้อีก</p>",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "เอาออกจากแผน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#71717a",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      form?.requestSubmit();
    }
  };

  return (
    <form action={deleteSubject} className="inline">
      <input type="hidden" name="id" value={subjectId} />
      <input type="hidden" name="grade_level_id" value={gradeLevelId} />
      {planId && <input type="hidden" name="plan_id" value={planId} />}
      <DeleteButton onPreSubmit={handlePreSubmit} />
    </form>
  );
}
