"use client";

import { Select } from "@pp5/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type GradeFilterOption = {
  id: string;
  label: string;
};

type Props = {
  options: GradeFilterOption[];
  /** Currently-selected grade_level_id (empty string = "all"). */
  current: string;
  /** Label shown above the select. */
  label?: string;
  /** Param name in the URL. Defaults to "grade". */
  param?: string;
  /** Placeholder text for the empty option. */
  placeholder?: string;
  /** Other URL params to remove whenever this filter changes. */
  clearParams?: string[];
};

/**
 * URL-param-driven dropdown for filtering a list by grade_level.
 *
 * Pushes `?<param>=<id>` (or removes it for "all") and lets the server
 * component re-render with the filtered data.
 */
export function GradeFilter({
  options,
  current,
  label = "ระดับชั้น",
  param = "grade",
  placeholder = "ทุกระดับชั้น",
  clearParams,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <Select
        value={current}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams.toString());
          if (e.target.value) next.set(param, e.target.value);
          else next.delete(param);
          // Clear dependent params so the new selection starts fresh
          for (const p of clearParams ?? []) next.delete(p);
          const query = next.toString();
          router.push(query ? `${pathname}?${query}` : pathname);
        }}
        className="w-44"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
