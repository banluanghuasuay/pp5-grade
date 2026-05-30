"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Card, Field, Input } from "@pp5/ui";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" pending={pending} className="w-full">
      {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <Card padding="lg" className="rounded-lg shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">ระบบ ปพ.5</h1>
        <p className="mt-1 text-sm text-zinc-600">
          สำหรับผู้ดูแลและครู
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <Field label="ชื่อผู้ใช้">
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            autoFocus
            placeholder="เช่น admin หรือ somchai01"
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
      </form>
    </Card>
  );
}
