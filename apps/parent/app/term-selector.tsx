"use client";

import { Select } from "@pp5/ui";
import { useRouter } from "next/navigation";
import type { Term } from "./_data/report-card";

/**
 * ภาคเรียน/ปีการศึกษา picker for the student report card. Navigates to
 * `/?term=<key>`; the home page reads it and re-renders that term. Latest
 * term is the default (handled server-side in pickTerm).
 */
export function TermSelector({
  terms,
  selectedKey,
}: {
  terms: Term[];
  selectedKey: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={selectedKey}
      onChange={(e) => router.push(`/?term=${e.target.value}`)}
      className="w-full sm:w-auto"
      aria-label="เลือกภาคเรียน/ปีการศึกษา"
    >
      {terms.map((t) => (
        <option key={t.key} value={t.key}>
          {t.label}
        </option>
      ))}
    </Select>
  );
}
