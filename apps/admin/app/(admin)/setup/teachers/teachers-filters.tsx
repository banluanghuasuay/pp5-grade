"use client";

import { Select } from "@pp5/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFilterNav } from "../_components/filter-nav-context";

const POSITION_OPTIONS = [
  { value: "", label: "ทุกตำแหน่ง" },
  { value: "ผู้อำนวยการ", label: "ผู้อำนวยการ" },
  { value: "รองผู้อำนวยการ", label: "รองผู้อำนวยการ" },
  { value: "ครูผู้สอน", label: "ครูผู้สอน" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "ใช้งาน" },
  { value: "inactive", label: "ปิดใช้งาน" },
  { value: "all", label: "ทั้งหมด" },
];

/**
 * Filter bar for /setup/teachers — ตำแหน่ง / กลุ่มสาระ / สถานะ. Each is a
 * URL-param-driven dropdown (router.push) so the server re-renders the
 * filtered list. `startNav()` fires the table skeleton at 0ms.
 *
 * Defaults (kept out of the URL so the bar reads clean on first load):
 *   - position  → "" (ทุกตำแหน่ง)
 *   - department → "" (ทุกกลุ่มสาระ)
 *   - status    → "active" (ใช้งาน) — user spec 2026-05-31
 */
export function TeachersFilters({
  departments,
  position,
  department,
  status,
}: {
  departments: string[];
  position: string;
  department: string;
  status: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startNav } = useFilterNav();

  const setParam = (key: string, value: string, defaultValue = "") => {
    startNav();
    const next = new URLSearchParams(searchParams.toString());
    if (value && value !== defaultValue) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex items-end gap-2 sm:gap-3">
      <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
        <span className="text-xs font-medium text-zinc-600">ตำแหน่ง</span>
        <Select
          value={position}
          onChange={(e) => setParam("position", e.target.value)}
          className="w-full sm:w-40"
        >
          {POSITION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>

      {/* กลุ่มสาระ — widest of the three: bigger flex share on mobile
          (ชื่อกลุ่มสาระยาว) + wider fixed width on desktop. */}
      <label className="flex min-w-0 flex-[1.6] flex-col gap-1 sm:flex-none">
        <span className="text-xs font-medium text-zinc-600">กลุ่มสาระ</span>
        <Select
          value={department}
          onChange={(e) => setParam("department", e.target.value)}
          className="w-full sm:w-64"
        >
          <option value="">ทุกกลุ่มสาระ</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </label>

      {/* สถานะ — narrowest: small flex share on mobile (สั้น:
          ใช้งาน/ปิด/ทั้งหมด) so กลุ่มสาระ gets more room. */}
      <label className="flex min-w-0 flex-[0.7] flex-col gap-1 sm:flex-none">
        <span className="text-xs font-medium text-zinc-600">สถานะ</span>
        <Select
          value={status}
          onChange={(e) => setParam("status", e.target.value, "active")}
          className="w-full sm:w-32"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
