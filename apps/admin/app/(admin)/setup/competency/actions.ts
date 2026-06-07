"use server";

import { createAdminClient } from "@pp5/database/admin";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";
import { ensureSemesterEditable } from "@/lib/current-term";
import {
  ensureCanEditAsHomeroom,
  ensureCanEvaluateStudent,
} from "@/lib/teacher-scope";
import { requireWriteAccess } from "@/lib/access";

async function ensureAdmin(): Promise<void> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    throw new Error("ไม่มีสิทธิ์");
  }
}

/** Allowed field names for the 5 competency dimensions. */
const FIELDS = [
  "communication_score",
  "thinking_score",
  "problem_solving_score",
  "life_skills_score",
  "technology_score",
] as const;
type Field = (typeof FIELDS)[number];

/**
 * Save a single competency score (0-3) for one student × dimension.
 *
 * UPSERT keyed on (student, year, semester); Supabase preserves columns
 * not in the payload so updating one field doesn't blow away the rest.
 *
 * Empty string → set the field to NULL.
 */
export async function saveCompetencyScore(formData: FormData): Promise<void> {
  await requireWriteAccess();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const yearId = String(formData.get("year_id") ?? "").trim();
  const semRaw = String(formData.get("semester") ?? "").trim();
  const field = String(formData.get("field") ?? "").trim() as Field;
  const valueRaw = String(formData.get("score") ?? "").trim();

  if (!studentId || !yearId) throw new Error("missing student/year");

  // Teacher must be homeroom of the student's classroom (admin bypasses).
  const adminClient = createAdminClient();
  await ensureCanEvaluateStudent(adminClient, studentId, yearId);
  // 0 = annual scope (primary) · 1/2 = per-semester (secondary)
  if (semRaw !== "0" && semRaw !== "1" && semRaw !== "2") {
    throw new Error("invalid semester");
  }
  if (!FIELDS.includes(field)) throw new Error("invalid field");

  const semester: 0 | 1 | 2 =
    semRaw === "0" ? 0 : semRaw === "2" ? 2 : 1;
  await ensureSemesterEditable(semester);

  const admin = createAdminClient();

  let score: number | null = null;
  if (valueRaw !== "") {
    score = Number.parseInt(valueRaw, 10);
    if (!Number.isFinite(score) || score < 0 || score > 3) {
      throw new Error("invalid score (0-3)");
    }
  }

  const payload = {
    student_id: studentId,
    academic_year_id: yearId,
    semester,
    evaluated_by: null,
    ...(field === "communication_score"
      ? { communication_score: score }
      : {}),
    ...(field === "thinking_score" ? { thinking_score: score } : {}),
    ...(field === "problem_solving_score"
      ? { problem_solving_score: score }
      : {}),
    ...(field === "life_skills_score" ? { life_skills_score: score } : {}),
    ...(field === "technology_score" ? { technology_score: score } : {}),
  };

  const { error } = await admin
    .from("competency_evaluations")
    .upsert(payload, { onConflict: "student_id,academic_year_id,semester" });
  if (error) throw new Error(error.message);

  revalidatePath("/setup/competency");
}

/** Bulk set ONE competency field for ALL enrolled students in a classroom. */
export async function setAllCompetencyForColumn(
  formData: FormData,
): Promise<void> {
  await requireWriteAccess();
  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const yearId = String(formData.get("year_id") ?? "").trim();
  const semRaw = String(formData.get("semester") ?? "").trim();
  const field = String(formData.get("field") ?? "").trim() as Field;
  const valueRaw = String(formData.get("value") ?? "").trim();

  if (!classroomId || !yearId) throw new Error("missing classroom/year");

  // Teacher must be homeroom of the classroom (admin bypasses).
  const adminClient = createAdminClient();
  await ensureCanEditAsHomeroom(adminClient, classroomId);
  // 0 = annual scope (primary) · 1/2 = per-semester (secondary)
  if (semRaw !== "0" && semRaw !== "1" && semRaw !== "2") {
    throw new Error("invalid semester");
  }
  if (!FIELDS.includes(field)) throw new Error("invalid field");

  const semester: 0 | 1 | 2 =
    semRaw === "0" ? 0 : semRaw === "2" ? 2 : 1;
  await ensureSemesterEditable(semester);

  const admin = createAdminClient();

  // Scope enrollments to the same semester we're writing to — secondary
  // classrooms have separate enrollment rows for sem 1 vs sem 2, and
  // without this filter the upsert below would receive each student_id
  // twice → Postgres throws "ON CONFLICT DO UPDATE command cannot
  // affect row a second time".
  const { data: enrolls, error: enrollErr } = await admin
    .from("enrollments")
    .select("student_id")
    .eq("classroom_id", classroomId)
    .eq("semester", semester);
  if (enrollErr) throw new Error(enrollErr.message);

  const studentIds = Array.from(
    new Set((enrolls ?? []).map((e) => e.student_id)),
  );
  if (studentIds.length === 0) {
    revalidatePath("/setup/competency");
    return;
  }

  let score: number | null = null;
  if (valueRaw !== "") {
    score = Number.parseInt(valueRaw, 10);
    if (!Number.isFinite(score) || score < 0 || score > 3) {
      throw new Error("invalid score (0-3)");
    }
  }

  const rows = studentIds.map((sid) => ({
    student_id: sid,
    academic_year_id: yearId,
    semester,
    evaluated_by: null,
    ...(field === "communication_score"
      ? { communication_score: score }
      : {}),
    ...(field === "thinking_score" ? { thinking_score: score } : {}),
    ...(field === "problem_solving_score"
      ? { problem_solving_score: score }
      : {}),
    ...(field === "life_skills_score" ? { life_skills_score: score } : {}),
    ...(field === "technology_score" ? { technology_score: score } : {}),
  }));

  const { error } = await admin
    .from("competency_evaluations")
    .upsert(rows, { onConflict: "student_id,academic_year_id,semester" });
  if (error) throw new Error(error.message);

  revalidatePath("/setup/competency");
}
