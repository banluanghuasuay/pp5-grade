"use client";

import { Button, Field, Input, Textarea } from "@pp5/ui";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { PlanFormState } from "./actions";

const initialState: PlanFormState = { error: null };

type Action = (
  prev: PlanFormState,
  formData: FormData,
) => Promise<PlanFormState>;

type DefaultValues = {
  id?: string;
  name?: string;
  description?: string | null;
  is_default?: boolean | null;
};

type Props = {
  action: Action;
  /** Locked — every plan belongs to one grade and that can't change. */
  gradeLevelId: string;
  gradeLabel: string; // e.g. "ป.1 (ประถมศึกษาปีที่ 1)"
  /** Cancel link returns here. */
  cancelHref: string;
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

export function PlanForm({
  action,
  gradeLevelId,
  gradeLabel,
  cancelHref,
  defaultValues,
  submitLabel = "บันทึก",
}: Props) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}
      <input type="hidden" name="grade_level_id" value={gradeLevelId} />

      <Field label="ระดับชั้น" hint="ผูกกับชั้นนี้แล้ว เปลี่ยนไม่ได้">
        <Input value={gradeLabel} readOnly disabled />
      </Field>

      <Field
        label="ชื่อแผน"
        required
        error={state.fieldErrors?.name}
        hint={`เช่น "ทั่วไป", "EP", "วิทย์-คณิต"`}
      >
        <Input
          name="name"
          required
          maxLength={100}
          defaultValue={defaultValues?.name ?? ""}
          placeholder="EP"
          invalid={!!state.fieldErrors?.name}
          autoFocus={!defaultValues?.id}
        />
      </Field>

      <Field label="คำอธิบาย" hint="optional · ช่วยจดจำว่าแผนนี้คืออะไร">
        <Textarea
          name="description"
          rows={2}
          defaultValue={defaultValues?.description ?? ""}
          placeholder="optional"
        />
      </Field>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="is_default"
          defaultChecked={defaultValues?.is_default ?? false}
          className="mt-0.5 rounded border-zinc-300"
        />
        <div>
          <span className="font-medium text-zinc-900">
            แผน default ของระดับชั้นนี้
          </span>
          <p className="mt-0.5 text-xs text-zinc-500">
            ห้องเปิดใหม่จะผูกกับแผนนี้อัตโนมัติ · มีได้ 1 แผนต่อระดับชั้น
          </p>
        </div>
      </label>

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
        <Link
          href={cancelHref}
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
