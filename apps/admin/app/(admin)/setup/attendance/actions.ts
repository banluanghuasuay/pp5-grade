"use server";

import { createAdminClient } from "@pp5/database/admin";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";
import { ensureSemesterEditable } from "@/lib/current-term";
import { semesterFromIsoDate } from "./calendar";
import { requireWriteAccess } from "@/lib/access";

export type AttendanceStatus = "present" | "absent" | "leave" | "sick";

/**
 * Authorize an attendance write: admin always, OR the homeroom teacher of
 * this classroom (รายวันเช็คโดยครูประจำชั้น). User report 2026-06-02: teachers
 * got "ไม่มีสิทธิ์" because the old guard was admin-only — actions use the
 * service-role client (bypasses RLS) so the per-teacher check must be here.
 */
async function ensureCanEditAttendance(classroomId: string): Promise<void> {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("ไม่มีสิทธิ์");
  if (auth.profile.role === "admin") return;
  if (auth.profile.role === "teacher") {
    const admin = createAdminClient();
    const { data: teacher } = await admin
      .from("teachers")
      .select("id")
      .eq("user_id", auth.profile.id)
      .maybeSingle();
    if (teacher) {
      const { data: hr } = await admin
        .from("homeroom_assignments")
        .select("id")
        .eq("classroom_id", classroomId)
        .eq("teacher_id", teacher.id)
        .maybeSingle();
      if (hr) return;
    }
  }
  throw new Error("ไม่มีสิทธิ์ — เฉพาะครูประจำชั้นหรือผู้ดูแลระบบ");
}

/**
 * Phase 2.6 — derive the semester from a date and check it against the
 * school's current_semester. Skips the check if the date doesn't belong
 * to any semester (e.g., April between-term break — separate concern).
 *
 * Primary (ประถม) classrooms are EXEMPT from this check — ประถมตัดเกรดรายปี
 * so attendance stays editable across both terms regardless of which is
 * current. Secondary (มัธยม) keeps the lock since grades cut per semester.
 *
 * The caller passes `classroomId` (not `system` directly) so we can do the
 * lookup here in one place instead of duplicating it at every callsite.
 */
async function ensureDateEditableForClassroom(
  classroomId: string,
  date: string,
): Promise<void> {
  const sem = semesterFromIsoDate(date);
  if (sem === null) return;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("classrooms")
    .select(`grade_level:grade_levels!grade_level_id (system)`)
    .eq("id", classroomId)
    .maybeSingle();
  // Primary skips the lock entirely. Default to "secondary" (locked) if the
  // lookup somehow fails — better to false-positive on locked than to silently
  // bypass the check.
  if (row?.grade_level?.system === "primary") return;

  await ensureSemesterEditable(sem);
}

/**
 * Toggle a classroom's workday status for a specific date.
 *
 * If `is_workday=true`  → INSERT workday row (idempotent via UPSERT).
 * If `is_workday=false` → DELETE workday row AND CLEAR every student's
 *                         attendance for that date (because a non-workday
 *                         shouldn't have attendance records — per user request).
 */
export async function toggleWorkday(formData: FormData): Promise<void> {
  await requireWriteAccess();
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const isWorkday = formData.get("is_workday") === "true";
  if (!classroomId || !date) throw new Error("missing classroom_id/date");

  await ensureCanEditAttendance(classroomId);
  await ensureDateEditableForClassroom(classroomId, date);

  const admin = createAdminClient();
  if (isWorkday) {
    const { error } = await admin
      .from("workdays")
      .upsert(
        { classroom_id: classroomId, date },
        { onConflict: "classroom_id,date", ignoreDuplicates: true },
      );
    if (error) throw new Error(`ไม่สามารถบันทึก: ${error.message}`);
  } else {
    // 1. Remove workday row
    const { error: wdErr } = await admin
      .from("workdays")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("date", date);
    if (wdErr) throw new Error(`ไม่สามารถลบ: ${wdErr.message}`);

    // 2. Cascade clear attendance for this (classroom, date)
    //    Cells in the UI need to revert to empty when the day is closed.
    const { error: attErr } = await admin
      .from("attendance")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("date", date);
    if (attErr) {
      throw new Error(`ลบ workday แล้ว แต่ล้างคะแนนเวลาเรียนไม่สำเร็จ: ${attErr.message}`);
    }
  }
  revalidatePath("/setup/attendance");
}

/**
 * Bulk-mark every enrolled student in a classroom as "present" for a date,
 * or clear them all (depending on `set_present` flag).
 *
 * Use case: ครูทั้งห้องมาวันนี้ → click ✓ ใต้วันที่ → set ทั้งหมดเป็น present.
 * Click ซ้ำ → clear ทั้งห้อง.
 */
export async function setAllForDay(formData: FormData): Promise<void> {
  await requireWriteAccess();
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const setPresent = formData.get("set_present") === "true";
  if (!classroomId || !date) throw new Error("missing classroom_id/date");

  await ensureCanEditAttendance(classroomId);
  await ensureDateEditableForClassroom(classroomId, date);

  const admin = createAdminClient();

  // Resolve semester scope for the enrollment query:
  //   primary → semester=0 (year-wide), secondary → derived from `date`
  const { data: classroomInfo } = await admin
    .from("classrooms")
    .select(`grade_level:grade_levels!grade_level_id (system)`)
    .eq("id", classroomId)
    .maybeSingle();
  const isSecondary = classroomInfo?.grade_level?.system === "secondary";
  const enrollmentSemester: 0 | 1 | 2 = isSecondary
    ? (semesterFromIsoDate(date) ?? 1)
    : 0;

  // Fetch all enrolled students for this classroom × semester
  const { data: enrolls, error: enrollErr } = await admin
    .from("enrollments")
    .select("student_id")
    .eq("classroom_id", classroomId)
    .eq("semester", enrollmentSemester);
  if (enrollErr) throw new Error(enrollErr.message);

  const studentIds = (enrolls ?? []).map((e) => e.student_id);
  if (studentIds.length === 0) {
    revalidatePath("/setup/attendance");
    return;
  }

  if (!setPresent) {
    // Clear all attendance for this date in this classroom
    const { error } = await admin
      .from("attendance")
      .delete()
      .eq("classroom_id", classroomId)
      .eq("date", date)
      .in("student_id", studentIds);
    if (error) throw new Error(error.message);
  } else {
    // Mark every student as present
    const rows = studentIds.map((sid) => ({
      student_id: sid,
      classroom_id: classroomId,
      date,
      status: "present" as AttendanceStatus,
      recorded_by: null,
    }));
    const { error } = await admin
      .from("attendance")
      .upsert(rows, { onConflict: "student_id,date" });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/setup/attendance");
}

/**
 * Set or clear a student's attendance status for a date.
 *
 * Non-empty status → UPSERT.
 * Empty status → DELETE the row.
 *
 * Schema has UNIQUE(student_id, date) so onConflict works cleanly.
 */
export async function saveAttendance(formData: FormData): Promise<void> {
  await requireWriteAccess();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!studentId || !classroomId || !date) {
    throw new Error("missing student/classroom/date");
  }

  await ensureCanEditAttendance(classroomId);
  await ensureDateEditableForClassroom(classroomId, date);

  const admin = createAdminClient();

  if (status === "") {
    const { error } = await admin
      .from("attendance")
      .delete()
      .eq("student_id", studentId)
      .eq("date", date);
    if (error) throw new Error(error.message);
    revalidatePath("/setup/attendance");
    return;
  }

  if (!["present", "absent", "leave", "sick"].includes(status)) {
    throw new Error("invalid status");
  }

  const { error } = await admin.from("attendance").upsert(
    {
      student_id: studentId,
      classroom_id: classroomId,
      date,
      status: status as AttendanceStatus,
      recorded_by: null, // admin doesn't have teachers.id — see scores actions
    },
    { onConflict: "student_id,date" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/setup/attendance");
}
