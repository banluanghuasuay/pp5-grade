"use client";

import { Button, Field, Input } from "@pp5/ui";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { HolidayFormState } from "./actions";

const initialState: HolidayFormState = { error: null };

type Action = (
  prev: HolidayFormState,
  formData: FormData,
) => Promise<HolidayFormState>;

type DefaultValues = {
  id?: string;
  date?: string; // YYYY-MM-DD
  name?: string;
};

type Props = {
  action: Action;
  defaultValues?: DefaultValues;
  /** "Inline" layout for the main page (date + name + submit on one row). */
  variant?: "inline" | "block";
  cancelHref?: string;
  submitLabel?: string;
};

function SubmitButton({ label, inline }: { label: string; inline?: boolean }) {
  const { pending } = useFormStatus();
  if (inline) {
    return (
      <button
        type="submit"
        disabled={pending}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "กำลังบันทึก..." : `+ ${label}`}
      </button>
    );
  }
  return (
    <Button type="submit" pending={pending}>
      {pending ? "กำลังบันทึก..." : label}
    </Button>
  );
}

export function HolidayForm({
  action,
  defaultValues,
  variant = "block",
  cancelHref,
  submitLabel = "บันทึก",
}: Props) {
  const [state, formAction] = useActionState(action, initialState);

  if (variant === "inline") {
    return (
      <form action={formAction} className="space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          <Field
            label="วันที่"
            required
            error={state.fieldErrors?.date}
            className="w-44"
          >
            <Input
              type="date"
              name="date"
              required
              defaultValue={defaultValues?.date ?? ""}
              invalid={!!state.fieldErrors?.date}
            />
          </Field>
          <Field
            label="ชื่อวันหยุด"
            required
            error={state.fieldErrors?.name}
            className="flex-1"
          >
            <Input
              name="name"
              required
              maxLength={255}
              defaultValue={defaultValues?.name ?? ""}
              placeholder="เช่น วันสถาปนาโรงเรียน"
              invalid={!!state.fieldErrors?.name}
            />
          </Field>
          <SubmitButton label={submitLabel} inline />
        </div>
        {state.error && (
          <div
            role="alert"
            className="rounded-md border-2 border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-900"
          >
            ⚠️ {state.error}
          </div>
        )}
      </form>
    );
  }

  // Block variant — used in /[id] edit page
  return (
    <form action={formAction} className="space-y-6">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          label="วันที่"
          required
          error={state.fieldErrors?.date}
        >
          <Input
            type="date"
            name="date"
            required
            defaultValue={defaultValues?.date ?? ""}
            invalid={!!state.fieldErrors?.date}
          />
        </Field>
        <Field
          label="ชื่อวันหยุด"
          required
          error={state.fieldErrors?.name}
          className="sm:col-span-2"
        >
          <Input
            name="name"
            required
            maxLength={255}
            defaultValue={defaultValues?.name ?? ""}
            placeholder="ชื่อวันหยุด"
            invalid={!!state.fieldErrors?.name}
          />
        </Field>
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-md border-2 border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-900"
        >
          ⚠️ {state.error}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-zinc-200 pt-4">
        <SubmitButton label={submitLabel} />
        {cancelHref && (
          <Link
            href={cancelHref}
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            ยกเลิก
          </Link>
        )}
      </div>
    </form>
  );
}
