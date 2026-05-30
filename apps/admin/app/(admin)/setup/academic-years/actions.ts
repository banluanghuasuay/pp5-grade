"use server";

import { createClient } from "@pp5/database/server";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AcademicYearFormState = {
  error: string | null;
  fieldErrors?: {
    year_be?: string;
    start_date?: string;
    end_date?: string;
  };
};

const MIN_BE = 2550;
const MAX_BE = 2650;

type ParsedYearValues = {
  year_be: number;
  is_current: boolean;
  current_semester: 1 | 2;
  start_date: string | null;
  end_date: string | null;
};

/**
 * Parse + validate form data shared by create and update flows.
 * Returns either parsed values or a form-state with errors.
 */
function parseForm(
  formData: FormData,
):
  | { ok: true; values: ParsedYearValues }
  | { ok: false; state: AcademicYearFormState } {
  const yearBeStr = String(formData.get("year_be") ?? "").trim();
  const isCurrent = formData.get("is_current") === "on";
  // Phase 2.6 — coerce to 1 or 2; anything else defaults to 1
  const semRaw = String(formData.get("current_semester") ?? "1").trim();
  const currentSemester: 1 | 2 = semRaw === "2" ? 2 : 1;
  const startDate = String(formData.get("start_date") ?? "").trim() || null;
  const endDate = String(formData.get("end_date") ?? "").trim() || null;

  const yearBe = Number.parseInt(yearBeStr, 10);
  if (!Number.isFinite(yearBe) || yearBe < MIN_BE || yearBe > MAX_BE) {
    return {
      ok: false,
      state: {
        error: "ปีการศึกษาไม่ถูกต้อง",
        fieldErrors: {
          year_be: `กรอกปี พ.ศ. ระหว่าง ${MIN_BE}–${MAX_BE} (เช่น 2569)`,
        },
      },
    };
  }

  // start_date  = วันเริ่มภาคเรียนที่ 1
  // end_date    = วันเริ่มภาคเรียนที่ 2  (semantic change from "year end")
  // → ภาค 2 ต้องเริ่มหลังภาค 1
  if (startDate && endDate && startDate >= endDate) {
    return {
      ok: false,
      state: {
        error: "ช่วงวันไม่ถูกต้อง",
        fieldErrors: {
          end_date: "วันเริ่มภาคเรียนที่ 2 ต้องอยู่หลังวันเริ่มภาคเรียนที่ 1",
        },
      },
    };
  }

  return {
    ok: true,
    values: {
      year_be: yearBe,
      is_current: isCurrent,
      current_semester: currentSemester,
      start_date: startDate,
      end_date: endDate,
    },
  };
}

/** Defensive admin check — also enforced by RLS policy `years_admin_write`. */
async function ensureAdmin(): Promise<AcademicYearFormState | null> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    return { error: "ไม่มีสิทธิ์ในการดำเนินการ" };
  }
  return null;
}

export async function createAcademicYear(
  _prev: AcademicYearFormState,
  formData: FormData,
): Promise<AcademicYearFormState> {
  const guard = await ensureAdmin();
  if (guard) return guard;

  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;
  const { year_be, is_current, current_semester, start_date, end_date } =
    parsed.values;

  const supabase = await createClient();

  // If marking as current, unset the existing current year first
  // (DB has a partial unique index allowing only one is_current=TRUE row)
  if (is_current) {
    const { error: unsetError } = await supabase
      .from("academic_years")
      .update({ is_current: false })
      .eq("is_current", true);
    if (unsetError) {
      return { error: `ไม่สามารถยกเลิกปีปัจจุบันเดิม: ${unsetError.message}` };
    }
  }

  const { error: insertError } = await supabase
    .from("academic_years")
    .insert({ year_be, is_current, current_semester, start_date, end_date });

  if (insertError) {
    // Postgres unique violation code = 23505
    if (insertError.code === "23505") {
      return {
        error: `ปีการศึกษา ${year_be} มีอยู่แล้ว`,
        fieldErrors: { year_be: "ปีนี้ถูกใช้แล้ว" },
      };
    }
    return { error: `ไม่สามารถเพิ่มได้: ${insertError.message}` };
  }

  revalidatePath("/setup/academic-years");
  redirect("/setup/academic-years");
}

export async function updateAcademicYear(
  _prev: AcademicYearFormState,
  formData: FormData,
): Promise<AcademicYearFormState> {
  const guard = await ensureAdmin();
  if (guard) return guard;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ไม่พบ id ของปีการศึกษา" };

  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;
  const { year_be, is_current, current_semester, start_date, end_date } =
    parsed.values;

  const supabase = await createClient();

  // If marking as current, unset other current years (but not self)
  if (is_current) {
    const { error: unsetError } = await supabase
      .from("academic_years")
      .update({ is_current: false })
      .eq("is_current", true)
      .neq("id", id);
    if (unsetError) {
      return { error: `ไม่สามารถยกเลิกปีปัจจุบันเดิม: ${unsetError.message}` };
    }
  }

  const { error: updateError } = await supabase
    .from("academic_years")
    .update({ year_be, is_current, current_semester, start_date, end_date })
    .eq("id", id);

  if (updateError) {
    if (updateError.code === "23505") {
      return {
        error: `ปีการศึกษา ${year_be} มีอยู่แล้ว`,
        fieldErrors: { year_be: "ปีนี้ถูกใช้แล้ว" },
      };
    }
    return { error: `ไม่สามารถบันทึกได้: ${updateError.message}` };
  }

  revalidatePath("/setup/academic-years");
  redirect("/setup/academic-years");
}

/**
 * Delete an academic year. Blocked by DB FK constraints if a classroom or
 * holiday still references it (ON DELETE RESTRICT/NO ACTION). Cascades to
 * characteristic/reading_thinking/competency evaluations (rare for a year
 * the admin is trying to delete — but the confirm dialog warns the user).
 *
 * On FK violation, redirects to the list page with an `?error=` query param.
 * On other errors, throws.
 */
export async function deleteAcademicYear(formData: FormData) {
  const guard = await ensureAdmin();
  if (guard) throw new Error(guard.error ?? "ไม่มีสิทธิ์");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("missing id");

  // Force mode — wipe ALL dependent data (subjects · classrooms ·
  // holidays + their cascade chains: offerings, scores, attendance,
  // enrollments, ...). Use only for test years; production years
  // should be archived (no archive flow yet — TBD).
  const force = formData.get("force") === "true";

  const supabase = await createClient();

  if (force) {
    // Order matters for clean cascades:
    //   1. holidays — non-cascading FK, must clear first
    //   2. subjects — cascades study_plan_subjects + subject_offerings
    //      (offerings cascade score_categories → scores → subject_attendance)
    //   3. classrooms — cascades enrollments + homeroom_assignments +
    //      any remaining subject_offerings + attendance + announcements
    // The academic_year row itself then cascades the 3 eval tables.
    // User spec 2026-05-22: "ปีการศึกษาก็ลบไม่ได้ ระบบแจ้งว่ามีวิชาใน
    // ภาคเรียนนั้น".
    const [hRes, sRes, cRes] = await Promise.all([
      supabase.from("holidays").delete().eq("academic_year_id", id),
      supabase.from("subjects").delete().eq("academic_year_id", id),
      supabase.from("classrooms").delete().eq("academic_year_id", id),
    ]);
    for (const r of [hRes, sRes, cRes]) {
      if (r.error) {
        redirect(
          `/setup/academic-years?error=${encodeURIComponent(
            `เคลียร์ข้อมูลไม่สำเร็จ: ${r.error.message}`,
          )}`,
        );
      }
    }
  }

  const { error } = await supabase
    .from("academic_years")
    .delete()
    .eq("id", id);

  if (error) {
    // 23503 = foreign_key_violation — friendly redirect, not a hard error
    if (error.code === "23503") {
      const msg = force
        ? `ลบไม่ได้แม้จะเคลียร์ข้อมูลแล้ว — ${error.message}`
        : "ไม่สามารถลบได้ · มีห้องเรียนหรือข้อมูลอื่นที่ใช้ปีการศึกษานี้อยู่ — ใช้ ลบและเคลียร์ข้อมูล แทน";
      redirect(`/setup/academic-years?error=${encodeURIComponent(msg)}`);
    }
    throw new Error(error.message);
  }

  revalidatePath("/setup/academic-years");
  redirect("/setup/academic-years");
}

/**
 * Mark a specific academic year as the current one.
 * Unsets the existing current year first (DB has a partial unique index).
 *
 * On error, throws — the error boundary catches it. Happy path is silent.
 */
/**
 * Phase 2.6 — switch only the working semester (1↔2) of the year that's
 * already flagged is_current. Used by the "เปลี่ยนภาคเรียน" button next to
 * the current-year badge.
 */
export async function setCurrentSemester(formData: FormData) {
  const guard = await ensureAdmin();
  if (guard) throw new Error(guard.error ?? "ไม่มีสิทธิ์");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("missing id");

  const semRaw = String(formData.get("current_semester") ?? "").trim();
  if (semRaw !== "1" && semRaw !== "2") throw new Error("invalid semester");

  const supabase = await createClient();
  const { error } = await supabase
    .from("academic_years")
    .update({ current_semester: semRaw === "2" ? 2 : 1 })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/setup/academic-years");
  // Also revalidate pages that read the current semester
  revalidatePath("/setup/students");
  revalidatePath("/setup/score-structure");
  revalidatePath("/setup/attendance");
}

export async function setCurrentAcademicYear(formData: FormData) {
  const guard = await ensureAdmin();
  if (guard) throw new Error(guard.error ?? "ไม่มีสิทธิ์");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("missing id");

  // Phase 2.6 — semester comes from the dialog the admin filled out. Default
  // to 1 if missing (defensive — UI always sends "1" or "2").
  const semRaw = String(formData.get("current_semester") ?? "1").trim();
  const currentSemester: 1 | 2 = semRaw === "2" ? 2 : 1;

  const supabase = await createClient();

  // Unset any existing current year
  const { error: unsetError } = await supabase
    .from("academic_years")
    .update({ is_current: false })
    .eq("is_current", true);
  if (unsetError) throw new Error(unsetError.message);

  // Set the new current year + the chosen working semester in one update
  const { error: setError } = await supabase
    .from("academic_years")
    .update({ is_current: true, current_semester: currentSemester })
    .eq("id", id);
  if (setError) throw new Error(setError.message);

  revalidatePath("/setup/academic-years");
}
