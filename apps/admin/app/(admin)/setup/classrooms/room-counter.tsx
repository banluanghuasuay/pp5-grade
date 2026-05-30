"use client";

import { Loader2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";
import Swal from "sweetalert2";
import { addClassroom, removeLastClassroom } from "./actions";

type Props = {
  gradeLevelId: string;
  count: number;
  /** Label of the room that will be removed (e.g. "ป.3" if count=1, "ป.3/2" if count=2). */
  removeLabel: string;
};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="เพิ่มห้อง"
      className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 bg-white text-base font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "+"}
    </button>
  );
}

function RemoveButton({
  count,
  onPreSubmit,
}: {
  count: number;
  onPreSubmit: (e: MouseEvent<HTMLButtonElement>) => Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      onClick={onPreSubmit}
      disabled={count === 0 || pending}
      aria-label="ลบห้องสุดท้าย"
      className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 bg-white text-base font-semibold text-zinc-700 shadow-sm hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-zinc-700"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "−"}
    </button>
  );
}

export function RoomCounter({ gradeLevelId, count, removeLabel }: Props) {
  const handleRemoveClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Capture form ref BEFORE await — React 19 nulls `currentTarget` after the
    // handler returns synchronously (await suspends but the SyntheticEvent is
    // already considered done from React's POV).
    const form = e.currentTarget.form;

    const result = await Swal.fire({
      title: `ลบห้อง ${removeLabel}?`,
      html: "<p>หากมีนักเรียนหรือข้อมูลในห้องนี้ จะถูกลบทั้งหมด (cascade)</p>",
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
    <div className="flex items-center justify-center gap-2">
      <form action={removeLastClassroom} className="inline">
        <input type="hidden" name="grade_level_id" value={gradeLevelId} />
        <RemoveButton count={count} onPreSubmit={handleRemoveClick} />
      </form>

      <span className="w-6 text-center font-mono text-base font-medium text-zinc-900">
        {count}
      </span>

      <form action={addClassroom} className="inline">
        <input type="hidden" name="grade_level_id" value={gradeLevelId} />
        <AddButton />
      </form>
    </div>
  );
}
