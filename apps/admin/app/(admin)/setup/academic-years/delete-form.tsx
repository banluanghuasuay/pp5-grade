"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import Swal from "sweetalert2";
import { deleteAcademicYear } from "./actions";

/**
 * 2-tier delete confirm (mirrors the teacher delete-form pattern):
 *   - "ลบ"               → strict; FK errors bubble back as a friendly banner
 *   - "ลบและเคลียร์ข้อมูล" → flips hidden `force=true` so the server action
 *                             wipes subjects/classrooms/holidays first then
 *                             deletes the year. Requires a second confirm.
 * Use force only for test data — production years should be archived.
 */
export function DeleteForm({
  id,
  yearBe,
}: {
  id: string;
  yearBe: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const forceRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    const result = await Swal.fire({
      title: `ลบปีการศึกษา ${yearBe}?`,
      html: `
        <p style="margin: 0 0 0.5rem 0;"><strong>ลบถาวร · กู้คืนไม่ได้</strong></p>
        <p style="margin: 0 0 0.5rem 0; color: #52525b; font-size: 0.9em;">
          <strong>ลบ</strong> — สำหรับปีที่ยังไม่มีข้อมูล (ห้อง/วิชา/วันหยุด) ·
          ถ้ามีจะ block ให้
        </p>
        <p style="margin: 0; color: #dc2626; font-size: 0.85em;">
          <strong>ลบและเคลียร์ข้อมูล</strong> — เคลียร์ห้องเรียน · วิชา · วันหยุด ·
          คะแนน · เวลาเรียน · ประเมิน ทั้งหมดของปีนี้
          <em>สำหรับข้อมูลทดสอบเท่านั้น</em>
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
      if (forceRef.current) forceRef.current.value = "false";
      setPending(true);
      formRef.current?.requestSubmit();
    } else if (result.isDenied) {
      const second = await Swal.fire({
        title: `เคลียร์ข้อมูลของปี ${yearBe}?`,
        html: `
          <p style="margin: 0 0 0.5rem 0; color: #dc2626;">
            <strong>ห้องเรียน · วิชา · วันหยุด · คะแนน · เวลาเรียน · ประเมิน</strong>
            ของปีนี้จะถูก<strong>ลบทั้งหมด</strong>
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
        if (forceRef.current) forceRef.current.value = "true";
        setPending(true);
        formRef.current?.requestSubmit();
      }
    }
  };

  return (
    <form
      ref={formRef}
      action={deleteAcademicYear}
      className="inline"
    >
      <input type="hidden" name="id" value={id} />
      <input
        type="hidden"
        name="force"
        defaultValue="false"
        ref={forceRef}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-1 text-sm font-medium text-red-700 hover:text-red-900 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {pending ? "กำลังลบ..." : "ลบ"}
      </button>
    </form>
  );
}
