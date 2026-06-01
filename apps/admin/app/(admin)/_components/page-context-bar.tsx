import type { CurrentTerm } from "@/lib/current-term";
import { Breadcrumb } from "./breadcrumb";
import { TermBadge } from "./term-badge";

/**
 * Top context strip rendered above every page inside the admin layout.
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ ตั้งค่าพื้นฐาน / ปีการศึกษา        ● ปีการศึกษา 2569 · ภาคเรียนที่ 1 │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * Left  → breadcrumb (resolves from pathname client-side)
 * Right → current term badge — DESKTOP ONLY (`hidden md:inline-flex`). On
 *         mobile the badge moves up into the MobileHeader (in place of the
 *         old logout button), so it'd be redundant here.
 *
 * `term` is fetched once in the layout and passed down (shared with
 * MobileHeader) to avoid a duplicate getCurrentTerm query.
 */
export function PageContextBar({ term }: { term: CurrentTerm | null }) {
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-6 py-2 sm:px-8">
      <Breadcrumb />
      <TermBadge term={term} className="hidden md:inline-flex" />
    </div>
  );
}
