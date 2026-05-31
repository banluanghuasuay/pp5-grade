"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRef, type MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import Swal from "sweetalert2";
import { deleteTeacher } from "./actions";

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
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
      title="ลบครู"
      aria-label="ลบครู"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}

/**
 * Trash-icon button that wipes a teacher entirely (3-table cleanup —
 * see deleteTeacher action for safety preconditions). The confirm
 * dialog uses SweetAlert with TWO confirm options:
 *   - ลบ (strict)      → blocks if teacher has any references
 *   - ลบและเคลียร์ข้อมูล → NULL the attribution FKs + cascade everything
 *                          (subject_offerings → scores). For test data.
 * A hidden `force` field is flipped to "true" before the second
 * submission so the server action knows which branch to take.
 */
export function DeleteTeacherForm({
  teacherId,
  teacherName,
}: {
  teacherId: string;
  teacherName: string;
}) {
  const forceInputRef = useRef<HTMLInputElement>(null);

  const handlePreSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Capture form ref BEFORE await — React 19 nulls `currentTarget`
    // after the await resolves (same gotcha as other SweetAlert
    // pre-submit forms).
    const form = e.currentTarget.form;

    const result = await Swal.fire({
      title: `ลบ ${teacherName}?`,
      html: `
        <p style="margin: 0 0 0.5rem 0;"><strong>ลบถาวร · กู้คืนไม่ได้</strong></p>
        <p style="margin: 0 0 0.5rem 0; color: #52525b; font-size: 0.9em;">
          <strong>ลบ</strong> — ใช้สำหรับครูที่ยังไม่มีข้อมูลอะไรในระบบ ·
          ถ้ามีบันทึกอยู่ จะ block ให้
        </p>
        <p style="margin: 0; color: #dc2626; font-size: 0.85em;">
          <strong>ลบและเคลียร์ข้อมูล</strong> — เคลียร์บันทึกของครูคนนี้ทั้งหมด
          (คะแนน · เวลาเรียน · ประเมิน · ประกาศ) <em>สำหรับข้อมูลทดสอบเท่านั้น</em>
        </p>
      `,
      icon: "warning",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "ลบ",
      denyButtonText: "ลบและเคลียร์ข้อมูล",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc2626",
      denyButtonColor: "#9f1239",
      cancelButtonColor: "#71717a",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      // Strict delete
      if (forceInputRef.current) forceInputRef.current.value = "false";
      form?.requestSubmit();
    } else if (result.isDenied) {
      // Force delete — extra second confirm because this is destructive
      const second = await Swal.fire({
        title: `เคลียร์ข้อมูลของ ${teacherName}?`,
        html: `
          <p style="margin: 0 0 0.5rem 0; color: #dc2626;">
            <strong>คะแนน · เวลาเรียน · ประเมิน · ประกาศ</strong>
            ของครูคนนี้จะถูก<strong>ลบทิ้ง</strong> หรือเคลียร์
          </p>
          <p style="margin: 0; color: #71717a; font-size: 0.9em;">
            กู้คืนไม่ได้ — ใช้สำหรับข้อมูลทดสอบเท่านั้น
          </p>
        `,
        icon: "error",
        showCancelButton: true,
        confirmButtonText: "ยืนยัน ลบทุกอย่าง",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#9f1239",
        cancelButtonColor: "#71717a",
        reverseButtons: true,
      });
      if (second.isConfirmed) {
        if (forceInputRef.current) forceInputRef.current.value = "true";
        form?.requestSubmit();
      }
    }
  };

  return (
    <form action={deleteTeacher} className="inline">
      <input type="hidden" name="id" value={teacherId} />
      <input
        type="hidden"
        name="force"
        defaultValue="false"
        ref={forceInputRef}
      />
      <DeleteButton onPreSubmit={handlePreSubmit} />
    </form>
  );
}
