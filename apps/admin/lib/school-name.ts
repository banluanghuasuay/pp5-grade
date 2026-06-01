/**
 * Prefix "โรงเรียน" to a school name, unless it already starts with it.
 *
 * Schools' `name_th` often already includes "โรงเรียน" (e.g.
 * "โรงเรียนบ้านโคกผักหอม"), so blindly prepending the word produces the
 * duplicated "โรงเรียนโรงเรียน…". This guards against that.
 *
 * Returns "" for empty/null so callers can decide on a fallback.
 */
export function withSchoolPrefix(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "";
  return n.startsWith("โรงเรียน") ? n : `โรงเรียน${n}`;
}
