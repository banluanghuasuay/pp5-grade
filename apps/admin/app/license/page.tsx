"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { saveLicenseKey } from "./_actions";

const REASON_LABELS: Record<string, string> = {
  missing: "ยังไม่ได้ลงทะเบียนใบอนุญาต",
  expired: "ใบอนุญาตหมดอายุ",
  invalid: "ใบอนุญาตไม่ถูกต้อง",
  school_mismatch: "ใบอนุญาตไม่ตรงกับโรงเรียน",
};

// กรองเฉพาะ base32 chars ที่ใช้ (ไม่มี I, O, 0, 1)
const B32_RE = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/gi;

function formatKey(raw: string): string {
  const clean = raw.toUpperCase().replace(B32_RE, "").slice(0, 16);
  return clean.match(/.{1,4}/g)?.join("-") ?? clean;
}

const STEPS: React.ReactNode[] = [
  "สแกน QR Code แล้วโอนเงิน 499 บาท",
  "แคปหน้าจอยืนยันการโอนเก็บไว้",
  <>
    ส่งสลิป +{" "}
    <span className="font-semibold text-gray-800">ชื่อโรงเรียน (ภาษาไทย)</span>{" "}
    มาที่ LINE OA
  </>,
  "รอการยืนยัน ภายใน 24 ชั่วโมง (วันทำการ)",
];

function LicensePageContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") ?? "missing";
  const label = REASON_LABELS[reason] ?? REASON_LABELS.missing;

  const [keyValue, setKeyValue] = useState("");
  const [qrError, setQrError] = useState(false);

  const [state, action, pending] = useActionState(saveLicenseKey, null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKeyValue(formatKey(e.target.value));
  }

  const isComplete = keyValue.replace(/-/g, "").length === 16;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-primary-50/50 to-primary-100/60 px-4 py-10">
      {/* Background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary-300/20 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-md pb-8">
        {/* ── ปุ่มย้อนกลับ ── */}
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          ย้อนกลับ
        </Link>

        {/* ── Card ── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
          <div className="h-1.5 w-full bg-amber-400" />

          <div className="space-y-6 px-7 py-8">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                <svg
                  className="h-7 w-7 text-amber-500"
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
              <h1 className="text-lg font-semibold text-gray-900">
                ใบอนุญาตการใช้งาน
              </h1>
              <p className="mt-0.5 text-sm text-amber-600">{label}</p>
            </div>

            {/* Alerts */}
            {state?.success && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
                ✓ บันทึกใบอนุญาตสำเร็จ กำลังเข้าสู่ระบบ…
              </div>
            )}
            {state?.error && !state.success && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                {state.error}
              </div>
            )}

            {/* ── Section A: กรอก License Key ── */}
            {!state?.success && (
              <form action={action} className="space-y-3">
                <div>
                  <label
                    htmlFor="license_key"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    กรอก License Key
                  </label>
                  <input
                    id="license_key"
                    name="license_key"
                    type="text"
                    required
                    value={keyValue}
                    onChange={handleChange}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    maxLength={19}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center font-mono text-xl tracking-[0.25em] text-gray-800 placeholder-gray-300 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                  <p className="mt-1.5 text-center text-xs text-gray-400">
                    รูปแบบ XXXX-XXXX-XXXX-XXXX (16 ตัวอักษร)
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={pending || !isComplete}
                  className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? "กำลังตรวจสอบ…" : "เปิดใช้งาน"}
                </button>
              </form>
            )}

            {/* ── Divider ── */}
            <div className="relative flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="shrink-0 text-xs text-gray-400">
                ยังไม่มี License Key?
              </span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* ── Section B: สั่งซื้อ ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-800">
                  สั่งซื้อใบอนุญาต
                </h2>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  499 บาท · ตลอดชีพ
                </span>
              </div>

              {/* QR + PromptPay number */}
              <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-5">
                {!qrError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="https://promptpay.io/0956186660/499"
                    alt="QR PromptPay 499 บาท"
                    width={180}
                    height={180}
                    className="rounded-lg bg-white"
                    onError={() => setQrError(true)}
                  />
                ) : (
                  <div className="flex h-44 w-44 flex-col items-center justify-center gap-1 rounded-lg bg-gray-200 text-center text-xs text-gray-500">
                    <span className="text-2xl">📱</span>
                    <span>PromptPay</span>
                    <span className="font-bold text-gray-700">095-618-6660</span>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    สแกนด้วยแอปธนาคาร / Mobile Banking
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-gray-800">
                    PromptPay · 095-618-6660
                  </p>
                </div>
              </div>

              {/* Steps */}
              <ol className="space-y-2.5">
                {STEPS.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-600">{step}</span>
                  </li>
                ))}
              </ol>

              {/* LINE OA button */}
              <a
                href="https://line.me/R/ti/p/%40967xydrv"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#05a847] active:scale-[0.98]"
              >
                {/* LINE bubble icon */}
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 48 48"
                  fill="currentColor"
                >
                  <path d="M24 4C12.95 4 4 11.86 4 21.5c0 7.93 5.63 14.67 13.5 17.23.99.27.83 1.31.62 4.6C17.9 45 19.5 44.17 20.71 43.5 25.8 40.8 39.5 33.72 41.94 28.72 42.6 27.14 44 24.44 44 21.5 44 11.86 35.05 4 24 4z" />
                </svg>
                @967xydrv — WebAppSchool
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LicensePage() {
  return (
    <Suspense>
      <LicensePageContent />
    </Suspense>
  );
}
