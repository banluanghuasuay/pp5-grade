"use client";

import { Loader2, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import Swal from "sweetalert2";
import { deleteHoliday } from "./actions";

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
      title="ลบ"
      aria-label="ลบวันหยุด"
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

export function DeleteHolidayForm({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const handlePreSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const form = e.currentTarget.form;

    const result = await Swal.fire({
      title: `ลบ "${name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
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
    <form action={deleteHoliday} className="inline">
      <input type="hidden" name="id" value={id} />
      <DeleteButton onPreSubmit={handlePreSubmit} />
    </form>
  );
}
