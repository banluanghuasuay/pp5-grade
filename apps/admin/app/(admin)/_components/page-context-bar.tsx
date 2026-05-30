import Link from "next/link";
import { getCurrentTerm } from "@/lib/current-term";
import { Breadcrumb } from "./breadcrumb";

/**
 * Top context strip rendered above every page inside the admin layout.
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ ตั้งค่าพื้นฐาน / ปีการศึกษา        ● ปีการศึกษา 2569 · ภาค 1   │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * Left  → breadcrumb (resolves from pathname client-side)
 * Right → current term badge (server-rendered from academic_years row)
 */
export async function PageContextBar() {
  const term = await getCurrentTerm();

  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-6 py-2 sm:px-8">
      <Breadcrumb />
      {term ? (
        <Link
          href="/setup/academic-years"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
          title="คลิกเพื่อตั้งค่าปีการศึกษา"
        >
          <span
            className="size-1.5 rounded-full bg-emerald-500"
            aria-hidden
          />
          ปีการศึกษา {term.yearBe} · ภาคเรียนที่ {term.semester}
        </Link>
      ) : (
        <Link
          href="/setup/academic-years"
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
        >
          <span aria-hidden>⚠️</span>
          ยังไม่ตั้งค่าปีปัจจุบัน
        </Link>
      )}
    </div>
  );
}
