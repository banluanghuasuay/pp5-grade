"use client";

import { Loader2, Sparkles } from "lucide-react";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import Swal from "sweetalert2";
import { seedThaiHolidays } from "./actions";

function SeedButton({
  yearBe,
  onPreSubmit,
}: {
  yearBe: number;
  onPreSubmit: (e: MouseEvent<HTMLButtonElement>) => Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      onClick={onPreSubmit}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {pending ? "กำลังดึง..." : `ดึงวันหยุดมาตรฐาน (ปี ${yearBe})`}
    </button>
  );
}

export function SeedThaiHolidaysButton({ yearBe }: { yearBe: number }) {
  const handlePreSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const form = e.currentTarget.form;

    const result = await Swal.fire({
      title: `ดึงวันหยุดราชการไทย (ปี ${yearBe})`,
      html: `<p class="text-sm text-zinc-600">ระบบจะเพิ่มวันหยุดราชการที่อยู่ในช่วงปีการศึกษา ${yearBe} (16 พ.ค. ${yearBe} - 15 พ.ค. ${yearBe + 1})</p><p class="mt-2 text-xs text-zinc-500">วันที่มีอยู่แล้วในระบบจะไม่ถูกเพิ่มซ้ำ</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ดึงเลย",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#0284c7",
      cancelButtonColor: "#71717a",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      form?.requestSubmit();
    }
  };

  return (
    <form action={seedThaiHolidays} className="inline">
      <SeedButton yearBe={yearBe} onPreSubmit={handlePreSubmit} />
    </form>
  );
}
