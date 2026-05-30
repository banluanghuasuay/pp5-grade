"use server";

import { createAdminClient } from "@pp5/database/admin";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";
import { ensureSemesterEditable } from "@/lib/current-term";
import {
  ensureCanEditAsHomeroom,
  ensureCanEvaluateStudent,
} from "@/lib/teacher-scope";

async function ensureAdmin(): Promise<void> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    throw new Error("ไม่มีสิทธิ์");
  }
}

/** Default 8 สพฐ. items used by the seed button. Order matches the schema seed. */
const OBEC_DEFAULTS = [
  "รักชาติ ศาสน์ กษัตริย์",
  "ซื่อสัตย์สุจริต",
  "มีวินัย",
  "ใฝ่เรียนรู้",
  "อยู่อย่างพอเพียง",
  "มุ่งมั่นในการทำงาน",
  "รักความเป็นไทย",
  "มีจิตสาธารณะ",
];

// =====================================================================
// Tab 1 — manage characteristics (global table, no semester lock)
// =====================================================================

/**
 * Insert a new characteristic at the bottom of the list. Sort order is the
 * current max + 1 so the new row appears last.
 */
export async function createCharacteristic(formData: FormData): Promise<void> {
  await ensureAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("กรุณากรอกชื่อหัวข้อ");
  if (name.length > 255) throw new Error("ชื่อหัวข้อยาวเกิน");

  const admin = createAdminClient();

  // Find current max sort_order among active rows
  const { data: maxRow } = await admin
    .from("characteristics")
    .select("sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { error } = await admin.from("characteristics").insert({
    name,
    sort_order: nextOrder,
    source: "school",
    is_active: true,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/setup/characteristics");
}

/** Rename an existing characteristic. */
export async function updateCharacteristicName(
  formData: FormData,
): Promise<void> {
  await ensureAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id) throw new Error("missing id");
  if (!name) throw new Error("กรุณากรอกชื่อหัวข้อ");

  const admin = createAdminClient();
  const { error } = await admin
    .from("characteristics")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/setup/characteristics");
}

/**
 * Soft-delete a characteristic — flips `is_active` to false instead of
 * removing the row, so historical evaluations stay linked.
 */
export async function deactivateCharacteristic(
  formData: FormData,
): Promise<void> {
  await ensureAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("missing id");

  const admin = createAdminClient();
  const { error } = await admin
    .from("characteristics")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/setup/characteristics");
}

/** Move a row up or down one position by swapping sort_order with its neighbor. */
export async function moveCharacteristic(formData: FormData): Promise<void> {
  await ensureAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();
  if (!id) throw new Error("missing id");
  if (direction !== "up" && direction !== "down") {
    throw new Error("invalid direction");
  }

  const admin = createAdminClient();

  // 1. Fetch the row being moved
  const { data: me } = await admin
    .from("characteristics")
    .select("id, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (!me) throw new Error("ไม่พบหัวข้อ");

  // 2. Find the neighbor to swap with — the closest active sibling in the
  //    requested direction. We use is_active=true so soft-deleted rows
  //    don't trap reordering.
  const query = admin
    .from("characteristics")
    .select("id, sort_order")
    .eq("is_active", true);

  const { data: neighbor } =
    direction === "up"
      ? await query
          .lt("sort_order", me.sort_order)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle()
      : await query
          .gt("sort_order", me.sort_order)
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();

  if (!neighbor) {
    // Already at the edge — silently no-op
    revalidatePath("/setup/characteristics");
    return;
  }

  // 3. Swap their sort_order values.
  //    Two-step swap via temporary value avoids the UNIQUE-implied conflict
  //    (sort_order isn't unique in schema, but a partial index could be
  //    added later — this keeps it future-proof).
  const tempOrder = -1 * Date.now(); // guaranteed unique sentinel
  await admin
    .from("characteristics")
    .update({ sort_order: tempOrder })
    .eq("id", me.id);
  await admin
    .from("characteristics")
    .update({ sort_order: me.sort_order })
    .eq("id", neighbor.id);
  await admin
    .from("characteristics")
    .update({ sort_order: neighbor.sort_order })
    .eq("id", me.id);

  revalidatePath("/setup/characteristics");
}

/**
 * Seed the 8 default สพฐ. characteristics. Idempotent: skips items whose
 * name already exists (regardless of is_active state), so calling twice
 * doesn't duplicate.
 */
export async function seedObecCharacteristics(): Promise<void> {
  await ensureAdmin();

  const admin = createAdminClient();

  // Get existing names
  const { data: existing } = await admin
    .from("characteristics")
    .select("name");
  const existingNames = new Set((existing ?? []).map((c) => c.name));

  // Find current max sort_order
  const { data: maxRow } = await admin
    .from("characteristics")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const toInsert: Array<{
    name: string;
    sort_order: number;
    source: string;
    is_active: boolean;
  }> = [];
  for (const name of OBEC_DEFAULTS) {
    if (existingNames.has(name)) continue;
    toInsert.push({
      name,
      sort_order: nextOrder++,
      source: "obec",
      is_active: true,
    });
  }

  if (toInsert.length === 0) {
    // Nothing new — also re-activate any soft-deleted obec items
    await admin
      .from("characteristics")
      .update({ is_active: true })
      .in("name", OBEC_DEFAULTS)
      .eq("is_active", false);
    revalidatePath("/setup/characteristics");
    return;
  }

  const { error } = await admin.from("characteristics").insert(toInsert);
  if (error) throw new Error(error.message);

  // Also re-activate any obec items that were soft-deleted
  await admin
    .from("characteristics")
    .update({ is_active: true })
    .in("name", OBEC_DEFAULTS)
    .eq("is_active", false);

  revalidatePath("/setup/characteristics");
}

// =====================================================================
// Tab 2 — characteristic evaluations (per student × characteristic × term)
// =====================================================================

/**
 * Save a single student's score (0-3) for one characteristic in the current
 * academic year + semester. Empty string → DELETE the row.
 */
export async function saveCharacteristicScore(
  formData: FormData,
): Promise<void> {
  const studentId = String(formData.get("student_id") ?? "").trim();
  const characteristicId = String(
    formData.get("characteristic_id") ?? "",
  ).trim();
  const yearId = String(formData.get("year_id") ?? "").trim();
  const semRaw = String(formData.get("semester") ?? "").trim();
  const valueRaw = String(formData.get("score") ?? "").trim();

  if (!studentId || !characteristicId || !yearId) {
    throw new Error("missing student/characteristic/year");
  }

  // Teacher must be homeroom of the student's classroom (admin bypasses).
  const adminClient = createAdminClient();
  await ensureCanEvaluateStudent(adminClient, studentId, yearId);
  // Accept "0" (annual scope for primary) | "1" | "2" (per-semester for
  // secondary). Default any other input to 1 with a hard fail rather than
  // silently fall through to a wrong row.
  if (semRaw !== "0" && semRaw !== "1" && semRaw !== "2") {
    throw new Error("invalid semester");
  }
  const semester: 0 | 1 | 2 =
    semRaw === "0" ? 0 : semRaw === "2" ? 2 : 1;

  // Phase 2.6 lock — only the current semester is editable.
  // semester=0 (annual / primary) is always editable when a year is active.
  await ensureSemesterEditable(semester);

  const admin = createAdminClient();

  if (valueRaw === "") {
    // Clear the score
    const { error } = await admin
      .from("characteristic_evaluations")
      .delete()
      .eq("student_id", studentId)
      .eq("characteristic_id", characteristicId)
      .eq("academic_year_id", yearId)
      .eq("semester", semester);
    if (error) throw new Error(error.message);
    revalidatePath("/setup/characteristics");
    return;
  }

  const score = Number.parseInt(valueRaw, 10);
  if (!Number.isFinite(score) || score < 0 || score > 3) {
    throw new Error("invalid score (0-3)");
  }

  const { error } = await admin.from("characteristic_evaluations").upsert(
    {
      student_id: studentId,
      characteristic_id: characteristicId,
      academic_year_id: yearId,
      semester,
      score,
      evaluated_by: null,
    },
    { onConflict: "student_id,academic_year_id,semester,characteristic_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/setup/characteristics");
}

/**
 * Bulk set ONE characteristic column for ALL enrolled students in a classroom.
 *
 * Toggle pattern: if value == "" → DELETE every row for this column in this
 * classroom; otherwise UPSERT all students with the given score.
 *
 * UI calls this when admin clicks "ทุกคน 3" / "ล้าง" on a column header.
 */
export async function setAllCharacteristicForColumn(
  formData: FormData,
): Promise<void> {
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const characteristicId = String(
    formData.get("characteristic_id") ?? "",
  ).trim();
  const yearId = String(formData.get("year_id") ?? "").trim();
  const semRaw = String(formData.get("semester") ?? "").trim();
  const valueRaw = String(formData.get("value") ?? "").trim();

  // Teacher must be homeroom of the classroom (admin bypasses).
  const adminClient = createAdminClient();
  await ensureCanEditAsHomeroom(adminClient, classroomId);

  if (!classroomId || !characteristicId || !yearId) {
    throw new Error("missing classroom/characteristic/year");
  }
  if (semRaw !== "0" && semRaw !== "1" && semRaw !== "2") {
    throw new Error("invalid semester");
  }
  const semester: 0 | 1 | 2 =
    semRaw === "0" ? 0 : semRaw === "2" ? 2 : 1;
  await ensureSemesterEditable(semester);

  const admin = createAdminClient();

  // Fetch enrolled students in this classroom — scoped to the SAME
  // semester we're about to evaluate. Primary classrooms have one
  // enrollment row per student at semester=0; secondary classrooms have
  // separate rows for semester=1 and semester=2. Without this filter,
  // secondary upserts would receive each student_id twice and Postgres
  // would throw "ON CONFLICT DO UPDATE command cannot affect row a
  // second time".
  const { data: enrolls, error: enrollErr } = await admin
    .from("enrollments")
    .select("student_id")
    .eq("classroom_id", classroomId)
    .eq("semester", semester);
  if (enrollErr) throw new Error(enrollErr.message);

  // Defensive dedupe — guarantees we never send duplicate keys even if
  // some classroom somehow has duplicate enrollment rows (the UNIQUE
  // constraint should prevent this, but a Set() costs nothing).
  const studentIds = Array.from(
    new Set((enrolls ?? []).map((e) => e.student_id)),
  );
  if (studentIds.length === 0) {
    revalidatePath("/setup/characteristics");
    return;
  }

  if (valueRaw === "") {
    // Clear this column for everyone
    const { error } = await admin
      .from("characteristic_evaluations")
      .delete()
      .eq("academic_year_id", yearId)
      .eq("semester", semester)
      .eq("characteristic_id", characteristicId)
      .in("student_id", studentIds);
    if (error) throw new Error(error.message);
    revalidatePath("/setup/characteristics");
    return;
  }

  const score = Number.parseInt(valueRaw, 10);
  if (!Number.isFinite(score) || score < 0 || score > 3) {
    throw new Error("invalid score (0-3)");
  }

  const rows = studentIds.map((sid) => ({
    student_id: sid,
    characteristic_id: characteristicId,
    academic_year_id: yearId,
    semester,
    score,
    evaluated_by: null,
  }));

  const { error } = await admin
    .from("characteristic_evaluations")
    .upsert(rows, {
      onConflict: "student_id,academic_year_id,semester,characteristic_id",
    });
  if (error) throw new Error(error.message);

  revalidatePath("/setup/characteristics");
}
