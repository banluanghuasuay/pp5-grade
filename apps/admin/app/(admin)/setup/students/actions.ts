"use server";

import { createAdminClient } from "@pp5/database/admin";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const STUDENT_DOMAIN = "student.pp5.local";

/** Default password for every new student (single-add + Excel import).
 *  Students change it themselves later in the student app. User spec 2026-06-05. */
const DEFAULT_STUDENT_PASSWORD = "123456";

export type StudentFormState = {
  error: string | null;
  fieldErrors?: {
    student_code?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    national_id?: string;
  };
};

type ParsedStudent = {
  student_code: string;
  password: string;
  title: string | null;
  first_name: string;
  last_name: string;
  gender: "male" | "female" | null;
  birth_date: string | null;
  national_id: string | null;
  classroom_id: string | null;
  /** 1 or 2 (only used when classroom is secondary). Primary always uses 0. */
  semester: 1 | 2;
};

function parseForm(formData: FormData, requirePassword: boolean):
  | { ok: true; values: ParsedStudent }
  | { ok: false; state: StudentFormState } {
  const student_code = String(formData.get("student_code") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const title = String(formData.get("title") ?? "").trim() || null;
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const genderStr = String(formData.get("gender") ?? "").trim();
  const gender =
    genderStr === "male" || genderStr === "female" ? genderStr : null;
  const birth_date = String(formData.get("birth_date") ?? "").trim() || null;
  const national_id = String(formData.get("national_id") ?? "").trim() || null;
  const classroom_id =
    String(formData.get("classroom_id") ?? "").trim() || null;
  const semesterRaw = String(formData.get("semester") ?? "1").trim();
  const semester: 1 | 2 = semesterRaw === "2" ? 2 : 1;

  const fieldErrors: StudentFormState["fieldErrors"] = {};

  if (!student_code) fieldErrors.student_code = "กรุณากรอกรหัสนักเรียน";
  else if (!/^[a-zA-Z0-9]{1,20}$/.test(student_code))
    fieldErrors.student_code = "ใช้ a-z, 0-9 เท่านั้น (สูงสุด 20 ตัว)";

  if (requirePassword) {
    if (!password) fieldErrors.password = "กรุณากรอกรหัสผ่าน";
    else if (password.length < 6) fieldErrors.password = "อย่างน้อย 6 ตัว";
  }

  if (!first_name) fieldErrors.first_name = "กรุณากรอกชื่อ";
  if (!last_name) fieldErrors.last_name = "กรุณากรอกนามสกุล";

  if (national_id && !/^\d{13}$/.test(national_id))
    fieldErrors.national_id = "ต้องเป็นเลข 13 หลัก";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, state: { error: "ข้อมูลไม่ถูกต้อง", fieldErrors } };
  }

  return {
    ok: true,
    values: {
      student_code,
      password,
      title,
      first_name,
      last_name,
      gender,
      birth_date,
      national_id,
      classroom_id,
      semester,
    },
  };
}

async function ensureAdmin(): Promise<StudentFormState | null> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    return { error: "ไม่มีสิทธิ์ในการดำเนินการ" };
  }
  return null;
}

/**
 * Manually re-number student_number for a single classroom × semester.
 * Used by the "เรียงเลขที่ใหม่" button on the students list page. Semester
 * scopes the renumbering: primary = 0 (year-wide), secondary = 1 or 2.
 */
export async function renumberClassroomById(
  classroomId: string,
  semester: 0 | 1 | 2 = 0,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    return { ok: false, error: "ไม่มีสิทธิ์ในการดำเนินการ" };
  }
  if (!classroomId) {
    return { ok: false, error: "ไม่ระบุห้องเรียน" };
  }
  const admin = createAdminClient();

  // Count enrolled rows in this (classroom, semester) for UI feedback
  const { count, error: countErr } = await admin
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("classroom_id", classroomId)
    .eq("semester", semester);
  if (countErr) {
    return { ok: false, error: countErr.message };
  }

  await renumberClassroom(admin, classroomId, semester);
  revalidatePath("/setup/students");
  return { ok: true, count: count ?? 0 };
}

/**
 * Re-number student_number sequentially (1, 2, 3, ...) in a classroom,
 * sorted by `student_code` ASC. Call after any enrollment add/remove/move.
 *
 * Uses a 2-phase update to avoid `UNIQUE(classroom_id, student_number)` conflicts:
 *   Phase 1: set every row to a negative temp number (-1, -2, ...)
 *   Phase 2: set to the desired final positive number
 *
 * Negative temps are guaranteed not to collide with existing positives or
 * each other, so each individual UPDATE is safe.
 *
 * Cost: 2N UPDATE queries per call. Fine for typical classroom sizes (<60).
 */
async function renumberClassroom(
  admin: ReturnType<typeof createAdminClient>,
  classroomId: string,
  semester: 0 | 1 | 2 = 0,
) {
  const { data: enrollments, error } = await admin
    .from("enrollments")
    .select("id, student:students!student_id (student_code)")
    .eq("classroom_id", classroomId)
    .eq("semester", semester);
  if (error || !enrollments) return;

  // Sort by student_code (Thai-aware compare so มศ vs Thai digits collate properly)
  const sorted = enrollments
    .filter((e) => e.student?.student_code)
    .sort((a, b) =>
      (a.student!.student_code).localeCompare(b.student!.student_code, "th"),
    );

  // Phase 1: temp negative values (guaranteed unique within classroom×semester)
  for (let i = 0; i < sorted.length; i++) {
    await admin
      .from("enrollments")
      .update({ student_number: -(i + 1) })
      .eq("id", sorted[i].id);
  }

  // Phase 2: desired final values
  for (let i = 0; i < sorted.length; i++) {
    await admin
      .from("enrollments")
      .update({ student_number: i + 1 })
      .eq("id", sorted[i].id);
  }
}

/**
 * Create a student. Coordinates up to 3 records:
 *   1. auth.users (via service-role admin API)
 *   2. public.students (with auth_user_id link)
 *   3. public.enrollments (only if a classroom is selected; auto student_number = max+1)
 *
 * Note: students table doesn't have a separate extension table (unlike teachers)
 * so this is 2-3 steps instead of 3.
 *
 * Cleanup on failure prevents orphan auth users / orphan students.
 */
export async function createStudent(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const guard = await ensureAdmin();
  if (guard) return guard;

  const parsed = parseForm(formData, false);
  if (!parsed.ok) return parsed.state;
  const v = parsed.values;

  const admin = createAdminClient();

  // Step 1: auth user
  const email = `${v.student_code}@${STUDENT_DOMAIN}`;
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: DEFAULT_STUDENT_PASSWORD,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "ไม่สามารถสร้างบัญชี auth";
    if (msg.toLowerCase().includes("already") || msg.includes("registered")) {
      return {
        error: `รหัสนักเรียน "${v.student_code}" ถูกใช้แล้ว`,
        fieldErrors: { student_code: "รหัสนี้ถูกใช้แล้ว" },
      };
    }
    return { error: msg };
  }

  const authUserId = authData.user.id;

  // Step 2: students
  const { data: studentRow, error: studentError } = await admin
    .from("students")
    .insert({
      auth_user_id: authUserId,
      student_code: v.student_code,
      title: v.title,
      first_name: v.first_name,
      last_name: v.last_name,
      gender: v.gender,
      birth_date: v.birth_date,
      national_id: v.national_id,
    })
    .select("id")
    .single();

  if (studentError || !studentRow) {
    // Cleanup orphan auth user
    await admin.auth.admin.deleteUser(authUserId);
    if (studentError?.code === "23505") {
      // Could be student_code or national_id — guess by message
      if (studentError.message.includes("national_id")) {
        return {
          error: "เลขประจำตัวประชาชนถูกใช้แล้ว",
          fieldErrors: { national_id: "เลขนี้ถูกใช้แล้ว" },
        };
      }
      return {
        error: `รหัสนักเรียน "${v.student_code}" ถูกใช้แล้ว`,
        fieldErrors: { student_code: "รหัสนี้ถูกใช้แล้ว" },
      };
    }
    return { error: studentError?.message ?? "ไม่สามารถสร้างข้อมูลนักเรียน" };
  }

  // Step 3: enrollment (only if classroom selected)
  if (v.classroom_id) {
    // Look up classroom's grade.system to pick the right semester scope:
    // primary → semester=0 (year-wide), secondary → semester=1|2 from form.
    const { data: classroomInfo } = await admin
      .from("classrooms")
      .select(`grade_level:grade_levels!grade_level_id (system)`)
      .eq("id", v.classroom_id)
      .maybeSingle();
    const effectiveSemester: 0 | 1 | 2 =
      classroomInfo?.grade_level?.system === "secondary" ? v.semester : 0;

    const { data: maxResult } = await admin
      .from("enrollments")
      .select("student_number")
      .eq("classroom_id", v.classroom_id)
      .eq("semester", effectiveSemester)
      .order("student_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNumber = (maxResult?.student_number ?? 0) + 1;

    const { error: enrollError } = await admin.from("enrollments").insert({
      student_id: studentRow.id,
      classroom_id: v.classroom_id,
      student_number: nextNumber,
      semester: effectiveSemester,
    });
    if (enrollError) {
      // Cleanup: delete student + auth user
      await admin.from("students").delete().eq("id", studentRow.id);
      await admin.auth.admin.deleteUser(authUserId);
      return { error: `ไม่สามารถลงทะเบียนเข้าห้อง: ${enrollError.message}` };
    }

    // Re-sort by student_code so the new student lands at the right position
    await renumberClassroom(admin, v.classroom_id, effectiveSemester);
  }

  revalidatePath("/setup/students");
  redirect("/setup/students");
}

export type ResetPasswordState = {
  error: string | null;
  success: boolean;
  fieldErrors?: { password?: string };
};

/**
 * Update student info + enrollment in current academic year.
 *
 * NOT updated here:
 * - student_code (locked — it's the auth identity)
 * - password (separate reset flow)
 *
 * Enrollment handling for the current academic year:
 * - If the form's classroom_id differs from existing → delete old + create new
 * - If form has no classroom (empty) but existing has one → just delete
 * - student_number is auto-assigned as max+1 in the target classroom
 * - Enrollments in OTHER years (past/future) are left untouched
 */
export async function updateStudent(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const guard = await ensureAdmin();
  if (guard) return guard;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ไม่พบ id ของนักเรียน" };

  const parsed = parseForm(formData, false); // password not required for edit
  if (!parsed.ok) return parsed.state;
  const v = parsed.values;

  const admin = createAdminClient();

  // Update students table
  const { error: studentError } = await admin
    .from("students")
    .update({
      title: v.title,
      first_name: v.first_name,
      last_name: v.last_name,
      gender: v.gender,
      birth_date: v.birth_date,
      national_id: v.national_id,
    })
    .eq("id", id);

  if (studentError) {
    if (studentError.code === "23505") {
      if (studentError.message.includes("national_id")) {
        return {
          error: "เลขประจำตัวประชาชนถูกใช้แล้ว",
          fieldErrors: { national_id: "เลขนี้ถูกใช้แล้ว" },
        };
      }
    }
    return { error: `ไม่สามารถบันทึก: ${studentError.message}` };
  }

  // Handle classroom enrollment for current year
  const { data: currentYear } = await admin
    .from("academic_years")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();

  if (currentYear) {
    // Find existing current-year enrollment — picks the first match
    // (semester-aware edits come in Phase 1E.2 for secondary)
    const { data: existingEnrollments } = await admin
      .from("enrollments")
      .select(
        `id, classroom_id, semester, classroom:classrooms!classroom_id (academic_year_id, grade_level:grade_levels!grade_level_id (system))`,
      )
      .eq("student_id", id);

    const currentEnr = (existingEnrollments ?? []).find(
      (e) => e.classroom?.academic_year_id === currentYear.id,
    );

    const newClassroomId = v.classroom_id;

    // Delete old if classroom changes (or removed)
    if (currentEnr && newClassroomId !== currentEnr.classroom_id) {
      const oldClassroomId = currentEnr.classroom_id;
      const oldSemester = (currentEnr.semester ?? 0) as 0 | 1 | 2;
      const { error: delError } = await admin
        .from("enrollments")
        .delete()
        .eq("id", currentEnr.id);
      if (delError) {
        return { error: `ไม่สามารถลบ enrollment เก่า: ${delError.message}` };
      }
      // Close the gap left by the removed student in its semester
      await renumberClassroom(admin, oldClassroomId, oldSemester);
    }

    // Create new if needed (no existing, or classroom changed)
    if (
      newClassroomId &&
      (!currentEnr || newClassroomId !== currentEnr.classroom_id)
    ) {
      // Look up destination classroom's system to scope semester
      const { data: newClassroomInfo } = await admin
        .from("classrooms")
        .select(`grade_level:grade_levels!grade_level_id (system)`)
        .eq("id", newClassroomId)
        .maybeSingle();
      const newSemester: 0 | 1 | 2 =
        newClassroomInfo?.grade_level?.system === "secondary"
          ? v.semester
          : 0;

      const { data: maxResult } = await admin
        .from("enrollments")
        .select("student_number")
        .eq("classroom_id", newClassroomId)
        .eq("semester", newSemester)
        .order("student_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNumber = (maxResult?.student_number ?? 0) + 1;

      const { error: enrollError } = await admin.from("enrollments").insert({
        student_id: id,
        classroom_id: newClassroomId,
        student_number: nextNumber,
        semester: newSemester,
      });
      if (enrollError) {
        return {
          error: `ไม่สามารถลงทะเบียนเข้าห้องใหม่: ${enrollError.message}`,
        };
      }

      // Re-sort the destination so the student lands at the right position
      await renumberClassroom(admin, newClassroomId, newSemester);
    }
  }

  revalidatePath("/setup/students");
  redirect("/setup/students");
}

/**
 * Reset a student's password using the Supabase Admin API.
 * Same pattern as the teachers' reset (see Phase 1.9.6).
 */
export async function resetStudentPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const guard = await ensureAdmin();
  if (guard) return { ...guard, success: false };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ไม่พบ id ของนักเรียน", success: false };

  const password = String(formData.get("password") ?? "");
  if (!password) {
    return {
      error: "กรุณากรอกรหัสผ่านใหม่",
      success: false,
      fieldErrors: { password: "ต้องกรอก" },
    };
  }
  if (password.length < 6) {
    return {
      error: "รหัสผ่านไม่ถูกต้อง",
      success: false,
      fieldErrors: { password: "อย่างน้อย 6 ตัว" },
    };
  }

  const admin = createAdminClient();

  const { data: student, error: findError } = await admin
    .from("students")
    .select("auth_user_id")
    .eq("id", id)
    .maybeSingle();
  if (findError) return { error: findError.message, success: false };
  if (!student?.auth_user_id) {
    return {
      error: "ไม่พบบัญชี auth ของนักเรียนคนนี้",
      success: false,
    };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    student.auth_user_id,
    { password },
  );
  if (updateError) {
    return {
      error: `ไม่สามารถเปลี่ยนรหัสผ่าน: ${updateError.message}`,
      success: false,
    };
  }

  return { error: null, success: true };
}
