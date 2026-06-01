"use server";

import { createAdminClient } from "@pp5/database/admin";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// =====================================================================
// Plan-related helpers
// =====================================================================

/**
 * Ensure a default study plan ("ทั่วไป") exists for the given grade.
 *
 * Called on page load so admins never face a "no plans" empty state.
 * Idempotent — safe to call repeatedly.
 *
 * Returns the resolved default plan id (or null if creation failed).
 */
export async function ensureDefaultPlan(
  gradeLevelId: string,
): Promise<string | null> {
  const admin = createAdminClient();

  // Already has plans? Pick the default one (or first) and bail out.
  const { data: existing } = await admin
    .from("study_plans")
    .select("id, is_default")
    .eq("grade_level_id", gradeLevelId);

  if (existing && existing.length > 0) {
    return (
      existing.find((p) => p.is_default)?.id ?? existing[0]?.id ?? null
    );
  }

  // Create "ทั่วไป" as the default
  const { data: created, error } = await admin
    .from("study_plans")
    .insert({
      grade_level_id: gradeLevelId,
      name: "ทั่วไป",
      is_default: true,
    })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}

/**
 * Backfill: any classroom in this grade+year without a study_plan_id gets
 * linked to the default plan. Idempotent.
 *
 * Matches the design doc rule: "ห้องเปิดใหม่ → ผูกกับ 'ทั่วไป' อัตโนมัติ".
 */
export async function ensureRoomsLinked(
  gradeLevelId: string,
  academicYearId: string,
  defaultPlanId: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("classrooms")
    .update({ study_plan_id: defaultPlanId })
    .eq("grade_level_id", gradeLevelId)
    .eq("academic_year_id", academicYearId)
    .is("study_plan_id", null);
}

// =====================================================================
// Plan CRUD
// =====================================================================

export type PlanFormState = {
  error: string | null;
  fieldErrors?: {
    name?: string;
    grade_level_id?: string;
  };
};

type ParsedPlan = {
  grade_level_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
};

function parsePlanForm(formData: FormData):
  | { ok: true; values: ParsedPlan }
  | { ok: false; state: PlanFormState } {
  const grade_level_id = String(formData.get("grade_level_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const is_default = formData.get("is_default") === "on";

  const fieldErrors: PlanFormState["fieldErrors"] = {};

  if (!grade_level_id) fieldErrors.grade_level_id = "ขาดระดับชั้น";
  if (!name) fieldErrors.name = "กรุณากรอกชื่อแผน";
  else if (name.length > 100) fieldErrors.name = "ชื่อแผนยาวเกินไป (≤100)";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, state: { error: "ข้อมูลไม่ถูกต้อง", fieldErrors } };
  }

  return {
    ok: true,
    values: { grade_level_id, name, description, is_default },
  };
}

async function ensureAdminPlan(): Promise<PlanFormState | null> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    return { error: "ไม่มีสิทธิ์ในการดำเนินการ" };
  }
  return null;
}

/** Create a study plan. Auto-unsets existing default if is_default=true. */
export async function createPlan(
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const guard = await ensureAdminPlan();
  if (guard) return guard;

  const parsed = parsePlanForm(formData);
  if (!parsed.ok) return parsed.state;
  const v = parsed.values;

  const admin = createAdminClient();

  if (v.is_default) {
    const { error: unsetError } = await admin
      .from("study_plans")
      .update({ is_default: false })
      .eq("grade_level_id", v.grade_level_id)
      .eq("is_default", true);
    if (unsetError) {
      return { error: `ไม่สามารถปรับ default เดิม: ${unsetError.message}` };
    }
  }

  const { data: created, error } = await admin
    .from("study_plans")
    .insert({
      grade_level_id: v.grade_level_id,
      name: v.name,
      description: v.description,
      is_default: v.is_default,
    })
    .select("id")
    .single();

  if (error || !created) {
    if (error?.code === "23505") {
      return {
        error: `แผน "${v.name}" มีอยู่แล้วในระดับชั้นนี้`,
        fieldErrors: { name: "ชื่อแผนนี้ถูกใช้แล้ว" },
      };
    }
    return { error: `ไม่สามารถสร้างแผน: ${error?.message ?? "unknown"}` };
  }

  revalidatePath("/setup/subjects");
  redirect(
    `/setup/subjects?grade=${v.grade_level_id}&plan=${created.id}`,
  );
}

/** Update a plan's name/description/default flag. Grade is immutable. */
export async function updatePlan(
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const guard = await ensureAdminPlan();
  if (guard) return guard;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ไม่พบ id ของแผน" };

  const parsed = parsePlanForm(formData);
  if (!parsed.ok) return parsed.state;
  const v = parsed.values;

  const admin = createAdminClient();

  if (v.is_default) {
    const { error: unsetError } = await admin
      .from("study_plans")
      .update({ is_default: false })
      .eq("grade_level_id", v.grade_level_id)
      .eq("is_default", true)
      .neq("id", id);
    if (unsetError) {
      return { error: `ไม่สามารถปรับ default เดิม: ${unsetError.message}` };
    }
  }

  const { error } = await admin
    .from("study_plans")
    .update({
      name: v.name,
      description: v.description,
      is_default: v.is_default,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        error: `แผน "${v.name}" มีอยู่แล้วในระดับชั้นนี้`,
        fieldErrors: { name: "ชื่อแผนนี้ถูกใช้แล้ว" },
      };
    }
    return { error: `ไม่สามารถบันทึก: ${error.message}` };
  }

  revalidatePath("/setup/subjects");
  redirect(`/setup/subjects?grade=${v.grade_level_id}&plan=${id}`);
}

/**
 * Pull subjects from one plan into another (same grade).
 *
 * Both source and target must belong to the same grade — subjects are
 * grade-specific, so cross-grade copy would link incompatible records.
 *
 * Duplicates are silently skipped (UNIQUE(study_plan_id, subject_id)).
 *
 * Use case: admin sets up "ทั่วไป" with 16 subjects, creates empty "EP",
 * then on EP plan view clicks "คัดลอก" → picks "ทั่วไป" → 16 subjects
 * appear in EP (subjects are shared records, not duplicated).
 */
export async function copyPlan(formData: FormData): Promise<void> {
  const guard = await ensureAdminPlan();
  if (guard) throw new Error(guard.error ?? "ไม่มีสิทธิ์");

  const sourceId = String(formData.get("source_id") ?? "").trim();
  const targetId = String(formData.get("target_id") ?? "").trim();
  if (!sourceId) throw new Error("missing source_id");
  if (!targetId) throw new Error("missing target_id");
  if (sourceId === targetId) throw new Error("ต้นทางและปลายทางต้องต่างกัน");

  const admin = createAdminClient();

  // Validate both plans exist + share a grade
  const { data: bothPlans, error: lookupErr } = await admin
    .from("study_plans")
    .select("id, grade_level_id")
    .in("id", [sourceId, targetId]);
  if (lookupErr) throw new Error(lookupErr.message);
  if (!bothPlans || bothPlans.length !== 2) {
    throw new Error("ไม่พบแผนต้นทาง/ปลายทาง");
  }
  if (bothPlans[0].grade_level_id !== bothPlans[1].grade_level_id) {
    throw new Error("ต้นทางและปลายทางต้องเป็นระดับชั้นเดียวกัน");
  }
  const gradeLevelId = bothPlans[0].grade_level_id;

  // Get source's subject links
  const { data: sourceLinks, error: linksErr } = await admin
    .from("study_plan_subjects")
    .select("subject_id, sort_order")
    .eq("study_plan_id", sourceId);
  if (linksErr) throw new Error(linksErr.message);

  if (!sourceLinks || sourceLinks.length === 0) {
    // Source is empty — nothing to copy. Bail out silently.
    revalidatePath("/setup/subjects");
    redirect(`/setup/subjects?grade=${gradeLevelId}&plan=${targetId}`);
  }

  // Skip subjects that target already has
  const { data: targetLinks } = await admin
    .from("study_plan_subjects")
    .select("subject_id")
    .eq("study_plan_id", targetId);
  const targetHas = new Set(targetLinks?.map((l) => l.subject_id) ?? []);
  const toInsert = sourceLinks
    .filter((l) => !targetHas.has(l.subject_id))
    .map((l) => ({
      study_plan_id: targetId,
      subject_id: l.subject_id,
      sort_order: l.sort_order,
    }));

  if (toInsert.length > 0) {
    const { error: insertErr } = await admin
      .from("study_plan_subjects")
      .insert(toInsert);
    if (insertErr) {
      throw new Error(`คัดลอกวิชาไม่สำเร็จ: ${insertErr.message}`);
    }
  }

  revalidatePath("/setup/subjects");
  redirect(`/setup/subjects?grade=${gradeLevelId}&plan=${targetId}`);
}

/**
 * Delete a plan. CASCADE removes study_plan_subjects links, but subjects
 * themselves stay (they're owned by grade, not by plan).
 *
 * If admin deletes the only plan in a grade, the next page load will
 * auto-recreate "ทั่วไป" via ensureDefaultPlan.
 */
export async function deletePlan(formData: FormData) {
  const guard = await ensureAdminPlan();
  if (guard) throw new Error(guard.error ?? "ไม่มีสิทธิ์");

  const id = String(formData.get("id") ?? "").trim();
  const gradeLevelId = String(formData.get("grade_level_id") ?? "").trim();
  if (!id || !gradeLevelId) throw new Error("missing id");

  const admin = createAdminClient();
  const { error } = await admin.from("study_plans").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/setup/subjects");
  redirect(`/setup/subjects?grade=${gradeLevelId}`);
}

// =====================================================================
// Subject form
// =====================================================================

export type SubjectFormState = {
  error: string | null;
  fieldErrors?: {
    code?: string;
    name_th?: string;
    grade_level_id?: string;
    learning_area_id?: string;
    credit_hours?: string;
    hours_per_year?: string;
  };
};

type Category = "core" | "additional" | "activity";
type GradingMode = "numeric" | "pass_fail";

type ParsedSubject = {
  code: string;
  name_th: string;
  learning_area_id: string | null;
  grade_level_id: string;
  category: Category;
  grading_mode: GradingMode;
  credit_hours: number | null;
  hours_per_year: number | null;
};

function parseForm(formData: FormData):
  | { ok: true; values: ParsedSubject }
  | { ok: false; state: SubjectFormState } {
  const code = String(formData.get("code") ?? "").trim();
  const name_th = String(formData.get("name_th") ?? "").trim();
  const learning_area_id =
    String(formData.get("learning_area_id") ?? "").trim() || null;
  const grade_level_id = String(formData.get("grade_level_id") ?? "").trim();
  const categoryStr = String(formData.get("category") ?? "").trim();
  const creditHoursStr = String(formData.get("credit_hours") ?? "").trim();
  const hoursPerYearStr = String(formData.get("hours_per_year") ?? "").trim();

  const fieldErrors: SubjectFormState["fieldErrors"] = {};

  if (!code) fieldErrors.code = "กรุณากรอกรหัสวิชา";
  else if (code.length > 20) fieldErrors.code = "ไม่เกิน 20 ตัว";

  if (!name_th) fieldErrors.name_th = "กรุณากรอกชื่อวิชา";

  if (!grade_level_id) fieldErrors.grade_level_id = "กรุณาเลือกระดับชั้น";

  if (!["core", "additional", "activity"].includes(categoryStr)) {
    return {
      ok: false,
      state: { error: "กรุณาเลือกประเภทวิชา", fieldErrors },
    };
  }
  const category = categoryStr as Category;

  // Enforce schema CHECK constraint: activity↔pass_fail, core/additional↔numeric
  const grading_mode: GradingMode =
    category === "activity" ? "pass_fail" : "numeric";

  // Hours-vs-credits — the form only renders ONE of these inputs based
  // on (grade_level.system, category). We just parse whichever was
  // submitted; the form decides which DB column applies:
  //   - secondary core/additional → credit_hours
  //   - primary  core/additional → hours_per_year (NEW per user spec
  //                                   2026-05-22 — primary doesn't use
  //                                   the หน่วยกิต concept)
  //   - any activity              → hours_per_year (sem-scoped label
  //                                   handled in the form)
  let credit_hours: number | null = null;
  let hours_per_year: number | null = null;

  if (creditHoursStr) {
    const n = Number.parseFloat(creditHoursStr);
    if (!Number.isFinite(n) || n < 0) {
      fieldErrors.credit_hours = "ค่าไม่ถูกต้อง";
    } else {
      credit_hours = n;
    }
  }
  if (hoursPerYearStr) {
    const n = Number.parseInt(hoursPerYearStr, 10);
    if (!Number.isFinite(n) || n < 0) {
      fieldErrors.hours_per_year = "ค่าไม่ถูกต้อง";
    } else {
      hours_per_year = n;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, state: { error: "ข้อมูลไม่ถูกต้อง", fieldErrors } };
  }

  return {
    ok: true,
    values: {
      code,
      name_th,
      learning_area_id,
      grade_level_id,
      category,
      grading_mode,
      credit_hours,
      hours_per_year,
    },
  };
}

async function ensureAdmin(): Promise<SubjectFormState | null> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    return { error: "ไม่มีสิทธิ์ในการดำเนินการ" };
  }
  return null;
}

/** Build the post-action redirect — preserve plan context when provided. */
function subjectListUrl(formData: FormData, gradeLevelId: string): string {
  const planId = String(formData.get("plan_id") ?? "").trim();
  return planId
    ? `/setup/subjects?grade=${gradeLevelId}&plan=${planId}`
    : `/setup/subjects?grade=${gradeLevelId}`;
}

export async function createSubject(
  _prev: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const guard = await ensureAdmin();
  if (guard) return guard;

  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;

  const admin = createAdminClient();

  // Subjects are scoped per (academic_year_id, semester). Resolve current year
  // + the grade's system to pick the right semester scope:
  //   primary   → semester=0 (year-wide)
  //   secondary → semester=academic_year.current_semester (1 or 2)
  const { data: currentYear } = await admin
    .from("academic_years")
    .select("id, current_semester")
    .eq("is_current", true)
    .maybeSingle();
  if (!currentYear) {
    return { error: "ยังไม่มีปีการศึกษาปัจจุบัน · ตั้งค่าที่ /setup/academic-years" };
  }
  const { data: gradeLevel } = await admin
    .from("grade_levels")
    .select("system")
    .eq("id", parsed.values.grade_level_id)
    .maybeSingle();
  const isSecondary = gradeLevel?.system === "secondary";
  const effectiveSemester: 0 | 1 | 2 = isSecondary
    ? currentYear.current_semester === 2
      ? 2
      : 1
    : 0;

  const { data: created, error } = await admin
    .from("subjects")
    .insert({
      ...parsed.values,
      is_active: true,
      academic_year_id: currentYear.id,
      semester: effectiveSemester,
    })
    .select("id")
    .single();

  if (error || !created) {
    if (error?.code === "23505") {
      // Code collision recovery — `deleteSubject` only UNLINKS subjects
      // from a plan (preserving the row so other plans keep working),
      // which can leave orphan rows that block re-creation with the
      // same code. Recover by re-using the existing row instead of
      // throwing a hard error. User spec 2026-05-22.
      //
      // 3 sub-cases (based on what links the existing subject has):
      //   a. already in CURRENT plan       → genuine duplicate · error
      //   b. linked to OTHER plans only    → don't overwrite shared
      //                                       fields · just link to here
      //   c. orphan (no plan links at all) → admin clearly intends a
      //                                       fresh subject · update
      //                                       fields with new form
      //                                       values + link to current
      const recovery = await recoverFromDuplicateCode({
        admin,
        code: parsed.values.code,
        yearId: currentYear.id,
        semester: effectiveSemester,
        planId: String(formData.get("plan_id") ?? "").trim(),
        values: parsed.values,
      });
      if (recovery.kind === "error") return recovery.state;
      if (recovery.kind === "success") {
        revalidatePath("/setup/subjects");
        redirect(subjectListUrl(formData, parsed.values.grade_level_id));
      }
    }
    return { error: `ไม่สามารถเพิ่มได้: ${error?.message ?? "unknown"}` };
  }

  // If created within a plan context, auto-link to that plan
  const planId = String(formData.get("plan_id") ?? "").trim();
  if (planId) {
    const { error: linkError } = await admin
      .from("study_plan_subjects")
      .insert({ study_plan_id: planId, subject_id: created.id });
    if (linkError) {
      // Best-effort: subject created but link failed. Surface error.
      return {
        error: `เพิ่มวิชาแล้ว แต่ผูกเข้าแผนไม่สำเร็จ: ${linkError.message}`,
      };
    }
  }

  revalidatePath("/setup/subjects");
  redirect(subjectListUrl(formData, parsed.values.grade_level_id));
}

/**
 * Handle the case where `createSubject` hit a UNIQUE violation on
 * `(code, academic_year_id, semester)`. See the call site for the
 * background; this helper decides one of:
 *   - duplicate in current plan → return error state (genuine dup)
 *   - linked to other plans     → silently link to current plan,
 *                                 leaving the shared subject row alone
 *   - orphan                    → admin's form values are taken as
 *                                 the source of truth: UPDATE the row
 *                                 then link to current plan
 * Returns "success" to mean the caller should revalidate + redirect.
 */
async function recoverFromDuplicateCode({
  admin,
  code,
  yearId,
  semester,
  planId,
  values,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any;
  code: string;
  yearId: string;
  semester: 0 | 1 | 2;
  planId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any;
}): Promise<
  | { kind: "success" }
  | { kind: "error"; state: SubjectFormState }
  | { kind: "fallthrough" }
> {
  const { data: existing } = await admin
    .from("subjects")
    .select("id")
    .eq("code", code)
    .eq("academic_year_id", yearId)
    .eq("semester", semester)
    .maybeSingle();

  if (!existing) {
    // Defensive: 23505 but no row found? Schema race or data inconsistency.
    return {
      kind: "error",
      state: {
        error: `รหัสวิชา "${code}" ถูกใช้แล้วในปีการศึกษานี้`,
        fieldErrors: { code: "รหัสนี้ถูกใช้แล้วในปีนี้" },
      },
    };
  }

  // Case (a) — already in current plan
  if (planId) {
    const { data: inThisPlan } = await admin
      .from("study_plan_subjects")
      .select("study_plan_id")
      .eq("study_plan_id", planId)
      .eq("subject_id", existing.id)
      .maybeSingle();
    if (inThisPlan) {
      return {
        kind: "error",
        state: {
          error: `วิชา "${code}" มีอยู่ในแผนนี้แล้ว`,
          fieldErrors: { code: "วิชานี้อยู่ในแผนนี้แล้ว" },
        },
      };
    }
  }

  // Decide between case (b) and (c) by counting other plan links.
  const { count: planLinkCount } = await admin
    .from("study_plan_subjects")
    .select("*", { count: "exact", head: true })
    .eq("subject_id", existing.id);

  // Case (c) — orphan: take admin's form values as the new content.
  if ((planLinkCount ?? 0) === 0) {
    const { error: updateError } = await admin
      .from("subjects")
      .update({ ...values, is_active: true })
      .eq("id", existing.id);
    if (updateError) {
      return {
        kind: "error",
        state: { error: `กู้คืนวิชาเดิมไม่สำเร็จ: ${updateError.message}` },
      };
    }
  }
  // Case (b) — leave the subject row alone so other plans aren't disturbed.

  // Link to current plan (cases b + c both want this).
  if (planId) {
    const { error: linkError } = await admin
      .from("study_plan_subjects")
      .insert({ study_plan_id: planId, subject_id: existing.id });
    if (linkError) {
      return {
        kind: "error",
        state: { error: `ผูกเข้าแผนไม่สำเร็จ: ${linkError.message}` },
      };
    }
  }

  return { kind: "success" };
}

export async function updateSubject(
  _prev: SubjectFormState,
  formData: FormData,
): Promise<SubjectFormState> {
  const guard = await ensureAdmin();
  if (guard) return guard;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ไม่พบ id ของวิชา" };

  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;

  const admin = createAdminClient();
  const { error } = await admin
    .from("subjects")
    .update(parsed.values)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        error: `รหัสวิชา "${parsed.values.code}" ถูกใช้แล้ว`,
        fieldErrors: { code: "รหัสนี้ถูกใช้แล้ว" },
      };
    }
    return { error: `ไม่สามารถบันทึก: ${error.message}` };
  }

  revalidatePath("/setup/subjects");
  redirect(subjectListUrl(formData, parsed.values.grade_level_id));
}

/**
 * Hard-delete a subject.
 *
 * CASCADE removes the subject from `study_plan_subjects` everywhere it's
 * linked, plus any `subject_offerings` and downstream `scores`. Confirm
 * dialog in the UI must warn about scope.
 */
/**
 * "ลบวิชา" from a plan — REMOVES the plan-subject link only, **does not
 * delete** the underlying `subjects` row. Each plan's subject list is now
 * independent: removing from plan A doesn't affect plan B even if both
 * link to the same subject record.
 *
 * If `plan_id` is missing, falls back to removing the subject entirely
 * (legacy callers). Normal UI flow always passes `plan_id`.
 */
export async function deleteSubject(formData: FormData) {
  const guard = await ensureAdmin();
  if (guard) throw new Error(guard.error ?? "ไม่มีสิทธิ์");

  const id = String(formData.get("id") ?? "").trim();
  const gradeLevelId = String(formData.get("grade_level_id") ?? "").trim();
  const planId = String(formData.get("plan_id") ?? "").trim();
  if (!id) throw new Error("missing id");

  const admin = createAdminClient();

  if (planId) {
    // Unlink only — subject record stays alive (could be linked from other
    // plans, or available for re-link later).
    const { error } = await admin
      .from("study_plan_subjects")
      .delete()
      .eq("study_plan_id", planId)
      .eq("subject_id", id);
    if (error) throw new Error(error.message);
  } else {
    // Legacy fallback: no plan context → delete the subject record entirely.
    const { error } = await admin.from("subjects").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/setup/subjects");
  if (gradeLevelId) redirect(subjectListUrl(formData, gradeLevelId));
}

// =====================================================================
// Clone subjects from the previous YEAR (matching semester for secondary)
//
//   Primary   → source = previous year, sem=0    (same year-wide scope)
//   Secondary → source = previous year, sem=N    (SAME semester as current)
//
// Why same semester for secondary: ภาค 1 และ ภาค 2 ของมัธยมเป็นคนละวิชา
// (เช่น "คณิต 1" ในภาค 1, "คณิต 2" ในภาค 2). ดึงจาก "ภาคเดียวกันของปีก่อน"
// เป็นการ propagate หลักสูตรเดิมไปปีใหม่.
//
// Flow:
//   1. Client calls `getCloneSubjectsPreview(gradeLevelId)` to get the
//      list of source subjects + which codes already exist in target.
//   2. Admin ticks the ones they want.
//   3. Client calls `commitCloneSubjects(gradeLevelId, subjectIds)`.
// =====================================================================

/**
 * For each source subject we render one of three states in the preview:
 *   - "new"     → no subject with this code exists in target year/sem
 *                 → insert a fresh row + link to the current plan
 *   - "relink"  → subject already exists in target year/sem (some other plan
 *                 may use it), but NOT in the current plan
 *                 → just add the link (no duplicate insert)
 *   - "in_plan" → already in the current plan → nothing to do (disabled)
 */
export type CloneSubjectStatus = "new" | "relink" | "in_plan";

export type CloneSubjectRow = {
  id: string;
  code: string;
  name_th: string;
  category: "core" | "additional" | "activity";
  credit_hours: number | null;
  hours_per_year: number | null;
  status: CloneSubjectStatus;
  /** Existing target subject id when status !== "new". */
  existingTargetId: string | null;
  learning_area_sort: number;
};

export type CloneSubjectsPreview =
  | {
      ok: true;
      sourceLabel: string;
      targetLabel: string;
      subjects: CloneSubjectRow[];
    }
  | { ok: false; error: string };

async function resolveCloneScope(gradeLevelId: string): Promise<
  | {
      ok: true;
      currentYearId: string;
      currentYearBe: number;
      sourceYearId: string;
      sourceYearBe: number;
      sourceSemester: 0 | 1 | 2;
      targetSemester: 0 | 1 | 2;
      isSecondary: boolean;
    }
  | { ok: false; error: string }
> {
  const admin = createAdminClient();

  const { data: currentYear } = await admin
    .from("academic_years")
    .select("id, year_be, current_semester")
    .eq("is_current", true)
    .maybeSingle();
  if (!currentYear) {
    return { ok: false, error: "ยังไม่มีปีการศึกษาปัจจุบัน" };
  }
  const currentSemester: 1 | 2 = currentYear.current_semester === 2 ? 2 : 1;

  const { data: gradeLevel } = await admin
    .from("grade_levels")
    .select("system")
    .eq("id", gradeLevelId)
    .maybeSingle();
  const isSecondary = gradeLevel?.system === "secondary";
  const targetSemester: 0 | 1 | 2 = isSecondary ? currentSemester : 0;

  const { data: prevYear } = await admin
    .from("academic_years")
    .select("id, year_be")
    .eq("year_be", currentYear.year_be - 1)
    .maybeSingle();
  if (!prevYear) {
    return {
      ok: false,
      error: `ไม่พบปีการศึกษา ${currentYear.year_be - 1} — สร้างปีนั้นก่อน`,
    };
  }
  const sourceSemester: 0 | 1 | 2 = isSecondary ? currentSemester : 0;

  return {
    ok: true,
    currentYearId: currentYear.id,
    currentYearBe: currentYear.year_be,
    sourceYearId: prevYear.id,
    sourceYearBe: prevYear.year_be,
    sourceSemester,
    targetSemester,
    isSecondary,
  };
}

export async function getCloneSubjectsPreview(
  gradeLevelId: string,
  planId: string,
  /** Source plan to pull from. Source plans are the same per-grade as
   *  target plans (study_plans is not year-scoped). */
  sourcePlanId: string,
): Promise<CloneSubjectsPreview> {
  const guard = await ensureAdmin();
  if (guard) return { ok: false, error: guard.error ?? "ไม่มีสิทธิ์" };
  if (!gradeLevelId)
    return { ok: false, error: "missing grade_level_id" };
  if (!planId) return { ok: false, error: "missing plan_id" };
  if (!sourcePlanId)
    return { ok: false, error: "missing source plan" };

  const scope = await resolveCloneScope(gradeLevelId);
  if (!scope.ok) return scope;

  const admin = createAdminClient();
  // Source subjects must be:
  //   - within the source (grade × year × semester)
  //   - linked to the chosen source plan (study_plan_subjects)
  // We do an inner join via PostgREST: include `study_plan_subjects` and
  // filter on its `study_plan_id` to enforce membership.
  const { data: sourceSubjectsRaw } = await admin
    .from("subjects")
    .select(
      `
      id, code, name_th, category, credit_hours, hours_per_year,
      learning_area:learning_areas!learning_area_id (sort_order),
      study_plan_subjects!inner ( study_plan_id )
    `,
    )
    .eq("grade_level_id", gradeLevelId)
    .eq("academic_year_id", scope.sourceYearId)
    .eq("semester", scope.sourceSemester)
    .eq("study_plan_subjects.study_plan_id", sourcePlanId);
  const sourceSubjects = sourceSubjectsRaw ?? [];

  const sourceLabel = scope.isSecondary
    ? `${scope.sourceYearBe} ภาคเรียนที่ ${scope.sourceSemester}`
    : `${scope.sourceYearBe}`;
  const targetLabel = scope.isSecondary
    ? `${scope.currentYearBe} ภาคเรียนที่ ${scope.targetSemester}`
    : `${scope.currentYearBe}`;

  if (!sourceSubjects || sourceSubjects.length === 0) {
    return { ok: true, sourceLabel, targetLabel, subjects: [] };
  }

  // 1) Find subjects in target year/sem (any plan) keyed by code → id
  const codes = sourceSubjects.map((s) => s.code);
  const { data: existingTargetRows } = await admin
    .from("subjects")
    .select("id, code")
    .eq("academic_year_id", scope.currentYearId)
    .eq("semester", scope.targetSemester)
    .in("code", codes);
  const existingTargetByCode = new Map<string, string>();
  for (const row of existingTargetRows ?? []) {
    existingTargetByCode.set(row.code, row.id);
  }

  // 2) Find which of those target subjects are already linked to the
  //    current plan → set of subject_id
  let linkedSubjectIds = new Set<string>();
  if (existingTargetByCode.size > 0) {
    const { data: linkedRows } = await admin
      .from("study_plan_subjects")
      .select("subject_id")
      .eq("study_plan_id", planId)
      .in("subject_id", Array.from(existingTargetByCode.values()));
    linkedSubjectIds = new Set(
      (linkedRows ?? []).map((r) => r.subject_id),
    );
  }

  // 3) Compute status per source subject
  const CATEGORY_ORDER: Record<string, number> = {
    core: 1,
    additional: 2,
    activity: 3,
  };
  const rows: CloneSubjectRow[] = sourceSubjects
    .map((s) => {
      const targetId = existingTargetByCode.get(s.code) ?? null;
      let status: CloneSubjectStatus;
      if (!targetId) status = "new";
      else if (linkedSubjectIds.has(targetId)) status = "in_plan";
      else status = "relink";
      return {
        id: s.id,
        code: s.code,
        name_th: s.name_th,
        category: s.category,
        credit_hours: s.credit_hours,
        hours_per_year: s.hours_per_year,
        status,
        existingTargetId: targetId,
        learning_area_sort: s.learning_area?.sort_order ?? 999,
      };
    })
    .sort((a, b) => {
      const ac = CATEGORY_ORDER[a.category] ?? 99;
      const bc = CATEGORY_ORDER[b.category] ?? 99;
      if (ac !== bc) return ac - bc;
      if (a.learning_area_sort !== b.learning_area_sort)
        return a.learning_area_sort - b.learning_area_sort;
      return a.code.localeCompare(b.code, "th");
    });

  return { ok: true, sourceLabel, targetLabel, subjects: rows };
}

export async function commitCloneSubjects(
  gradeLevelId: string,
  planId: string,
  selectedSubjectIds: string[],
): Promise<
  | { ok: true; inserted: number; relinked: number }
  | { ok: false; error: string }
> {
  const guard = await ensureAdmin();
  if (guard) return { ok: false, error: guard.error ?? "ไม่มีสิทธิ์" };
  if (!gradeLevelId)
    return { ok: false, error: "missing grade_level_id" };
  if (!planId) return { ok: false, error: "missing plan_id" };
  if (selectedSubjectIds.length === 0)
    return { ok: false, error: "ไม่ได้เลือกวิชา" };

  const scope = await resolveCloneScope(gradeLevelId);
  if (!scope.ok) return scope;

  const admin = createAdminClient();

  // Fetch source subjects (defensive — filter again to scope)
  const { data: sourceSubjects } = await admin
    .from("subjects")
    .select(
      "id, code, name_th, learning_area_id, grade_level_id, category, grading_mode, credit_hours, hours_per_week, hours_per_year, is_active",
    )
    .in("id", selectedSubjectIds)
    .eq("grade_level_id", gradeLevelId)
    .eq("academic_year_id", scope.sourceYearId)
    .eq("semester", scope.sourceSemester);
  if (!sourceSubjects || sourceSubjects.length === 0) {
    return { ok: false, error: "ไม่พบวิชาที่เลือกในขอบเขตต้นทาง" };
  }

  // Map existing target subjects by code (any plan in target year/sem)
  const { data: existingTargetRows } = await admin
    .from("subjects")
    .select("id, code")
    .eq("academic_year_id", scope.currentYearId)
    .eq("semester", scope.targetSemester)
    .in("code", sourceSubjects.map((s) => s.code));
  const existingTargetByCode = new Map<string, string>();
  for (const row of existingTargetRows ?? []) {
    existingTargetByCode.set(row.code, row.id);
  }

  // Which of those target subjects are ALREADY linked to current plan?
  let linkedSubjectIds = new Set<string>();
  if (existingTargetByCode.size > 0) {
    const { data: linkedRows } = await admin
      .from("study_plan_subjects")
      .select("subject_id")
      .eq("study_plan_id", planId)
      .in("subject_id", Array.from(existingTargetByCode.values()));
    linkedSubjectIds = new Set(
      (linkedRows ?? []).map((r) => r.subject_id),
    );
  }

  let inserted = 0;
  let relinked = 0;
  /** subject_ids to add a link for (in current plan) at the end */
  const idsToLink: string[] = [];

  for (const s of sourceSubjects) {
    const targetId = existingTargetByCode.get(s.code);
    if (targetId) {
      // Already in plan? skip silently.
      if (linkedSubjectIds.has(targetId)) continue;
      // Subject exists in target but NOT in plan → re-link
      idsToLink.push(targetId);
      relinked++;
    } else {
      // Insert new subject row + queue link
      const { data: created, error } = await admin
        .from("subjects")
        .insert({
          code: s.code,
          name_th: s.name_th,
          learning_area_id: s.learning_area_id,
          grade_level_id: s.grade_level_id,
          category: s.category,
          grading_mode: s.grading_mode,
          credit_hours: s.credit_hours,
          hours_per_week: s.hours_per_week,
          hours_per_year: s.hours_per_year,
          is_active: s.is_active ?? true,
          academic_year_id: scope.currentYearId,
          semester: scope.targetSemester,
        })
        .select("id")
        .single();
      if (!error && created) {
        idsToLink.push(created.id);
        inserted++;
      }
    }
  }

  // Single bulk insert of study_plan_subjects links
  if (idsToLink.length > 0) {
    const newLinks = idsToLink.map((subjectId) => ({
      study_plan_id: planId,
      subject_id: subjectId,
    }));
    await admin.from("study_plan_subjects").insert(newLinks);
  }

  revalidatePath("/setup/subjects");
  return { ok: true, inserted, relinked };
}

/**
 * Toggle a subject's `is_active` flag (soft delete / reactivate).
 * Kept for legacy compatibility — new UI uses hard delete instead.
 */
export async function toggleSubjectActive(formData: FormData) {
  const guard = await ensureAdmin();
  if (guard) throw new Error(guard.error ?? "ไม่มีสิทธิ์");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("missing id");

  const setActive = formData.get("set_active") === "true";

  const admin = createAdminClient();
  const { error } = await admin
    .from("subjects")
    .update({ is_active: setActive })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/setup/subjects");
}
