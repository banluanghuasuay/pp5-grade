"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input, Select } from "@pp5/ui";
import type { TeacherFormState } from "./actions";

const initialState: TeacherFormState = { error: null };

type Action = (
  prev: TeacherFormState,
  formData: FormData,
) => Promise<TeacherFormState>;

type DefaultValues = {
  id?: string;
  username?: string;
  full_name?: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  /** When true the user is created/saved with role='admin' and their
   *  auth email lives at @admin.pp5.local — they can log in to the
   *  admin app. The teacher row still exists either way. */
  is_admin?: boolean | null;
  position?: string | null;
  department?: string | null;
  is_department_head?: boolean | null;
};

type Props = {
  action: Action;
  defaultValues?: DefaultValues;
  /** Show password field — true for create, false for edit (password handled separately). */
  showPassword?: boolean;
  /** When editing, username can't be changed (it's the auth identity). */
  lockUsername?: boolean;
  submitLabel?: string;
  /** Options for the กลุ่มสาระ dropdown (sourced from `learning_areas` table). */
  departments: string[];
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" pending={pending}>
      {pending ? "กำลังบันทึก..." : label}
    </Button>
  );
}

const TITLE_OPTIONS = ["นาย", "นาง", "นางสาว", "ดร."];

/** Fixed list of teacher positions. Drives the sort order on the list
 *  page (ผอ. → รองผอ. → ครู → others) per user spec 2026-05-22. */
const POSITION_OPTIONS = [
  "ผู้อำนวยการ",
  "รองผู้อำนวยการ",
  "ครูผู้สอน",
];

export function TeacherForm({
  action,
  defaultValues,
  showPassword = true,
  lockUsername = false,
  submitLabel = "บันทึก",
  departments,
}: Props) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-8">
      {defaultValues?.id && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-zinc-900">
          ข้อมูลบัญชี
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="ชื่อผู้ใช้"
            required
            error={state.fieldErrors?.username}
            hint={lockUsername ? "ไม่สามารถแก้ได้หลังสร้าง" : "a-z, 0-9, _ เท่านั้น"}
          >
            <Input
              name="username"
              required
              autoComplete="off"
              defaultValue={defaultValues?.username ?? ""}
              readOnly={lockUsername}
              autoFocus={!lockUsername}
              placeholder="เช่น somchai01"
              invalid={!!state.fieldErrors?.username}
            />
          </Field>

          {showPassword && (
            <Field
              label="รหัสผ่าน"
              required
              error={state.fieldErrors?.password}
              hint="อย่างน้อย 6 ตัว · admin บอกให้ครูได้"
            >
              <Input
                name="password"
                required
                autoComplete="new-password"
                minLength={6}
                placeholder="••••••"
                invalid={!!state.fieldErrors?.password}
              />
            </Field>
          )}
        </div>

        <label className="flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            name="is_admin"
            defaultChecked={defaultValues?.is_admin ?? false}
            className="mt-0.5 rounded border-zinc-300"
          />
          <span>
            <span className="font-medium text-zinc-900">
              ให้สิทธิ์เป็นแอดมิน
            </span>
            <span className="ml-2 text-xs font-normal text-zinc-600">
              login ผ่าน admin app · email ขึ้นต้นด้วย @admin.pp5.local · แก้ภายหลังได้
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-zinc-900">
          ข้อมูลส่วนตัว
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="คำนำหน้า">
            <Select name="title" defaultValue={defaultValues?.title ?? ""}>
              <option value="">—</option>
              {TITLE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="ชื่อ-นามสกุล"
            required
            error={state.fieldErrors?.full_name}
            className="sm:col-span-3"
          >
            <Input
              name="full_name"
              required
              defaultValue={defaultValues?.full_name ?? ""}
              placeholder="เช่น สมชาย ใจดี"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="อีเมล" error={state.fieldErrors?.email}>
            <Input
              name="email"
              type="email"
              defaultValue={defaultValues?.email ?? ""}
              placeholder="optional"
            />
          </Field>
          <Field label="เบอร์โทร">
            <Input
              name="phone"
              type="tel"
              defaultValue={defaultValues?.phone ?? ""}
              placeholder="optional"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-zinc-900">
          ข้อมูลครู
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ตำแหน่ง">
            <Select
              name="position"
              defaultValue={defaultValues?.position ?? ""}
            >
              <option value="">— เลือก —</option>
              {/* Preserve any non-standard legacy value (e.g. "ครู คศ.2"
                  from before the dropdown migration) so it shows
                  correctly until admin re-selects from the 3 options. */}
              {defaultValues?.position &&
                !POSITION_OPTIONS.includes(defaultValues.position) && (
                  <option value={defaultValues.position}>
                    {defaultValues.position} (ค่าเดิม)
                  </option>
                )}
              {POSITION_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="กลุ่มสาระ">
            <Select
              name="department"
              defaultValue={defaultValues?.department ?? ""}
            >
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="is_department_head"
            defaultChecked={defaultValues?.is_department_head ?? false}
            className="mt-0.5 rounded border-zinc-300"
          />
          <span className="font-medium text-zinc-900">หัวหน้ากลุ่มสาระ</span>
        </label>
      </fieldset>

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
          href="/setup/teachers"
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
