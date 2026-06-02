"use server";

import { createAdminClient } from "@pp5/database/admin";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";

// ============================================================
// Subject attendance — บันทึกเวลาเรียน "รายวิชา" (per-offering)
//
// 1 row per (offering, student, week, slot_in_week). UI ใช้ 3 ค่า
// ('present' | 'absent' | 'leave') แต่ schema เปิดทั้ง 4 enum ของ
// `attendance_status` (เผื่ออนาคตอยาก add "sick" กลับมา).
//
// Cache invalidation: every successful write calls revalidatePath() with
// type='layout' so all variants of the page URL (?tab=1/2/3/4) get fresh
// data on next visit.
// ============================================================

export type SubjectAttendanceStatus = "present" | "absent" | "leave";

const REVALIDATE_PATH = "/setup/attendance/by-subject";

/**
 * Authorize a subject-attendance write: admin always, OR the teacher who
 * teaches this offering. Actions use the service-role client (bypasses RLS)
 * so the per-teacher check lives here. User report 2026-06-02: teachers got
 * "ไม่มีสิทธิ์" / "บันทึกไม่สำเร็จ" because the old guard was admin-only.
 */
async function ensureCanEditSubjectAttendance(
  offeringId: string,
): Promise<void> {
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
      const { data: off } = await admin
        .from("subject_offerings")
        .select("id")
        .eq("id", offeringId)
        .eq("teacher_id", teacher.id)
        .maybeSingle();
      if (off) return;
    }
  }
  throw new Error("ไม่มีสิทธิ์ — เฉพาะครูที่สอนวิชานี้หรือผู้ดูแลระบบ");
}

/**
 * Set (or clear) a single attendance cell.
 *
 * - status non-empty → UPSERT (returns the row to verify it was written)
 * - status empty     → DELETE the cell
 *
 * Schema UNIQUE (offering_id, student_id, week, slot_in_week) means upsert
 * with onConflict on those 4 cols cleanly handles both insert + update.
 *
 * Server action signature matches the existing per-day `saveAttendance` so
 * the grid client can follow the same per-cell save pattern.
 */
export async function saveSubjectAttendance(formData: FormData): Promise<void> {
  const offeringId = String(formData.get("offering_id") ?? "").trim();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const weekStr = String(formData.get("week") ?? "").trim();
  const slotStr = String(formData.get("slot_in_week") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!offeringId || !studentId || !weekStr || !slotStr) {
    throw new Error("missing offering/student/week/slot");
  }

  await ensureCanEditSubjectAttendance(offeringId);

  const week = Number.parseInt(weekStr, 10);
  const slot = Number.parseInt(slotStr, 10);
  if (!Number.isFinite(week) || week < 1 || week > 30) {
    throw new Error("invalid week");
  }
  if (!Number.isFinite(slot) || slot < 1 || slot > 10) {
    throw new Error("invalid slot");
  }

  const admin = createAdminClient();

  if (status === "") {
    // Clear the cell
    const { error } = await admin
      .from("subject_attendance")
      .delete()
      .eq("offering_id", offeringId)
      .eq("student_id", studentId)
      .eq("week", week)
      .eq("slot_in_week", slot);
    if (error) throw new Error(error.message);
    revalidatePath(REVALIDATE_PATH, "layout");
    return;
  }

  if (status !== "present" && status !== "absent" && status !== "leave") {
    throw new Error("invalid status");
  }

  // Upsert + .select() so we can VERIFY the row actually landed in DB.
  // `error == null` alone isn't sufficient — supabase can return a clean
  // response while the row didn't persist (silent constraint mismatch).
  // If the verify SELECT returns nothing, we throw so the client rolls
  // back the optimistic ✓ instead of silently showing it then losing it.
  const { data: upserted, error } = await admin
    .from("subject_attendance")
    .upsert(
      {
        offering_id: offeringId,
        student_id: studentId,
        week,
        slot_in_week: slot,
        status: status as SubjectAttendanceStatus,
        recorded_by: null,
      },
      { onConflict: "offering_id,student_id,week,slot_in_week" },
    )
    .select("id");
  if (error) throw new Error(error.message);
  if (!upserted || upserted.length === 0) {
    throw new Error("UPSERT returned no rows — row was not persisted");
  }
  revalidatePath(REVALIDATE_PATH, "layout");
}

/**
 * Bulk-mark every enrolled student as "present" for a specific (week, slot)
 * — or clear them all if `set_present=false`.
 *
 * Use case: ครูคลิก ✓ ที่ header ของช่อง → ทั้งห้องมาเรียนช่องนั้น
 */
export async function setSubjectAttendanceForSlot(
  formData: FormData,
): Promise<void> {
  const offeringId = String(formData.get("offering_id") ?? "").trim();
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const semesterStr = String(formData.get("semester") ?? "").trim();
  const weekStr = String(formData.get("week") ?? "").trim();
  const slotStr = String(formData.get("slot_in_week") ?? "").trim();
  const setPresent = formData.get("set_present") === "true";

  if (!offeringId || !classroomId) throw new Error("missing offering/classroom");

  await ensureCanEditSubjectAttendance(offeringId);

  const week = Number.parseInt(weekStr, 10);
  const slot = Number.parseInt(slotStr, 10);
  const semester = Number.parseInt(semesterStr, 10);
  if (
    !Number.isFinite(week) ||
    !Number.isFinite(slot) ||
    !Number.isFinite(semester)
  ) {
    throw new Error("invalid week/slot/semester");
  }

  const admin = createAdminClient();

  // Resolve which enrollment-semester scope to read for this classroom:
  //   primary → semester=0 (year-wide)
  //   secondary → the active term
  const { data: classroomInfo } = await admin
    .from("classrooms")
    .select(`grade_level:grade_levels!grade_level_id (system)`)
    .eq("id", classroomId)
    .maybeSingle();
  const isSecondary = classroomInfo?.grade_level?.system === "secondary";
  const enrollmentSemester: 0 | 1 | 2 = isSecondary
    ? semester === 2
      ? 2
      : 1
    : 0;

  const { data: enrolls, error: enrollErr } = await admin
    .from("enrollments")
    .select("student_id")
    .eq("classroom_id", classroomId)
    .eq("semester", enrollmentSemester);
  if (enrollErr) throw new Error(enrollErr.message);

  const studentIds = (enrolls ?? []).map((e) => e.student_id);
  if (studentIds.length === 0) {
    revalidatePath(REVALIDATE_PATH, "layout");
    return;
  }

  if (!setPresent) {
    // Clear the slot for every student
    const { error } = await admin
      .from("subject_attendance")
      .delete()
      .eq("offering_id", offeringId)
      .eq("week", week)
      .eq("slot_in_week", slot)
      .in("student_id", studentIds);
    if (error) throw new Error(error.message);
  } else {
    const rows = studentIds.map((sid) => ({
      offering_id: offeringId,
      student_id: sid,
      week,
      slot_in_week: slot,
      status: "present" as SubjectAttendanceStatus,
      recorded_by: null,
    }));
    // Verify-via-.select() pattern (same rationale as saveSubjectAttendance).
    const { data: upserted, error } = await admin
      .from("subject_attendance")
      .upsert(rows, { onConflict: "offering_id,student_id,week,slot_in_week" })
      .select("id");
    if (error) throw new Error(error.message);
    if (!upserted || upserted.length === 0) {
      throw new Error("bulk UPSERT returned no rows — nothing persisted");
    }
  }
  revalidatePath(REVALIDATE_PATH, "layout");
}
