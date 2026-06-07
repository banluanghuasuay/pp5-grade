"use server";

import { createAdminClient } from "@pp5/database/admin";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWriteAccess } from "@/lib/access";

async function ensureAdmin(): Promise<void> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    throw new Error("ไม่มีสิทธิ์ในการดำเนินการ");
  }
}

/**
 * Assign a study_plan to a classroom (i.e. "this room follows that plan").
 *
 * Existing `subject_offerings` for the classroom are kept — if the new plan
 * doesn't include some of those subjects, they become orphaned but invisible
 * (the teaching page only shows subjects from the current plan). Switching
 * back restores visibility — no data loss.
 */
export async function setClassroomPlan(formData: FormData) {
  await requireWriteAccess();
  await ensureAdmin();

  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const planId = String(formData.get("plan_id") ?? "").trim();
  const gradeId = String(formData.get("grade_id") ?? "").trim();
  const semester = String(formData.get("semester") ?? "1").trim();

  if (!classroomId) throw new Error("missing classroom_id");
  if (!planId) throw new Error("missing plan_id");

  const admin = createAdminClient();
  const { error } = await admin
    .from("classrooms")
    .update({ study_plan_id: planId })
    .eq("id", classroomId);
  if (error) throw new Error(`ไม่สามารถผูกแผน: ${error.message}`);

  revalidatePath("/setup/teaching");
  const params = new URLSearchParams();
  if (gradeId) params.set("grade", gradeId);
  params.set("room", classroomId);
  params.set("semester", semester);
  redirect(`/setup/teaching?${params.toString()}`);
}

/**
 * Save teacher assignments for (classroom, semester) in one batch.
 *
 * The form posts one `teacher_<subjectId>` field per subject in the plan:
 *   - non-empty value → UPSERT offering with that teacher
 *   - empty value     → DELETE offering if it exists
 *
 * subject_offerings has UNIQUE(classroom_id, subject_id, semester) so upsert
 * with onConflict cleanly handles both insert + update cases.
 */
export async function saveOfferingAssignments(formData: FormData) {
  await requireWriteAccess();
  await ensureAdmin();

  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  // For redirect back — preserve grade context
  const gradeId = String(formData.get("grade_id") ?? "").trim();
  const roomId = String(formData.get("room_id") ?? "").trim();

  if (!classroomId) throw new Error("missing classroom_id");

  // Collect all teacher_<subjectId> entries
  const upserts: { subject_id: string; teacher_id: string }[] = [];
  const deletes: string[] = []; // subject_ids to remove from offerings

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("teacher_")) continue;
    const subjectId = key.slice("teacher_".length);
    const teacherId = String(value ?? "").trim();
    if (teacherId) {
      upserts.push({ subject_id: subjectId, teacher_id: teacherId });
    } else {
      deletes.push(subjectId);
    }
  }

  const admin = createAdminClient();

  // Subjects are scoped per (academic_year_id, semester):
  //   primary   → subject.semester=0  (year-wide) → mirror offering to ภาค 1 & 2
  //   secondary → subject.semester=N  (specific term) → ONE offering at sem N
  // Resolve each affected subject's semester so we know how many offering rows
  // to write. (We do this for both upserts and deletes.)
  const allSubjectIds = Array.from(
    new Set([...upserts.map((u) => u.subject_id), ...deletes]),
  );
  const subjectSemMap = new Map<string, 0 | 1 | 2>();
  if (allSubjectIds.length > 0) {
    const { data: subjectRows } = await admin
      .from("subjects")
      .select("id, semester")
      .in("id", allSubjectIds);
    for (const row of subjectRows ?? []) {
      const sem = row.semester;
      if (sem === 0 || sem === 1 || sem === 2) {
        subjectSemMap.set(row.id, sem);
      }
    }
  }

  /** Returns the set of (1|2) offering semesters that should exist for the
   *  given subject:
   *    - semester=0 (primary, year-wide)  → both 1 and 2
   *    - semester=1 (secondary, ภาค 1)    → only 1
   *    - semester=2 (secondary, ภาค 2)    → only 2
   *    - missing                          → [] (skip — defensive) */
  const semestersFor = (subjectId: string): Array<1 | 2> => {
    const sem = subjectSemMap.get(subjectId);
    if (sem === 0) return [1, 2];
    if (sem === 1) return [1];
    if (sem === 2) return [2];
    return [];
  };

  // ---- Upsert offerings ----
  // Primary subjects get 2 rows (sem 1 and sem 2 share the same teacher).
  // Secondary subjects get 1 row only (the term they belong to).
  if (upserts.length > 0) {
    const rows = upserts.flatMap((u) =>
      semestersFor(u.subject_id).map((semester) => ({
        classroom_id: classroomId,
        subject_id: u.subject_id,
        teacher_id: u.teacher_id,
        semester,
      })),
    );
    if (rows.length > 0) {
      const { error } = await admin.from("subject_offerings").upsert(rows, {
        onConflict: "classroom_id,subject_id,semester",
      });
      if (error) {
        throw new Error(`ไม่สามารถบันทึก: ${error.message}`);
      }
    }
  }

  // ---- Clear teacher for unassigned subjects (NULLify instead of delete)
  // We don't DELETE the offering row because attendance + scores reference
  // it (ON DELETE CASCADE would wipe them). Setting teacher_id=NULL keeps
  // the offering alive — admin can record without a teacher, and assign
  // one later. If no row exists yet, the UPDATE simply affects 0 rows (no-op).
  if (deletes.length > 0) {
    const { error } = await admin
      .from("subject_offerings")
      .update({ teacher_id: null })
      .eq("classroom_id", classroomId)
      .in("subject_id", deletes);
    if (error) {
      throw new Error(`ไม่สามารถยกเลิกการมอบหมาย: ${error.message}`);
    }
  }

  revalidatePath("/setup/teaching");

  const params = new URLSearchParams();
  if (gradeId) params.set("grade", gradeId);
  if (roomId) params.set("room", roomId);
  params.set("saved", "1");
  redirect(`/setup/teaching?${params.toString()}`);
}

// copyFromPreviousSemester removed — saveOfferingAssignments now writes BOTH
// ภาค 1 and ภาค 2 in one shot, so there's no second semester to copy into.
