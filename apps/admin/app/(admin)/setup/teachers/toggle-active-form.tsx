"use client";

import { Loader2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import Swal from "sweetalert2";
import { toggleTeacherActive } from "./actions";

function ToggleButton({
  currentlyActive,
  onPreSubmit,
}: {
  currentlyActive: boolean;
  onPreSubmit: (e: MouseEvent<HTMLButtonElement>) => Promise<void>;
}) {
  const { pending } = useFormStatus();
  const baseClass =
    "flex items-center gap-1 text-sm font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-60";
  const colorClass = currentlyActive
    ? "text-amber-700 hover:text-amber-900"
    : "text-green-700 hover:text-green-900";

  return (
    <button
      type="submit"
      onClick={onPreSubmit}
      disabled={pending}
      className={`${baseClass} ${colorClass}`}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {pending
        ? "กำลังบันทึก..."
        : currentlyActive
          ? "ปิดใช้งาน"
          : "เปิดใช้งาน"}
    </button>
  );
}

export function ToggleActiveForm({
  teacherId,
  currentlyActive,
  teacherName,
}: {
  teacherId: string;
  currentlyActive: boolean;
  teacherName: string;
}) {
  const handlePreSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Capture form ref BEFORE await — React 19 nulls `currentTarget` after.
    const form = e.currentTarget.form;

    const verb = currentlyActive ? "ปิดใช้งาน" : "เปิดใช้งาน";
    const note = currentlyActive
      ? "ครูจะเข้าระบบไม่ได้ · ข้อมูลในประวัติยังอยู่"
      : "ครูจะกลับมาเข้าระบบได้";

    const result = await Swal.fire({
      title: `${verb}บัญชีของ ${teacherName}?`,
      text: note,
      icon: currentlyActive ? "warning" : "question",
      showCancelButton: true,
      confirmButtonText: verb,
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: currentlyActive ? "#d97706" : "#0284c7",
      cancelButtonColor: "#71717a",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      form?.requestSubmit();
    }
  };

  return (
    <form action={toggleTeacherActive} className="inline">
      <input type="hidden" name="id" value={teacherId} />
      <input
        type="hidden"
        name="set_active"
        value={String(!currentlyActive)}
      />
      <ToggleButton
        currentlyActive={currentlyActive}
        onPreSubmit={handlePreSubmit}
      />
    </form>
  );
}
