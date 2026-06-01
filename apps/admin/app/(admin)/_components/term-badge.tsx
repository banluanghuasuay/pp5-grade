import { cn } from "@pp5/ui";
import Link from "next/link";
import type { CurrentTerm } from "@/lib/current-term";

/**
 * "ปีการศึกษา YYYY · ภาคเรียนที่ N" pill (green) — or an amber
 * "ยังไม่ตั้งค่าปีปัจจุบัน" warning when no current year is set. Links to
 * the academic-years setup page.
 *
 * Shared between PageContextBar (desktop, right of the breadcrumb) and
 * MobileHeader (mobile, in place of the old logout button). `className`
 * lets each caller tweak responsive visibility.
 */
export function TermBadge({
  term,
  className,
}: {
  term: CurrentTerm | null;
  className?: string;
}) {
  if (term) {
    return (
      <Link
        href="/setup/academic-years"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100",
          className,
        )}
        title="คลิกเพื่อตั้งค่าปีการศึกษา"
      >
        <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
        ปีการศึกษา {term.yearBe} · ภาคเรียนที่ {term.semester}
      </Link>
    );
  }
  return (
    <Link
      href="/setup/academic-years"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100",
        className,
      )}
    >
      <span aria-hidden>⚠️</span>
      ยังไม่ตั้งค่าปีปัจจุบัน
    </Link>
  );
}
