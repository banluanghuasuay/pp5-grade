"use server";

import { createAdminClient } from "@pp5/database/admin";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const TEACHER_DOMAIN = "teacher.pp5.local";
const ADMIN_DOMAIN = "admin.pp5.local";

export type TeacherFormState = {
  error: string | null;
  fieldErrors?: {
    username?: string;
    password?: string;
    full_name?: string;
    email?: string;
  };
};

type ParsedTeacher = {
  // users
  username: string;
  password: string;
  full_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  /** When true the user row is created (or updated) with role='admin'
   *  and their auth email lives under @admin.pp5.local — i.e. they can
   *  log in to the admin app. The `teachers` row still exists so the
   *  person also shows up in the teacher list / homeroom dropdowns. */
  is_admin: boolean;
  /** users.is_active — edit form only (create always true). */
  is_active: boolean;
  // teachers
  position: string | null;
  department: string | null;
  is_department_head: boolean;
};

function parseForm(formData: FormData, requirePassword: boolean):
  | { ok: true; values: ParsedTeacher }
  | { ok: false; state: TeacherFormState } {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const position = String(formData.get("position") ?? "").trim() || null;
  const department = String(formData.get("department") ?? "").trim() || null;
  const is_department_head = formData.get("is_department_head") === "on";
  const is_admin = formData.get("is_admin") === "on";
  // Only present in the edit form (showStatus). Absent on create → false,
  // but createTeacher ignores this and always inserts is_active: true.
  const is_active = formData.get("is_active") === "on";

  const fieldErrors: TeacherFormState["fieldErrors"] = {};

  if (!username) fieldErrors.username = "กรุณากรอกชื่อผู้ใช้";
  else if (!/^[a-z0-9_]{3,50}$/i.test(username))
    fieldErrors.username = "ใช้ a-z, 0-9, _ เท่านั้น (3-50 ตัว)";

  if (requirePassword) {
    if (!password) fieldErrors.password = "กรุณากรอกรหัสผ่าน";
    else if (password.length < 6)
      fieldErrors.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัว";
  }

  if (!full_name) fieldErrors.full_name = "กรุณากรอกชื่อ-นามสกุล";

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fieldErrors.email = "รูปแบบอีเมลไม่ถูกต้อง";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, state: { error: "ข้อมูลไม่ถูกต้อง", fieldErrors } };
  }

  return {
    ok: true,
    values: {
      username,
      password,
      full_name,
      title,
      email,
      phone,
      is_admin,
      is_active,
      position,
      department,
      is_department_head,
    },
  };
}

async function ensureAdmin(): Promise<TeacherFormState | null> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    return { error: "ไม่มีสิทธิ์ในการดำเนินการ" };
  }
  return null;
}

/**
 * Create a teacher. Coordinates 3 records:
 *   1. auth.users (via service-role admin API)
 *   2. public.users (role='teacher', linked to auth)
 *   3. public.teachers (extended info, linked to users)
 *
 * On failure at any step, cleans up earlier steps so we don't leave orphans.
 */
export async function createTeacher(
  _prev: TeacherFormState,
  formData: FormData,
): Promise<TeacherFormState> {
  const guard = await ensureAdmin();
  if (guard) return guard;

  const parsed = parseForm(formData, true);
  if (!parsed.ok) return parsed.state;
  const v = parsed.values;

  const admin = createAdminClient();

  // Step 1: create auth user — domain switches based on is_admin so the
  // login flow (which tries admin.pp5.local first then teacher.pp5.local)
  // routes the user into the right app.
  const email = `${v.username}@${v.is_admin ? ADMIN_DOMAIN : TEACHER_DOMAIN}`;
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: v.password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    const msg = authError?.message ?? "ไม่สามารถสร้างบัญชี auth";
    // Common case: email already taken (= username taken)
    if (msg.toLowerCase().includes("already") || msg.includes("registered")) {
      return {
        error: `ชื่อผู้ใช้ "${v.username}" ถูกใช้แล้ว`,
        fieldErrors: { username: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" },
      };
    }
    return { error: msg };
  }

  const authUserId = authData.user.id;

  // Step 2: insert into users — role matches the auth email domain
  // chosen above. A user with role='admin' can still have a
  // `teachers` row (no DB constraint forbids it) so they show up in
  // homeroom dropdowns and the teacher list grouped by department.
  const { data: userRow, error: userError } = await admin
    .from("users")
    .insert({
      auth_user_id: authUserId,
      username: v.username,
      full_name: v.full_name,
      title: v.title,
      email: v.email,
      phone: v.phone,
      role: v.is_admin ? "admin" : "teacher",
      is_active: true,
    })
    .select("id")
    .single();

  if (userError || !userRow) {
    // Cleanup: delete auth user
    await admin.auth.admin.deleteUser(authUserId);
    if (userError?.code === "23505") {
      return {
        error: `ชื่อผู้ใช้ "${v.username}" ถูกใช้แล้ว`,
        fieldErrors: { username: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" },
      };
    }
    return { error: userError?.message ?? "ไม่สามารถสร้าง user profile" };
  }

  // Step 3: insert into teachers
  const { error: teacherError } = await admin.from("teachers").insert({
    user_id: userRow.id,
    position: v.position,
    department: v.department,
    is_department_head: v.is_department_head,
  });

  if (teacherError) {
    // Cleanup: delete user + auth user
    await admin.from("users").delete().eq("id", userRow.id);
    await admin.auth.admin.deleteUser(authUserId);
    return { error: `ไม่สามารถสร้างข้อมูลครู: ${teacherError.message}` };
  }

  revalidatePath("/setup/teachers");
  redirect("/setup/teachers");
}

export type ResetPasswordState = {
  error: string | null;
  success: boolean;
  fieldErrors?: { password?: string };
};

/**
 * Reset a teacher's password using the Supabase Admin API.
 *
 * No "current password" required — admin has the authority to override.
 * The teacher should be informed of the new password in person.
 */
export async function resetTeacherPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const guard = await ensureAdmin();
  if (guard) return { ...guard, success: false };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ไม่พบ id ของครู", success: false };

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

  // Find auth_user_id via teacher → user join
  const { data: teacher, error: findError } = await admin
    .from("teachers")
    .select("user:users!user_id (auth_user_id)")
    .eq("id", id)
    .maybeSingle();
  if (findError) return { error: findError.message, success: false };
  if (!teacher?.user?.auth_user_id) {
    return { error: "ไม่พบบัญชี auth ของครูคนนี้", success: false };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    teacher.user.auth_user_id,
    { password },
  );
  if (updateError) {
    return { error: `ไม่สามารถเปลี่ยนรหัสผ่าน: ${updateError.message}`, success: false };
  }

  // Stay on the edit page — show success inline
  return { error: null, success: true };
}

/**
 * Hard-delete a teacher. Carefully — many tables reference teacher_id.
 *
 * Pre-check: blocks if the teacher has any `subject_offerings` rows
 * (those CASCADE to `scores` + `score_categories` — destroying score
 * history). For attendance / eval / announcement references the FKs
 * are NO ACTION, so the DB blocks us automatically; we catch the
 * resulting error and translate it to a user-friendly message that
 * points the admin at the soft-delete (ปิดใช้งาน) flow instead.
 *
 * Order of operations (cleanest cascade path):
 *   1. delete from `teachers` (CASCADE → homeroom_assignments)
 *   2. delete from `users`    (CASCADE → would already be cleared via teachers FK)
 *   3. delete from auth.users (Supabase admin API — separate schema)
 *
 * Use this only for newly-added teachers who haven't recorded anything
 * yet. For long-tenured teachers, prefer ปิดใช้งาน in the edit form.
 *
 * User spec 2026-05-22.
 */
export async function deleteTeacher(formData: FormData) {
  const guard = await ensureAdmin();
  if (guard) {
    redirect(
      `/setup/teachers?error=${encodeURIComponent(guard.error ?? "ไม่มีสิทธิ์")}`,
    );
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    redirect(
      `/setup/teachers?error=${encodeURIComponent("ไม่พบ id ของครู")}`,
    );
  }

  // Force mode — when set, NULL-out the attribution FKs (attendance /
  // eval recorded_by) + delete announcements so the cascade can
  // proceed. Use only for test data; for real teachers prefer the
  // toggle (ปิดใช้งาน) so history attribution is preserved.
  const force = formData.get("force") === "true";

  const admin = createAdminClient();

  // Fetch user_id + auth_user_id BEFORE deleting (we lose access via
  // the teacher row after the cascade fires).
  const { data: teacher, error: findError } = await admin
    .from("teachers")
    .select("user_id, user:users!user_id (auth_user_id)")
    .eq("id", id)
    .maybeSingle();
  if (findError) {
    redirect(
      `/setup/teachers?error=${encodeURIComponent(findError.message)}`,
    );
  }
  if (!teacher || !teacher.user) {
    redirect(
      `/setup/teachers?error=${encodeURIComponent("ไม่พบครูในระบบ")}`,
    );
  }

  if (!force) {
    // Strict pre-check: any subject_offerings → block (cascade would
    // wipe scores). Force mode skips this and lets the cascade run.
    const { count: offeringCount } = await admin
      .from("subject_offerings")
      .select("*", { count: "exact", head: true })
      .eq("teacher_id", id);
    if ((offeringCount ?? 0) > 0) {
      redirect(
        `/setup/teachers?error=${encodeURIComponent(
          "ครูคนนี้มีรายวิชาสอนผูกอยู่ ลบไม่ได้ — ใช้ปิดใช้งานแทน หรือลบแบบเคลียร์ข้อมูล",
        )}`,
      );
    }
  } else {
    // Force mode — NULL the NO-ACTION attribution FKs so the teacher
    // delete can proceed. Score history KEEPS the row (just the
    // "who recorded" tag becomes NULL); same for attendance + evals.
    // Announcements get deleted entirely since `teacher_id` is the
    // author (no point keeping anonymous announcements around).
    await Promise.all([
      admin
        .from("attendance")
        .update({ recorded_by: null })
        .eq("recorded_by", id),
      admin
        .from("subject_attendance")
        .update({ recorded_by: null })
        .eq("recorded_by", id),
      admin
        .from("characteristic_evaluations")
        .update({ evaluated_by: null })
        .eq("evaluated_by", id),
      admin
        .from("reading_thinking_evaluations")
        .update({ evaluated_by: null })
        .eq("evaluated_by", id),
      admin
        .from("competency_evaluations")
        .update({ evaluated_by: null })
        .eq("evaluated_by", id),
      admin.from("announcements").delete().eq("teacher_id", id),
    ]);
  }

  // Try delete teachers (CASCADE → homeroom_assignments +
  // subject_offerings + scores in force mode). FK errors from any
  // missed attribution table come back as 23503.
  const { error: teacherDelError } = await admin
    .from("teachers")
    .delete()
    .eq("id", id);
  if (teacherDelError) {
    const msg =
      teacherDelError.code === "23503"
        ? force
          ? `ลบไม่ได้ แม้จะเคลียร์ข้อมูลแล้ว — ${teacherDelError.message}`
          : "ลบไม่ได้ — ครูคนนี้มีข้อมูลผูกอยู่ (บันทึกเวลาเรียน/การประเมิน/ประกาศ) ใช้ปิดใช้งานแทน หรือลบแบบเคลียร์ข้อมูล"
        : `ลบไม่ได้: ${teacherDelError.message}`;
    redirect(`/setup/teachers?error=${encodeURIComponent(msg)}`);
  }

  // Delete users (no longer FK'd from teachers — safe).
  await admin.from("users").delete().eq("id", teacher.user_id);

  // Delete auth user — separate schema, so this is a no-op for FK
  // purposes. Best-effort: if it fails (e.g. auth row missing) we
  // continue, the public data is already gone.
  if (teacher.user.auth_user_id) {
    await admin.auth.admin.deleteUser(teacher.user.auth_user_id);
  }

  revalidatePath("/setup/teachers");
  redirect("/setup/teachers");
}

/**
 * Update teacher info. Updates 2 tables (users + teachers).
 *
 * NOT updated here:
 * - username (locked — it's the auth identity)
 * - password (separate "reset password" flow — Phase 1.9.6)
 *
 * UPDATED here:
 * - is_active — moved from the list toggle into the edit form
 *   (user spec 2026-05-31)
 * - role can flip between 'teacher' ↔ 'admin' via the `is_admin`
 *   checkbox. Flipping role ALSO rewrites the auth-side email so the
 *   login domain (admin.pp5.local vs teacher.pp5.local) matches.
 */
export async function updateTeacher(
  _prev: TeacherFormState,
  formData: FormData,
): Promise<TeacherFormState> {
  const guard = await ensureAdmin();
  if (guard) return guard;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ไม่พบ id ของครู" };

  const parsed = parseForm(formData, false); // password not required for edit
  if (!parsed.ok) return parsed.state;
  const v = parsed.values;

  const admin = createAdminClient();

  // Find user_id + current role + auth_user_id (need both for the
  // role-flip path: users.role update + auth.users.email rewrite).
  const { data: teacher, error: findError } = await admin
    .from("teachers")
    .select(
      "user_id, user:users!user_id (auth_user_id, username, role)",
    )
    .eq("id", id)
    .maybeSingle();
  if (findError) return { error: findError.message };
  if (!teacher || !teacher.user) return { error: "ไม่พบครูในระบบ" };

  const newRole: "admin" | "teacher" = v.is_admin ? "admin" : "teacher";
  const roleChanged = teacher.user.role !== newRole;

  // If the privilege level flipped, rewrite the auth email FIRST so a
  // failure there doesn't leave us with a mismatched users.role / login
  // domain (the user would be stuck unable to sign in).
  if (roleChanged) {
    if (!teacher.user.auth_user_id) {
      // Defensive — schema says NOT NULL but the join's TS type is
      // nullable. Without an auth row we can't rewrite the login email
      // safely, so abort the privilege flip.
      return { error: "ไม่พบบัญชี auth ของครูคนนี้ — เปลี่ยนสิทธิ์ไม่ได้" };
    }
    const newEmail = `${teacher.user.username}@${v.is_admin ? ADMIN_DOMAIN : TEACHER_DOMAIN}`;
    const { error: authError } = await admin.auth.admin.updateUserById(
      teacher.user.auth_user_id,
      { email: newEmail, email_confirm: true },
    );
    if (authError) {
      return {
        error: `ไม่สามารถเปลี่ยนสิทธิ์ (auth): ${authError.message}`,
      };
    }
  }

  // Update users (profile + role if changed)
  const { error: userError } = await admin
    .from("users")
    .update({
      full_name: v.full_name,
      title: v.title,
      email: v.email,
      phone: v.phone,
      role: newRole,
      // is_active now lives in the edit form (replaces the old list toggle).
      is_active: v.is_active,
    })
    .eq("id", teacher.user_id);
  if (userError) {
    return { error: `ไม่สามารถบันทึก profile: ${userError.message}` };
  }

  // Update teachers (extended)
  const { error: teacherError } = await admin
    .from("teachers")
    .update({
      position: v.position,
      department: v.department,
      is_department_head: v.is_department_head,
    })
    .eq("id", id);
  if (teacherError) {
    return { error: `ไม่สามารถบันทึก: ${teacherError.message}` };
  }

  revalidatePath("/setup/teachers");
  redirect("/setup/teachers");
}
