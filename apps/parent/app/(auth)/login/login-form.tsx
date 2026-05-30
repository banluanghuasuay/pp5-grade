"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Card, Field, Input } from "@pp5/ui";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" pending={pending} className="w-full px-4 py-3 text-base">
      {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <Card className="rounded-lg p-6 shadow-sm sm:p-8" padding={false}>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">ระบบ ปพ.5</h1>
        <p className="mt-1 text-sm text-zinc-600">
          สำหรับผู้ปกครอง
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <Field label="รหัสนักเรียน">
          <Input
            id="studentCode"
            name="studentCode"
            inputMode="numeric"
            autoComplete="username"
            required
            autoFocus
            placeholder="เช่น 66012345"
            className="py-2.5 text-base"
          />
        </Field>

        <Field label="รหัสผ่าน">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
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

        <SubmitButton />

        <p className="pt-2 text-center text-xs text-zinc-500">
          1 รหัสนักเรียน = 1 บัญชี · ครอบครัวใช้ร่วมกันได้
        </p>
      </form>
    </Card>
  );
}
