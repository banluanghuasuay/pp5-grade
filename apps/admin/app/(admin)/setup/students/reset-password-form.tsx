"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input } from "@pp5/ui";
import { resetStudentPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      pending={pending}
      className="bg-amber-600 text-white shadow-sm hover:bg-amber-700 focus:ring-amber-600"
    >
      {pending ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
    </Button>
  );
}

export function ResetPasswordForm({ studentId }: { studentId: string }) {
  const [state, formAction] = useActionState(
    resetStudentPassword,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-4"
      key={state.success ? "after-success" : "form"}
    >
      <input type="hidden" name="id" value={studentId} />

      <Field
        label="รหัสผ่านใหม่"
        required
        error={state.fieldErrors?.password}
        hint="แสดงเป็น plain text เพื่อ admin บอกผู้ปกครองตอนพบกัน"
      >
        <Input
          id="reset_password"
          name="password"
          autoComplete="new-password"
          minLength={6}
          required
          placeholder="อย่างน้อย 6 ตัว"
          invalid={!!state.fieldErrors?.password}
          className="max-w-xs focus:border-amber-600 focus:ring-amber-600"
        />
      </Field>

      {state.error && !state.fieldErrors && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {state.error}
        </div>
      )}

      {state.success && (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900"
        >
          ✅ เปลี่ยนรหัสผ่านสำเร็จ
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
