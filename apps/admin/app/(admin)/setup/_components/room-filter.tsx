"use client";

import { Select } from "@pp5/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type RoomFilterOption = {
  id: string;
  label: string;
};

type Props = {
  options: RoomFilterOption[];
  /** Currently-selected classroom_id (empty string = "all rooms" / not chosen). */
  current: string;
  /** Label shown above the select. */
  label?: string;
  /** Param name in the URL. Defaults to "room". */
  param?: string;
  /** Placeholder for the empty option. */
  placeholder?: string;
};

/**
 * URL-param-driven dropdown for filtering by classroom (room number) — used
 * alongside `<GradeFilter>` when the selected grade has multiple rooms.
 */
export function RoomFilter({
  options,
  current,
  label = "ห้อง",
  param = "room",
  placeholder = "— เลือกห้อง —",
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
          const query = next.toString();
          router.push(query ? `${pathname}?${query}` : pathname);
        }}
        className="w-32"
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
