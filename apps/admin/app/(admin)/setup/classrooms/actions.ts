"use server";

import { createClient } from "@pp5/database/server";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWriteAccess } from "@/lib/access";

async function ensureAdmin(): Promise<{ error: string } | null> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    return { error: "ไม่มีสิทธิ์ในการดำเนินการ" };
  }
  return null;
}

/** Resolve the current academic year row, or throw if none is set. */
async function getCurrentYear() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, year_be")
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("ยังไม่มีปีปัจจุบันในระบบ");
  return data;
}

/**
 * Add the next classroom (room_number = max+1) for a given grade level
 * under the current academic year.
 */
export async function addClassroom(formData: FormData) {
  await requireWriteAccess();
  const guard = await ensureAdmin();
  if (guard) throw new Error(guard.error);

  const gradeLevelId = String(formData.get("grade_level_id") ?? "").trim();
  if (!gradeLevelId) throw new Error("missing grade_level_id");

  const supabase = await createClient();
  const currentYear = await getCurrentYear();

  // Find the highest room_number for this grade in this year
  const { data: existing, error: findError } = await supabase
    .from("classrooms")
    .select("room_number")
    .eq("academic_year_id", currentYear.id)
    .eq("grade_level_id", gradeLevelId)
    .order("room_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw new Error(findError.message);

  const nextRoom = (existing?.room_number ?? 0) + 1;

  const { error: insertError } = await supabase.from("classrooms").insert({
    academic_year_id: currentYear.id,
    grade_level_id: gradeLevelId,
    room_number: nextRoom,
  });
  if (insertError) throw new Error(insertError.message);

  revalidatePath("/setup/classrooms");
}

/**
 * Remove the LAST classroom (highest room_number) for a given grade level
 * under the current academic year. Cascades to enrollments/attendance/etc.
 */
export async function removeLastClassroom(formData: FormData) {
  await requireWriteAccess();
  const guard = await ensureAdmin();
  if (guard) throw new Error(guard.error);

  const gradeLevelId = String(formData.get("grade_level_id") ?? "").trim();
  if (!gradeLevelId) throw new Error("missing grade_level_id");

  const supabase = await createClient();
  const currentYear = await getCurrentYear();

  // Find the last room
  const { data: lastRoom, error: findError } = await supabase
    .from("classrooms")
    .select("id, room_number")
    .eq("academic_year_id", currentYear.id)
    .eq("grade_level_id", gradeLevelId)
    .order("room_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (!lastRoom) {
    // Nothing to remove — silent noop
    revalidatePath("/setup/classrooms");
    return;
  }

  const { error: deleteError } = await supabase
    .from("classrooms")
    .delete()
    .eq("id", lastRoom.id);

  if (deleteError) {
    // FK violation is unlikely here (all references are ON DELETE CASCADE)
    // but log to a friendly error just in case
    if (deleteError.code === "23503") {
      redirect(
        `/setup/classrooms?error=${encodeURIComponent("ไม่สามารถลบห้องนี้ได้")}`,
      );
    }
    throw new Error(deleteError.message);
  }

  revalidatePath("/setup/classrooms");
}
