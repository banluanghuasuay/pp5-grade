/**
 * Tiny className combiner.
 * - Filters out falsy values (false / undefined / null / "")
 * - Joins with spaces
 * - No `tailwind-merge` magic — last write wins via order in our usage
 *
 * For simple class composition. Use template literals when more readable.
 */
export function cn(
  ...inputs: Array<string | false | undefined | null>
): string {
  return inputs.filter(Boolean).join(" ");
}
