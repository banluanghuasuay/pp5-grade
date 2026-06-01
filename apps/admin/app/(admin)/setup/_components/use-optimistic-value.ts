"use client";

import { useEffect, useState } from "react";

/**
 * Mirror a server-derived (URL-driven) value with INSTANT optimistic updates.
 *
 * Controlled `<Select value={prop}>` dropdowns that navigate on change show
 * the OLD value until the RSC navigation commits (~load time) — the chosen
 * option doesn't appear selected until the server responds. This hook fixes
 * that: on change, call the returned setter with the picked value so the
 * control snaps immediately; when the navigation commits and `propValue`
 * changes, the optimistic value is cleared so the server value wins again.
 *
 * Usage:
 *   const [gradeVal, setGrade] = useOptimisticValue(selectedGradeId);
 *   <Select value={gradeVal}
 *           onChange={(e) => { setGrade(e.target.value); navigate(...); }} />
 *
 * Returns `[displayValue, setOptimistic]`.
 */
export function useOptimisticValue(propValue: string) {
  const [optimistic, setOptimistic] = useState<string | null>(null);
  // When the prop catches up (nav committed / params reset), drop the
  // optimistic override so the authoritative server value takes over.
  useEffect(() => {
    setOptimistic(null);
  }, [propValue]);
  return [optimistic ?? propValue, setOptimistic] as const;
}
