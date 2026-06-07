"use server";

import { createAdminClient } from "@pp5/database/admin";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";
import { requireWriteAccess } from "@/lib/access";

// ============================================================
// Homeroom teacher assignments — 1 primary + 1 secondary per ห้อง.
//
// Schema (homeroom_assignments) has:
//   - UNIQUE (classroom_id, role)       → 1 ครูหลัก + 1 ครูรอง/ห้อง
//   - UNIQUE (classroom_id, teacher_id) → ครูคนเดียวกันลงห้องเดียวกัน
//                                          ทั้ง primary + secondary ไม่ได้
// `role` enum (`homeroom_role`) = 'primary' | 'secondary'
// ============================================================

export type HomeroomRole = "primary" | "secondary";

async function ensureAdmin(): Promise<void> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    throw new Error("ไม่มีสิทธิ์");
  }
}

function parseRole(raw: string): HomeroomRole {
  if (raw === "primary" || raw === "secondary") return raw;
  throw new Error("invalid role");
}

/**
 * Assign / change the homeroom teacher for a given (classroom × role).
 *
 * Form fields:
 *   - classroom_id  UUID
 *   - role          'primary' | 'secondary'
 *   - teacher_id    UUID
 *
 * Uses UPSERT on the (classroom_id, role) unique key so changing the
 * current assignment is a single round-trip. If the chosen teacher is
 * already in the OTHER role of the same classroom (e.g., trying to assign
 * teacher X as secondary when they're already primary), Postgres rejects
 * via the `(classroom_id, teacher_id)` unique constraint — surface a Thai
 * error to the client.
 */
export async function assignHomeroomTeacher(formData: FormData): Promise<void> {
  await requireWriteAccess();
  await ensureAdmin();

  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "").trim();
  const teacherId = String(formData.get("teacher_id") ?? "").trim();

  if (!classroomId) throw new Error("missing classroom_id");
  if (!teacherId) throw new Error("missing teacher_id");
  const role = parseRole(roleRaw);

  const admin = createAdminClient();

  const { data: upserted, error } = await admin
    .from("homeroom_assignments")
    .upsert(
      {
        classroom_id: classroomId,
        teacher_id: teacherId,
        role,
      },
      { onConflict: "classroom_id,role" },
    )
    .select("id");

  if (error) {
    // Postgres error code 23505 = unique_violation. Most likely the
    // `classroom_id+teacher_id` constraint — same teacher already in the
    // other role of this room.
    if (error.code === "23505") {
      throw new Error(
        "ครูคนนี้ถูกจัดเป็นครูประจำชั้น (อีกตำแหน่ง) ของห้องนี้แล้ว — เลือกคนอื่นหรือเปลี่ยน/ลบของเดิมก่อน",
      );
    }
    throw new Error(`บันทึกไม่สำเร็จ: ${error.message}`);
  }
  if (!upserted || upserted.length === 0) {
    throw new Error("บันทึกไม่สำเร็จ — UPSERT ไม่คืน row");
  }

  revalidatePath("/setup/homerooms");
}

/**
 * Remove the assignment for a (classroom × role). No-op if there's
 * nothing to remove.
 */
export async function clearHomeroomTeacher(formData: FormData): Promise<void> {
  await requireWriteAccess();
  await ensureAdmin();

  const classroomId = String(formData.get("classroom_id") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "").trim();
  if (!classroomId) throw new Error("missing classroom_id");
  const role = parseRole(roleRaw);

  const admin = createAdminClient();
  const { error } = await admin
    .from("homeroom_assignments")
    .delete()
    .eq("classroom_id", classroomId)
    .eq("role", role);
  if (error) throw new Error(`ลบไม่สำเร็จ: ${error.message}`);

  revalidatePath("/setup/homerooms");
}
