import { createClient } from "@pp5/database/server";
import { getCurrentUser } from "@pp5/database/queries";
import { redirect } from "next/navigation";

/**
 * Page guard: redirect non-admin users to home.
 *
 * Use at the top of admin-only setup pages (school, academic-years,
 * classrooms, holidays, teachers, students, subjects, teaching,
 * homerooms). Teachers attempting to deep-link to these get bounced
 * to "/" — the home page handles the "what should this user see" copy.
 */
export async function requireAdmin(): Promise<void> {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");
  if (auth.profile.role !== "admin") redirect("/");
}

/**
 * Server-action permission check for student-level evaluations
 * (characteristics, reading-thinking, competency). Admin always passes;
 * teacher must be the homeroom teacher (any slot) of the student's
 * enrolled classroom in the current academic year.
 *
 * `yearId` MUST be supplied — it scopes the enrollment lookup to the
 * correct academic year. Without it, a student who has been enrolled in
 * multiple years would produce a non-deterministic result (the DB could
 * return any year's classroom), making the homeroom check unreliable.
 *
 * Takes the caller's admin client so we don't double-spin one per check.
 */
export async function ensureCanEvaluateStudent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  studentId: string,
  yearId: string,
): Promise<void> {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("ไม่ได้เข้าสู่ระบบ");
  if (auth.profile.role === "admin") return;

  // Teacher path — look up their teachers row
  const { data: teacher } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", auth.profile.id)
    .maybeSingle();
  if (!teacher) throw new Error("ไม่พบข้อมูลครู");

  // Find student's enrollment in THIS academic year. We join classrooms to
  // filter by academic_year_id so we don't accidentally land on a previous
  // year's classroom (each classroom row is per-year, and students who have
  // been at the school multiple years have one enrollment row per year).
  // Primary schools enroll at semester=0; secondary at semester 1 or 2 —
  // both cases share the same classroom_id so we take any matching row.
  const { data: enrollments } = await admin
    .from("enrollments")
    .select(
      "classroom_id, classroom:classrooms!classroom_id(academic_year_id)",
    )
    .eq("student_id", studentId);

  // Pick the enrollment whose classroom belongs to yearId
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const match = (enrollments ?? []).find(
    (e: { classroom_id: string; classroom?: { academic_year_id: string } | null }) =>
      e.classroom?.academic_year_id === yearId,
  );
  if (!match) throw new Error("ไม่พบการลงทะเบียนของนักเรียนในปีนี้");

  // Check if teacher is homeroom (any role slot) of student's classroom
  const { data: homeroomMatch } = await admin
    .from("homeroom_assignments")
    .select("id")
    .eq("classroom_id", match.classroom_id)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!homeroomMatch) {
    throw new Error("ไม่ได้เป็นครูประจำชั้นของนักเรียนคนนี้");
  }
}

/**
 * Server-action permission check for classroom-scoped bulk actions
 * (e.g. setAllReadingThinkingForColumn, setAllForDay). Admin always
 * passes; teacher must be a homeroom teacher of the classroom.
 */
export async function ensureCanEditAsHomeroom(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  classroomId: string,
): Promise<void> {
  const auth = await getCurrentUser();
  if (!auth) throw new Error("ไม่ได้เข้าสู่ระบบ");
  if (auth.profile.role === "admin") return;

  const { data: teacher } = await admin
    .from("teachers")
    .select("id")
    .eq("user_id", auth.profile.id)
    .maybeSingle();
  if (!teacher) throw new Error("ไม่พบข้อมูลครู");

  const { data: homeroomMatch } = await admin
    .from("homeroom_assignments")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("teacher_id", teacher.id)
    .maybeSingle();

  if (!homeroomMatch) {
    throw new Error("ไม่ได้เป็นครูประจำชั้นของห้องนี้");
  }
}

/**
 * Teacher-scope helpers for Phase 2 page filters.
 *
 * Admin users have unrestricted access — every page shows ALL classrooms /
 * subjects / offerings. Teacher users see only what they teach or are
 * homeroom for:
 *   - subject_offerings.teacher_id = their teacher row's id
 *   - homeroom_assignments.teacher_id = their teacher row's id
 *
 * These helpers return:
 *   - `null` if the current user is admin (no scope filter applies)
 *   - An object with the teacher's id + the sets of allowed offering ids
 *     / classroom ids if the current user is a teacher
 *
 * Pages call `getTeacherScope()` once and use the returned set to filter
 * their dropdowns + queries. When admin = `null`, code paths skip the
 * filter and behave as before (admin sees everything).
 */

export type TeacherScope = {
  /** The teacher row's id (from `teachers` table). */
  teacherId: string;
  /** All subject_offering ids the teacher is assigned to teach. */
  offeringIds: Set<string>;
  /** Classrooms the teacher TEACHES in (has at least one offering).
   *  Used by score-structure / activities / per-subject pages — being
   *  a homeroom alone doesn't grant access to scoring screens. */
  teachingClassroomIds: Set<string>;
  /** All classroom ids the teacher is homeroom for (any role slot). */
  homeroomClassroomIds: Set<string>;
  /** All classroom ids the teacher has ANY offering in (=
   *  union of homeroom + subjects taught). Useful for the
   *  /reports/pp5-class listing where the teacher should see
   *  every classroom they touch, not only homerooms. */
  reachableClassroomIds: Set<string>;
};

/**
 * Resolve the current user's teacher scope, or null if admin.
 *
 * Returns null in three cases:
 *   1. No user logged in (defensive — layout already redirects to /login)
 *   2. User role is admin → no filter
 *   3. User role is teacher BUT no matching `teachers` row exists (data
 *      integrity issue — log + return null to fall back to admin view
 *      rather than show an empty page; admin should fix the data)
 */
export async function getTeacherScope(): Promise<TeacherScope | null> {
  const auth = await getCurrentUser();
  if (!auth) return null;
  if (auth.profile.role !== "teacher") return null;

  const supabase = await createClient();

  // 1. Find this user's teacher row.
  const { data: teacherRow } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", auth.profile.id)
    .maybeSingle();

  if (!teacherRow) {
    // Data integrity: user.role=teacher but no teachers row. Log a hint
    // and treat as admin-view fallback so the user isn't locked out.
    console.warn(
      `[teacher-scope] User ${auth.profile.id} has role=teacher but no teachers row — admin should link them at /setup/teachers.`,
    );
    return null;
  }

  const teacherId = teacherRow.id;

  // 2. Resolve current academic year — scope is always per-current-year.
  //    Past-year offerings shouldn't grant teachers access to (different)
  //    classrooms that happen to share an id. Current-year classrooms have
  //    DIFFERENT ids per year (each year has its own ป.4/1 record), so the
  //    cross-year stale offerings would be filtered out naturally; but
  //    test/dev data can have current-year offerings linking to past/future
  //    subjects that surface a "ghost classroom" in selectors (no real
  //    subjects in plan). Filtering offerings to classrooms-of-current-year
  //    upfront avoids both cases.
  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();

  if (!currentYear) {
    // No current year configured — return empty scope so the teacher
    // sees nothing rather than every year's data.
    return {
      teacherId,
      offeringIds: new Set(),
      teachingClassroomIds: new Set(),
      homeroomClassroomIds: new Set(),
      reachableClassroomIds: new Set(),
    };
  }

  // 3. Parallel fetch — subject offerings (joined with classroom + subject
  //    → academic_year_id each) + homeroom assignments (classroom join only).
  //    BOTH classroom and subject must be in the current year for an
  //    offering to "count" — otherwise stale test data can surface a
  //    ghost classroom in the dropdown (the room is current-year but
  //    subjects point to next year, so the plan-filter shows "no subjects"
  //    after the user picks it). User report 2026-05-20: ป.4 ปรากฏใน
  //    dropdown แม้ครูไม่ได้สอน.
  const [{ data: offerings }, { data: homerooms }] = await Promise.all([
    supabase
      .from("subject_offerings")
      .select(
        `
        id,
        classroom_id,
        classroom:classrooms!classroom_id (academic_year_id),
        subject:subjects!subject_id (academic_year_id)
        `,
      )
      .eq("teacher_id", teacherId),
    supabase
      .from("homeroom_assignments")
      .select(
        "classroom_id, classroom:classrooms!classroom_id(academic_year_id)",
      )
      .eq("teacher_id", teacherId),
  ]);

  const offeringIds = new Set<string>();
  const teachingClassroomIds = new Set<string>();
  const reachableClassroomIds = new Set<string>();
  for (const o of offerings ?? []) {
    // Both classroom AND subject must be in current year
    if (o.classroom?.academic_year_id !== currentYear.id) continue;
    if (o.subject?.academic_year_id !== currentYear.id) continue;
    offeringIds.add(o.id);
    teachingClassroomIds.add(o.classroom_id);
    reachableClassroomIds.add(o.classroom_id);
  }
  const homeroomClassroomIds = new Set<string>();
  for (const h of homerooms ?? []) {
    if (h.classroom?.academic_year_id !== currentYear.id) continue;
    homeroomClassroomIds.add(h.classroom_id);
    reachableClassroomIds.add(h.classroom_id);
  }

  return {
    teacherId,
    offeringIds,
    teachingClassroomIds,
    homeroomClassroomIds,
    reachableClassroomIds,
  };
}

/**
 * Convenience predicate: does the current scope (or admin = null) allow
 * the given offering id?
 *
 *   admin → always true
 *   teacher → only if offering is in their teaching set
 */
export function canSeeOffering(
  scope: TeacherScope | null,
  offeringId: string,
): boolean {
  if (scope == null) return true;
  return scope.offeringIds.has(offeringId);
}

/**
 * Convenience predicate for classroom access. Teachers see classrooms
 * they teach in OR are homeroom for.
 */
export function canSeeClassroom(
  scope: TeacherScope | null,
  classroomId: string,
): boolean {
  if (scope == null) return true;
  return scope.reachableClassroomIds.has(classroomId);
}

/**
 * Convenience predicate for homeroom-only access (e.g. daily attendance,
 * ปพ.5 รวมชั้น). Teachers only see classrooms they're explicitly assigned
 * as a homeroom teacher for — being a subject teacher isn't enough.
 */
export function canSeeAsHomeroom(
  scope: TeacherScope | null,
  classroomId: string,
): boolean {
  if (scope == null) return true;
  return scope.homeroomClassroomIds.has(classroomId);
}
