"use client";

import { Button, Field, Input } from "@pp5/ui";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changePasswordAction, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      pending={pending}
      className="w-full px-4 py-3 text-base !bg-pink-700 !text-white hover:!bg-pink-800 focus:!ring-pink-700"
    >
      {pending ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="รหัสผ่านใหม่" hint="อย่างน้อย 6 ตัว">
        <Input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••"
          className="py-2.5 text-base"
        />
      </Field>

      <Field label="ยืนยันรหัสผ่านใหม่">
        <Input
          name="confirm"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••"
          className="py-2.5 text-base"
        />
      </Field>

      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          ✓ เปลี่ยนรหัสผ่านเรียบร้อยแล้ว — ครั้งต่อไปเข้าระบบด้วยรหัสใหม่
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
