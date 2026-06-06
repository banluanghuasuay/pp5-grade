"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, Input } from "@pp5/ui";
import { Loader2, School } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export type LoginFormSchool = {
  nameTh: string;
  affiliation: string | null;
  logoUrl: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  // Pink-700 = #be185d — "ชมพูเข้ม" per user spec. The `!` prefix is
  // required because Button's primary variant already sets bg-primary-*
  // utilities, and our `cn` joins (rather than merging) so both classes
  // would otherwise land in the output and lose to source-order luck.
  // `!text-white` is explicit per user spec ("ข้อความใช้สีขาว") to
  // prevent any future override from changing it.
  // Render the spinner + label in our OWN inline-flex span (instead of
  // Button's `pending` slot) so they stay on one line and the button height
  // doesn't change between states.
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full px-4 py-3 text-base !bg-pink-700 !text-white hover:!bg-pink-800 focus:!ring-pink-700"
    >
      <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
        {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </span>
    </Button>
  );
}

/**
 * Parent-app login card — same visual language as admin login (white +
 * blue accents + school identity block) but with the parent-specific
 * copy ("สำหรับนักเรียนและผู้ปกครอง") and larger touch targets in the
 * form (mobile-first audience).
 */
export function LoginForm({ school }: { school: LoginFormSchool | null }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-pink-100">
      {/* Pink accent strip — brand cue for the student/parent app
          (admin app uses primary-blue). User spec: ชมพูเข้ม. */}
      <div className="h-1.5 bg-gradient-to-r from-pink-500 via-pink-600 to-pink-700" />

      <div className="px-6 pt-8 pb-7 sm:px-8">
        {/* School identity (logo + name + affiliation). */}
        {school && (
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-pink-50 ring-2 ring-pink-200">
              {school.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={school.logoUrl}
                  alt="โลโก้โรงเรียน"
                  className="max-h-full max-w-full object-contain p-1"
                />
              ) : (
                <School className="h-9 w-9 text-pink-600" aria-hidden />
              )}
            </div>
            <h2 className="mt-3 text-base font-semibold text-zinc-900 sm:text-lg">
              {school.nameTh}
            </h2>
            {school.affiliation && (
              <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
                {school.affiliation}
              </p>
            )}
          </div>
        )}

        {school && (
          <div className="mb-6 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
        )}

        {/* System header */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-zinc-900 sm:text-2xl">
            ระบบรายงานผลการเรียน
          </h1>
          <p className="mt-1 text-sm text-zinc-500">สำหรับนักเรียนและผู้ปกครอง</p>
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
        </form>
      </div>
    </div>
  );
}
