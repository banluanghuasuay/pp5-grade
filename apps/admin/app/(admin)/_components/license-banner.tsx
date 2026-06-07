import Link from "next/link";

type Props = {
  level: "trial" | "readonly";
  daysRemaining?: number;
};

export function LicenseBanner({ level, daysRemaining }: Props) {
  if (level === "trial") {
    const urgent = (daysRemaining ?? 0) <= 14;
    return (
      <div
        className={`flex items-center justify-between gap-4 px-4 py-2 text-sm ${
          urgent
            ? "bg-amber-500 text-white"
            : "bg-amber-50 text-amber-900"
        }`}
      >
        <p>
          <span className="font-medium">ทดลองใช้งาน</span>
          {" · "}
          {daysRemaining != null && daysRemaining > 0 ? (
            <>
              เหลืออีก{" "}
              <span className="font-bold">{daysRemaining} วัน</span>
            </>
          ) : (
            <span className="font-bold">วันสุดท้าย</span>
          )}
        </p>
        <Link
          href="/license"
          className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition ${
            urgent
              ? "bg-white text-amber-700 hover:bg-amber-50"
              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
          }`}
        >
          ซื้อ License →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-red-600 px-4 py-2 text-sm text-white">
      <p>
        <span className="font-medium">หมดอายุทดลองใช้</span>
        {" · "}
        ดูข้อมูลได้อย่างเดียว ไม่สามารถบันทึกได้
      </p>
      <Link
        href="/license"
        className="shrink-0 rounded-lg bg-white px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
      >
        ซื้อ License →
      </Link>
    </div>
  );
}
