"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input, Select } from "@pp5/ui";
import type { AcademicYearFormState } from "./actions";

const initialState: AcademicYearFormState = { error: null };

type Action = (
  prev: AcademicYearFormState,
  formData: FormData,
) => Promise<AcademicYearFormState>;

type DefaultValues = {
  id?: string;
  year_be?: number;
  is_current?: boolean | null;
  current_semester?: number | null;
  start_date?: string | null;
  end_date?: string | null;
};

type Props = {
  action: Action;
  defaultValues?: DefaultValues;
  submitLabel?: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" pending={pending}>
      {pending ? "กำลังบันทึก..." : label}
    </Button>
  );
}

export function YearForm({
  action,
  defaultValues,
  submitLabel = "บันทึก",
}: Props) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      <Field
        label="ปีการศึกษา (พ.ศ.)"
        required
        error={state.fieldErrors?.year_be}
      >
        <Input
          id="year_be"
          name="year_be"
          type="number"
          inputMode="numeric"
          required
          min={2550}
          max={2650}
          placeholder="เช่น 2569"
          autoFocus
          defaultValue={defaultValues?.year_be ?? ""}
          invalid={!!state.fieldErrors?.year_be}
          className="max-w-xs"
        />
      </Field>

      <div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="is_current"
            defaultChecked={defaultValues?.is_current ?? false}
            className="mt-0.5 rounded border-zinc-300"
          />
          <span>
            <span className="font-medium text-zinc-900">ตั้งเป็นปีปัจจุบัน</span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              ถ้ามีปีปัจจุบันอยู่แล้ว ระบบจะยกเลิกอันเก่าให้อัตโนมัติ
            </span>
          </span>
        </label>
      </div>

      <Field label="ภาคเรียนปัจจุบัน" required>
        <Select
          name="current_semester"
          defaultValue={String(defaultValues?.current_semester ?? 1)}
          className="max-w-xs"
        >
          <option value="1">ภาคเรียนที่ 1</option>
          <option value="2">ภาคเรียนที่ 2</option>
        </Select>
        <p className="mt-1 text-xs text-zinc-500">
          ระบบจะล็อคภาคเรียนที่ไม่ใช่ปัจจุบัน — admin เปลี่ยนภาคปัจจุบันเพื่อปลดล็อค
        </p>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="วันเริ่มภาคเรียนที่ 1">
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={defaultValues?.start_date ?? ""}
          />
        </Field>
        <Field
          label="วันเริ่มภาคเรียนที่ 2"
          error={state.fieldErrors?.end_date}
        >
          <Input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={defaultValues?.end_date ?? ""}
            invalid={!!state.fieldErrors?.end_date}
          />
        </Field>
      </div>
      <p className="text-xs text-zinc-500">
        ใช้คำนวณ "หัวตาราง สัปดาห์ที่ N" ในหน้าบันทึกเวลาเรียนรายวิชา · ถ้าไม่กรอก
        ระบบจะใช้ค่ามาตรฐาน (ภาค 1 = 16 พ.ค. · ภาค 2 = 1 พ.ย.)
      </p>

      {state.error && !state.fieldErrors && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {state.error}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-zinc-200 pt-4">
        <SubmitButton label={submitLabel} />
        <Link
          href="/setup/academic-years"
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
