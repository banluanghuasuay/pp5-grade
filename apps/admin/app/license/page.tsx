"use client";

import { useActionState } from "react";
import { saveLicenseKey } from "./_actions";

const REASON_LABELS: Record<string, string> = {
  missing: "ยังไม่ได้ลงทะเบียนใบอนุญาต",
  expired: "ใบอนุญาตหมดอายุ",
  invalid: "ใบอนุญาตไม่ถูกต้อง",
  school_mismatch: "ใบอนุญาตไม่ตรงกับโรงเรียน",
};

export default function LicensePage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const reason = searchParams.reason ?? "missing";
  const label = REASON_LABELS[reason] ?? REASON_LABELS.missing;

  const [state, action, pending] = useActionState(saveLicenseKey, null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-primary-50/60 to-primary-100/70 px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary-300/20 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md items-center justify-center">
        <div className="w-full overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
          <div className="h-1.5 w-full bg-amber-400" />

          <div className="px-8 py-10">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                <svg
                  className="h-8 w-8 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                  />
                </svg>
              </div>
            </div>

            <h1 className="mb-1 text-center text-xl font-semibold text-gray-900">
              ใบอนุญาตการใช้งาน
            </h1>
            <p className="mb-8 text-center text-sm text-amber-600">{label}</p>

            {/* Success */}
            {state?.success && (
              <div className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
                ✓ บันทึกใบอนุญาตสำเร็จ กำลังเข้าสู่ระบบ…
              </div>
            )}

            {/* Error */}
            {state?.error && !state.success && (
              <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                {state.error}
              </div>
            )}

            {/* Form */}
            {!state?.success && (
              <form action={action} className="space-y-4">
                <div>
                  <label
                    htmlFor="license_key"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    License Key
                  </label>
                  <textarea
                    id="license_key"
                    name="license_key"
                    rows={5}
                    required
                    placeholder="eyJhbGci..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-60"
                >
                  {pending ? "กำลังตรวจสอบ…" : "เปิดใช้งาน"}
                </button>
              </form>
            )}

            <div className="mt-6 border-t border-gray-100 pt-6 text-center">
              <p className="mb-3 text-xs text-gray-500">ยังไม่มีใบอนุญาต? ติดต่อผู้พัฒนา</p>
              <a
                href="mailto:topchanon@gmail.com?subject=ขอรับใบอนุญาต PP.5 Grade"
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                topchanon@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
