"use client";

import { Loader2, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import Swal from "sweetalert2";
import { deletePlan } from "./actions";

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
      title="ลบแผน"
      aria-label="ลบแผน"
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

export function DeletePlanForm({
  planId,
  gradeLevelId,
  planName,
  subjectCount,
}: {
  planId: string;
  gradeLevelId: string;
  planName: string;
  subjectCount: number;
}) {
  const handlePreSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Capture form ref BEFORE await — React 19 nulls `currentTarget` after.
    const form = e.currentTarget.form;

    const note =
      subjectCount > 0
        ? `<p>มี <strong>${subjectCount} วิชา</strong> ผูกกับแผนนี้ — จะถูกตัดจากแผน (วิชาไม่ถูกลบ)</p>`
        : "<p>ไม่มีวิชาผูกกับแผนนี้</p>";

    const result = await Swal.fire({
      title: `ลบแผน "${planName}"?`,
      html: note,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบแผน",
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
    <form action={deletePlan} className="inline">
      <input type="hidden" name="id" value={planId} />
      <input type="hidden" name="grade_level_id" value={gradeLevelId} />
      <DeleteButton onPreSubmit={handlePreSubmit} />
    </form>
  );
}
