"use server";

import { createAdminClient } from "@pp5/database/admin";
import { createClient } from "@pp5/database/server";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildStandardHolidaysForYear } from "./holidays-data";
import { requireWriteAccess } from "@/lib/access";

export type HolidayFormState = {
  error: string | null;
  fieldErrors?: {
    date?: string;
    name?: string;
  };
};

async function ensureAdmin(): Promise<HolidayFormState | null> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    return { error: "ไม่มีสิทธิ์ในการดำเนินการ" };
  }
  return null;
}

function parseForm(formData: FormData):
  | { ok: true; date: string; name: string }
  | { ok: false; state: HolidayFormState } {
  const date = String(formData.get("date") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  const fieldErrors: HolidayFormState["fieldErrors"] = {};
  if (!date) fieldErrors.date = "กรุณาเลือกวันที่";
  if (!name) fieldErrors.name = "กรุณากรอกชื่อวันหยุด";
  else if (name.length > 255) fieldErrors.name = "ชื่อยาวเกินไป";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, state: { error: "ข้อมูลไม่ถูกต้อง", fieldErrors } };
  }
  return { ok: true, date, name };
}

/**
 * Resolve the current academic year row — used by all holiday operations
 * since holidays are scoped to one academic year.
 */
async function getCurrentAcademicYear(): Promise<
  { id: string; year_be: number; start_date: string | null; end_date: string | null } | null
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("academic_years")
    .select("id, year_be, start_date, end_date")
    .eq("is_current", true)
    .maybeSingle();
  return data;
}

export async function createHoliday(
  _prev: HolidayFormState,
  formData: FormData,
): Promise<HolidayFormState> {
  await requireWriteAccess();
  const guard = await ensureAdmin();
  if (guard) return guard;

  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;

  const year = await getCurrentAcademicYear();
  if (!year) return { error: "ไม่พบปีการศึกษาปัจจุบัน" };

  const admin = createAdminClient();
  const { error } = await admin.from("holidays").insert({
    date: parsed.date,
    name: parsed.name,
    type: "school", // admin-added holidays default to 'school' type
    academic_year_id: year.id,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error: `วันที่ ${parsed.date} มีในระบบแล้ว`,
        fieldErrors: { date: "วันที่นี้ถูกใช้แล้ว" },
      };
    }
    return { error: `ไม่สามารถเพิ่ม: ${error.message}` };
  }

  revalidatePath("/setup/holidays");
  redirect("/setup/holidays");
}

export async function updateHoliday(
  _prev: HolidayFormState,
  formData: FormData,
): Promise<HolidayFormState> {
  await requireWriteAccess();
  const guard = await ensureAdmin();
  if (guard) return guard;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ไม่พบ id" };

  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;

  const admin = createAdminClient();
  const { error } = await admin
    .from("holidays")
    .update({ date: parsed.date, name: parsed.name })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        error: `วันที่ ${parsed.date} มีในระบบแล้ว`,
        fieldErrors: { date: "วันที่นี้ถูกใช้แล้ว" },
      };
    }
    return { error: `ไม่สามารถบันทึก: ${error.message}` };
  }

  revalidatePath("/setup/holidays");
  redirect("/setup/holidays");
}

export async function deleteHoliday(formData: FormData) {
  await requireWriteAccess();
  const guard = await ensureAdmin();
  if (guard) throw new Error(guard.error ?? "ไม่มีสิทธิ์");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("missing id");

  const admin = createAdminClient();
  const { error } = await admin.from("holidays").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/setup/holidays");
}

/**
 * Bulk-insert Thai standard holidays for the current academic year.
 * Uses ON CONFLICT DO NOTHING so re-running is safe (only adds missing).
 *
 * Boundary: school year runs 16 พ.ค. (BE) → 15 พ.ค. (BE+1).
 *   - Start uses `academic_years.start_date` (วันเริ่มภาคเรียนที่ 1) if set.
 *   - End is ALWAYS derived from year_be — `end_date` semantically means
 *     "วันเริ่มภาคเรียนที่ 2" now, not "year end", so we can't use it here.
 */
export async function seedThaiHolidays(): Promise<void> {
  await requireWriteAccess();
  const guard = await ensureAdmin();
  if (guard) throw new Error(guard.error ?? "ไม่มีสิทธิ์");

  const year = await getCurrentAcademicYear();
  if (!year) throw new Error("ไม่พบปีการศึกษาปัจจุบัน");

  const baseCe = year.year_be - 543;
  // Default school year window: 16 พ.ค. (current BE) → 15 พ.ค. (next BE)
  const startIso = year.start_date ?? `${baseCe}-05-16`;
  // Always compute year-end from year_be (semester schedule is hard-coded to
  // the standard Thai academic calendar).
  const endIso = `${baseCe + 1}-05-15`;

  const standard = buildStandardHolidaysForYear(year.year_be, startIso, endIso);
  if (standard.length === 0) return;

  const rows = standard.map((h) => ({
    date: h.date,
    name: h.name,
    type: "government" as const,
    academic_year_id: year.id,
  }));

  const admin = createAdminClient();
  // UNIQUE(date, type) blocks duplicates — `ignoreDuplicates: true` makes
  // re-running idempotent.
  const { error } = await admin
    .from("holidays")
    .upsert(rows, { onConflict: "date,type", ignoreDuplicates: true });
  if (error) throw new Error(`ไม่สามารถดึงวันหยุด: ${error.message}`);

  revalidatePath("/setup/holidays");
}
