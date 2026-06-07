"use server";

import { createAdminClient } from "@pp5/database/admin";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";
import { ensureSemesterEditable } from "@/lib/current-term";
import { requireWriteAccess } from "@/lib/access";

// Layout: 10 "ระหว่างภาค" slots + 1 "ปลายภาค" slot = 11 categories per offering
const COLLECT_SLOTS = 10;

async function ensureAdmin(): Promise<void> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    throw new Error("ไม่มีสิทธิ์");
  }
}

/**
 * Permission check for offering-scoped writes (max_score, score, pass/fail,
 * special status). Admin: always allowed. Teacher: must be the assigned
 * teacher for the offering. Used by saveCategoryMaxScore, saveScore,
 * saveSemesterPassFail, setGradeSpecialStatus, setAllPassFail.
 *
 * User spec 2026-05-20: "แก้ให้ครูบันทึกได้" (เฉพาะของวิชาที่ตัวเองสอน).
 */
async function ensureCanEditOffering(
  admin: ReturnType<typeof createAdminClient>,
  offeringId: string,
): Promise<void> {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("ไม่ได้เข้าสู่ระบบ");
  if (auth.profile.role === "admin") return; // admin bypass

  // Teacher path — look up their teachers row + verify ownership of offering
  const { data: teacher } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", auth.profile.id)
    .maybeSingle();
  if (!teacher) throw new Error("ไม่พบข้อมูลครู");

  const { data: offering } = await admin
    .from("subject_offerings")
    .select("teacher_id")
    .eq("id", offeringId)
    .maybeSingle();
  if (!offering) throw new Error("ไม่พบรายวิชา");
  if (offering.teacher_id !== teacher.id) {
    throw new Error("ไม่ได้สอนรายวิชานี้");
  }
}

/** Same permission check but starting from a category_id (lookup → offering). */
async function ensureCanEditCategory(
  admin: ReturnType<typeof createAdminClient>,
  categoryId: string,
): Promise<void> {
  const { data: cat } = await admin
    .from("score_categories")
    .select("offering_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (!cat) throw new Error("ไม่พบหัวข้อคะแนน");
  await ensureCanEditOffering(admin, cat.offering_id);
}

/**
 * Phase 2.6 — resolve the semester of a `score_categories` row (via its
 * offering) and assert it matches the school's current_semester. Used by
 * saveScore and saveCategoryMaxScore which only know the category id.
 */
async function ensureCategorySemesterEditable(
  admin: ReturnType<typeof createAdminClient>,
  categoryId: string,
): Promise<void> {
  const { data } = await admin
    .from("score_categories")
    .select("offering:subject_offerings!offering_id(semester)")
    .eq("id", categoryId)
    .maybeSingle();
  const sem = data?.offering?.semester;
  if (sem === 1 || sem === 2) {
    await ensureSemesterEditable(sem);
  }
}

/**
 * Phase 2.6 — resolve the semester directly from an offering id. Used by
 * saveSemesterPassFail and setAllPassFail.
 */
async function ensureOfferingSemesterEditable(
  admin: ReturnType<typeof createAdminClient>,
  offeringId: string,
): Promise<void> {
  const { data } = await admin
    .from("subject_offerings")
    .select("semester")
    .eq("id", offeringId)
    .maybeSingle();
  const sem = data?.semester;
  if (sem === 1 || sem === 2) {
    await ensureSemesterEditable(sem);
  }
}

/**
 * Ensure the offering has exactly 11 category slots:
 *   - sort_order 1..10: "ระหว่างภาค N" (is_midterm=false, is_final=false)
 *   - sort_order 11:    "ปลายภาค"     (is_final=true)
 *
 * Self-healing: deletes duplicates (same sort_order) and out-of-range
 * categories (sort_order < 1 or > 11) — keeps the oldest row per slot to
 * preserve any score data the user already entered.
 *
 * CASCADE will remove `scores` rows for deleted categories — acceptable for
 * out-of-range cleanup since those slots are invisible in the UI anyway.
 *
 * Returns the 11 categories sorted by sort_order.
 */
export async function ensureCategorySlots(offeringId: string): Promise<
  Array<{
    id: string;
    name: string;
    max_score: number;
    sort_order: number;
    is_midterm: boolean;
    is_final: boolean;
  }>
> {
  await requireWriteAccess();
  const admin = createAdminClient();
  const finalSort = COLLECT_SLOTS + 1;


  // Read ALL existing (incl. duplicates + stray sort_orders)
  const { data: existing } = await admin
    .from("score_categories")
    .select("id, name, max_score, sort_order, is_final, created_at")
    .eq("offering_id", offeringId)
    .order("sort_order")
    .order("created_at");

  // Group by sort_order — oldest row per slot wins
  type ExistingRow = NonNullable<typeof existing>[number];
  const bySort = new Map<number, ExistingRow>();
  const toDelete: string[] = [];
  for (const c of existing ?? []) {
    const so = c.sort_order ?? 0;
    if (so < 1 || so > finalSort) {
      // Out of range — always delete
      toDelete.push(c.id);
      continue;
    }
    if (bySort.has(so)) {
      // Duplicate — keep oldest, delete this one
      toDelete.push(c.id);
    } else {
      bySort.set(so, c);
    }
  }

  if (toDelete.length > 0) {
    await admin.from("score_categories").delete().in("id", toDelete);
  }

  // Insert missing slots (with max_score=0 default)
  const missing: Array<{
    offering_id: string;
    name: string;
    sort_order: number;
    max_score: number;
    is_midterm: boolean;
    is_final: boolean;
  }> = [];
  for (let i = 1; i <= COLLECT_SLOTS; i++) {
    if (!bySort.has(i)) {
      missing.push({
        offering_id: offeringId,
        name: `ระหว่างภาค ${i}`,
        sort_order: i,
        max_score: 0,
        is_midterm: false,
        is_final: false,
      });
    }
  }
  if (!bySort.has(finalSort)) {
    missing.push({
      offering_id: offeringId,
      name: "ปลายภาค",
      sort_order: finalSort,
      max_score: 0,
      is_midterm: false,
      is_final: true,
    });
  }

  if (missing.length > 0) {
    await admin.from("score_categories").insert(missing);
  }

  // Re-read clean state
  const { data: full } = await admin
    .from("score_categories")
    .select("id, name, max_score, sort_order, is_midterm, is_final")
    .eq("offering_id", offeringId)
    .gte("sort_order", 1)
    .lte("sort_order", finalSort)
    .order("sort_order");

  return (full ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    max_score: Number(c.max_score),
    sort_order: c.sort_order ?? 0,
    is_midterm: !!c.is_midterm,
    is_final: !!c.is_final,
  }));
}

/**
 * Phase 4 — ensure the 12-slot **secondary (มัธยม)** layout:
 *   1..5  ก่อนกลางภาค (regular)
 *   6     กลางภาค     (is_midterm=true)
 *   7..11 หลังกลางภาค (regular)
 *   12    ปลายภาค     (is_final=true)
 *
 * Migration from a legacy 11-slot primary layout (1..10 + 11=final):
 *   - Move existing slot 11 (final) → slot 12  (preserves max_score + scores)
 *   - Re-label slot 6 as midterm (preserves max_score + scores; the *meaning*
 *     of slot 6 changes from "ระหว่างภาค 6" to "สอบกลางภาค" — admin can
 *     reset max_score if needed)
 *
 * Self-healing: also dedupes by sort_order and trims out-of-range rows.
 */
export async function ensureSecondaryCategorySlots(
  offeringId: string,
): Promise<
  Array<{
    id: string;
    name: string;
    max_score: number;
    sort_order: number;
    is_midterm: boolean;
    is_final: boolean;
  }>
> {
  await requireWriteAccess();
  const admin = createAdminClient();
  const TOTAL_SLOTS = 12;
  const MIDTERM_SORT = 6;
  const FINAL_SORT = 12;

  const { data: existing } = await admin
    .from("score_categories")
    .select("id, name, max_score, sort_order, is_midterm, is_final, created_at")
    .eq("offering_id", offeringId)
    .order("sort_order")
    .order("created_at");

  type ExistingRow = NonNullable<typeof existing>[number];
  const bySort = new Map<number, ExistingRow>();
  const toDelete: string[] = [];

  for (const c of existing ?? []) {
    const so = c.sort_order ?? 0;
    if (so < 1 || so > TOTAL_SLOTS) {
      toDelete.push(c.id);
      continue;
    }
    if (bySort.has(so)) {
      toDelete.push(c.id);
    } else {
      bySort.set(so, c);
    }
  }

  if (toDelete.length > 0) {
    await admin.from("score_categories").delete().in("id", toDelete);
  }

  // ---- Legacy primary detection + migration ----
  // Primary structure: slot 11 = final, no slot 12, no midterm.
  const slot6 = bySort.get(6);
  const slot11 = bySort.get(11);
  const slot12 = bySort.get(12);
  const isLegacyPrimary =
    !slot12 && slot11?.is_final === true && !slot6?.is_midterm;

  if (isLegacyPrimary && slot11) {
    // Step 1: slot 11 (final) → slot 12
    await admin
      .from("score_categories")
      .update({ sort_order: FINAL_SORT })
      .eq("id", slot11.id);
    bySort.delete(11);
    bySort.set(FINAL_SORT, { ...slot11, sort_order: FINAL_SORT });
  }

  if (isLegacyPrimary && slot6) {
    // Step 2: slot 6 (regular) → midterm
    await admin
      .from("score_categories")
      .update({ name: "กลางภาค", is_midterm: true })
      .eq("id", slot6.id);
    bySort.set(MIDTERM_SORT, { ...slot6, name: "กลางภาค", is_midterm: true });
  }

  // ---- Insert any still-missing slots ----
  type Insert = {
    offering_id: string;
    name: string;
    sort_order: number;
    max_score: number;
    is_midterm: boolean;
    is_final: boolean;
  };
  const missing: Insert[] = [];

  for (let i = 1; i <= 5; i++) {
    if (!bySort.has(i)) {
      missing.push({
        offering_id: offeringId,
        name: `ระหว่างภาค ${i}`,
        sort_order: i,
        max_score: 0,
        is_midterm: false,
        is_final: false,
      });
    }
  }
  if (!bySort.has(MIDTERM_SORT)) {
    missing.push({
      offering_id: offeringId,
      name: "กลางภาค",
      sort_order: MIDTERM_SORT,
      max_score: 0,
      is_midterm: true,
      is_final: false,
    });
  }
  for (let i = 7; i <= 11; i++) {
    if (!bySort.has(i)) {
      missing.push({
        offering_id: offeringId,
        // Display number = i - 1 (so after-mid renumbers as 6..10)
        name: `ระหว่างภาค ${i - 1}`,
        sort_order: i,
        max_score: 0,
        is_midterm: false,
        is_final: false,
      });
    }
  }
  if (!bySort.has(FINAL_SORT)) {
    missing.push({
      offering_id: offeringId,
      name: "ปลายภาค",
      sort_order: FINAL_SORT,
      max_score: 0,
      is_midterm: false,
      is_final: true,
    });
  }

  if (missing.length > 0) {
    await admin.from("score_categories").insert(missing);
  }

  // ---- Re-read clean state ----
  const { data: full } = await admin
    .from("score_categories")
    .select("id, name, max_score, sort_order, is_midterm, is_final")
    .eq("offering_id", offeringId)
    .gte("sort_order", 1)
    .lte("sort_order", TOTAL_SLOTS)
    .order("sort_order");

  return (full ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    max_score: Number(c.max_score),
    sort_order: c.sort_order ?? 0,
    is_midterm: !!c.is_midterm,
    is_final: !!c.is_final,
  }));
}

/**
 * Phase 4B — copy max_score values from another offering into this one.
 *
 * Matches by `sort_order` (1-12), so the structure should already be aligned
 * (both should be secondary 12-slot or both primary 11-slot). Student scores
 * are NOT touched — only the max_score per category changes.
 *
 * Used by the "คัดลอกจากห้องอื่น" button in the secondary view.
 */
export async function copyMaxScoresFromOffering(
  formData: FormData,
): Promise<void> {
  await requireWriteAccess();
  const targetOfferingId = String(
    formData.get("target_offering_id") ?? "",
  ).trim();
  const sourceOfferingId = String(
    formData.get("source_offering_id") ?? "",
  ).trim();
  if (!targetOfferingId || !sourceOfferingId) {
    throw new Error("missing offering ids");
  }
  if (targetOfferingId === sourceOfferingId) {
    throw new Error("ห้องต้นทางและปลายทางต้องไม่ใช่ห้องเดียวกัน");
  }

  const admin = createAdminClient();
  // Teacher must own the TARGET offering (they can read any source freely).
  await ensureCanEditOffering(admin, targetOfferingId);
  await ensureOfferingSemesterEditable(admin, targetOfferingId);

  // 1. Read source categories
  const { data: sourceCats, error: srcErr } = await admin
    .from("score_categories")
    .select("sort_order, max_score")
    .eq("offering_id", sourceOfferingId)
    .order("sort_order");
  if (srcErr) throw new Error(srcErr.message);
  if (!sourceCats || sourceCats.length === 0) {
    throw new Error("ห้องต้นทางยังไม่มีโครงสร้างคะแนน");
  }

  // 2. Read target categories
  const { data: targetCats, error: tgtErr } = await admin
    .from("score_categories")
    .select("id, sort_order")
    .eq("offering_id", targetOfferingId);
  if (tgtErr) throw new Error(tgtErr.message);
  if (!targetCats || targetCats.length === 0) {
    throw new Error("ห้องปลายทางยังไม่มีโครงสร้างคะแนน");
  }

  // 3. Map sort_order → target id, then update each matching cell.
  // We update sequentially so partial failure is recoverable.
  const targetBySort = new Map<number, string>();
  for (const tc of targetCats) {
    if (tc.sort_order != null) targetBySort.set(tc.sort_order, tc.id);
  }

  for (const sc of sourceCats) {
    const so = sc.sort_order ?? 0;
    const targetId = targetBySort.get(so);
    if (!targetId) continue; // structure mismatch — skip silently
    const max = Number(sc.max_score) || 0;
    const { error } = await admin
      .from("score_categories")
      .update({ max_score: max })
      .eq("id", targetId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/setup/score-structure");
}

/**
 * Update a single category's max_score (called from the "คะแนนเต็ม" row on blur).
 *
 * Returns void — UI optimistically holds the typed value; the server just
 * persists and may revalidate.
 */
export async function saveCategoryMaxScore(formData: FormData): Promise<void> {
  await requireWriteAccess();
  const id = String(formData.get("category_id") ?? "").trim();
  const maxStr = String(formData.get("max_score") ?? "").trim();
  if (!id) throw new Error("missing category_id");

  let max = Number.parseFloat(maxStr || "0");
  if (!Number.isFinite(max) || max < 0) max = 0;
  if (max > 999.99) max = 999.99;

  const admin = createAdminClient();
  await ensureCanEditCategory(admin, id);
  await ensureCategorySemesterEditable(admin, id);
  const { error } = await admin
    .from("score_categories")
    .update({ max_score: max })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/setup/score-structure");
}

/**
 * Upsert a single student score (called from a student cell on blur).
 *
 * Empty/blank score → DELETE the row (semantically: "no score entered").
 * Non-empty → UPSERT capped at the category's max_score.
 */
export async function saveScore(formData: FormData): Promise<void> {
  await requireWriteAccess();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const valueStr = String(formData.get("score") ?? "").trim();

  if (!studentId || !categoryId) throw new Error("missing student/category");

  // Phase 2.6 — locked semester rejects writes
  // Phase 2 (teacher scope) — teacher must own the offering
  const adminGuard = createAdminClient();
  await ensureCanEditCategory(adminGuard, categoryId);
  await ensureCategorySemesterEditable(adminGuard, categoryId);

  const admin = createAdminClient();

  // Blank → remove the score (treat as "not entered")
  if (valueStr === "") {
    const { error } = await admin
      .from("scores")
      .delete()
      .eq("student_id", studentId)
      .eq("category_id", categoryId);
    if (error) throw new Error(error.message);
    revalidatePath("/setup/score-structure");
    return;
  }

  let score = Number.parseFloat(valueStr);
  if (!Number.isFinite(score) || score < 0) score = 0;

  // We DELIBERATELY accept scores above max_score — admin sometimes enters
  // bonus points that exceed the configured maximum. The UI highlights the
  // cell red as a visual warning, but the value is stored as-is so totals
  // (which the user said are allowed to exceed 100) stay accurate.
  //
  // We only cap at the DB column's DECIMAL(5,2) limit to avoid Postgres
  // numeric-overflow errors.
  if (score > 999.99) score = 999.99;

  // NOTE: recorded_by references teachers.id (not users.id) so for admin we
  // leave it null. When teacher-self-entry is added later, look up teacher_id.
  const { error } = await admin.from("scores").upsert(
    {
      student_id: studentId,
      category_id: categoryId,
      score,
      recorded_by: null,
    },
    { onConflict: "student_id,category_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/setup/score-structure");
}

/**
 * Save a single student's pass/fail result for one semester of an activity
 * subject (subject.grading_mode = 'pass_fail').
 *
 * Writes to `grades` with grading_period='semester' so each ภาค is its own
 * row. The annual aggregate is computed at display time on the summary tab
 * (must pass BOTH semesters → overall ผ่าน) — we don't persist that.
 *
 * Empty value → DELETE the row (semantically: "not assessed yet").
 */
export async function saveSemesterPassFail(formData: FormData): Promise<void> {
  await requireWriteAccess();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const offeringId = String(formData.get("offering_id") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();

  if (!studentId || !offeringId) {
    throw new Error("missing student/offering");
  }

  const admin = createAdminClient();
  await ensureCanEditOffering(admin, offeringId);
  await ensureOfferingSemesterEditable(admin, offeringId);

  if (value === "") {
    const { error } = await admin
      .from("grades")
      .delete()
      .eq("student_id", studentId)
      .eq("offering_id", offeringId)
      .eq("grading_period", "semester");
    if (error) throw new Error(error.message);
    revalidatePath("/setup/score-structure");
    return;
  }

  if (value !== "pass" && value !== "fail") {
    throw new Error("invalid value");
  }

  // grades CHECK constraint: pass_fail ≠ NULL means grade must be NULL.
  // total_score also nullable — leave as null for activity subjects.
  const { error } = await admin.from("grades").upsert(
    {
      student_id: studentId,
      offering_id: offeringId,
      grading_period: "semester",
      pass_fail: value,
      grade: null,
      total_score: null,
      is_incomplete: false,
      is_no_eligibility: false,
    },
    { onConflict: "student_id,offering_id,grading_period" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/setup/score-structure");
}

/**
 * Set or clear the "ร" (incomplete / รอประเมิน) or "มส" (no eligibility /
 * เวลาเรียนไม่ครบ) special-status flag on a student's final grade.
 *
 * For numeric subjects the grade itself is computed on the fly from `scores`,
 * so the `grades` row exists ONLY when a special status (or future
 * manual_override) is set. Therefore:
 *   - status = ""               → DELETE the row (numeric grade re-computes)
 *   - status = "incomplete"     → upsert with is_incomplete=true
 *   - status = "no_eligibility" → upsert with is_no_eligibility=true
 *
 * `grading_period` is "annual" for ประถม / "semester" for มัธยม (matches
 * the row that the summary section reads against the anchor offering).
 */
export async function setGradeSpecialStatus(formData: FormData): Promise<void> {
  await requireWriteAccess();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const offeringId = String(formData.get("offering_id") ?? "").trim();
  const gradingPeriod = String(formData.get("grading_period") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!studentId || !offeringId) {
    throw new Error("missing student/offering");
  }
  if (gradingPeriod !== "semester" && gradingPeriod !== "annual") {
    throw new Error("invalid grading_period");
  }
  if (
    status !== "" &&
    status !== "incomplete" &&
    status !== "no_eligibility"
  ) {
    throw new Error("invalid status");
  }

  const admin = createAdminClient();
  await ensureCanEditOffering(admin, offeringId);

  if (status === "") {
    // Clear: numeric grade is computed on the fly, so deleting the row is
    // safe — the next render re-derives the grade from `scores`.
    const { error } = await admin
      .from("grades")
      .delete()
      .eq("student_id", studentId)
      .eq("offering_id", offeringId)
      .eq("grading_period", gradingPeriod);
    if (error) throw new Error(error.message);
    revalidatePath("/setup/score-structure");
    return;
  }

  // Set ร or มส. The grades CHECK constraint allows a row with grade=NULL
  // + pass_fail=NULL when is_incomplete or is_no_eligibility is TRUE.
  const { error } = await admin.from("grades").upsert(
    {
      student_id: studentId,
      offering_id: offeringId,
      grading_period: gradingPeriod,
      grade: null,
      pass_fail: null,
      total_score: null,
      is_incomplete: status === "incomplete",
      is_no_eligibility: status === "no_eligibility",
    },
    { onConflict: "student_id,offering_id,grading_period" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/setup/score-structure");
}

/**
 * Bulk-mark every enrolled student in a classroom as "ผ่าน" for one semester
 * of an activity subject, or clear them all (depending on `set_pass`).
 *
 * Use case: ครูทั้งห้องผ่านวันนี้ → click "ผ่านทั้งห้อง" → all rows become 'pass'.
 * Click again (button toggles to "ล้างทั้งห้อง") → delete all rows for this
 * offering+period.
 *
 * Mirrors the attendance `setAllForDay` pattern (same shape, different table).
 */
export async function setAllPassFail(formData: FormData): Promise<void> {
  await requireWriteAccess();
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const offeringId = String(formData.get("offering_id") ?? "").trim();
  const setPass = formData.get("set_pass") === "true";

  if (!classroomId || !offeringId) {
    throw new Error("missing classroom/offering");
  }

  const admin = createAdminClient();
  await ensureCanEditOffering(admin, offeringId);
  await ensureOfferingSemesterEditable(admin, offeringId);

  // Fetch all enrolled students for this classroom
  const { data: enrolls, error: enrollErr } = await admin
    .from("enrollments")
    .select("student_id")
    .eq("classroom_id", classroomId);
  if (enrollErr) throw new Error(enrollErr.message);

  const studentIds = (enrolls ?? []).map((e) => e.student_id);
  if (studentIds.length === 0) {
    revalidatePath("/setup/score-structure");
    return;
  }

  if (!setPass) {
    // Clear all rows for this offering+semester period
    const { error } = await admin
      .from("grades")
      .delete()
      .eq("offering_id", offeringId)
      .eq("grading_period", "semester")
      .in("student_id", studentIds);
    if (error) throw new Error(error.message);
  } else {
    // Set every student → 'pass'
    const rows = studentIds.map((sid) => ({
      student_id: sid,
      offering_id: offeringId,
      grading_period: "semester" as const,
      pass_fail: "pass" as const,
      grade: null,
      total_score: null,
      is_incomplete: false,
      is_no_eligibility: false,
    }));
    const { error } = await admin
      .from("grades")
      .upsert(rows, { onConflict: "student_id,offering_id,grading_period" });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/setup/score-structure");
}

// NOTE: numeric grades are NOT persisted to `grades` table.
// They are computed on-the-fly in `summary-section.tsx` from the `scores`
// table at view time, and (in Phase 3) at PDF print time. Source of truth
// stays a single place — the raw `scores` rows.
//
// `grades` table is reserved for:
//   - `pass_fail` results for activity subjects (saved per-semester above)
//   - is_incomplete (ร), is_no_eligibility (มส), manual_override (Phase 2+)
