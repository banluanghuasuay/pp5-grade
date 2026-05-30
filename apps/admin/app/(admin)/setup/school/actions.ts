"use server";

import { createAdminClient } from "@pp5/database/admin";
import { getCurrentUser } from "@pp5/database/queries";
import { revalidatePath } from "next/cache";

export type SchoolFormState = {
  error: string | null;
  success: boolean;
  fieldErrors?: {
    name_th?: string;
  };
};

/** Separate state type for logo upload/remove — they don't share field
 *  errors with the main school form. `logoUrl` carries the new URL back
 *  so the client can show the updated preview without re-fetching. */
export type SchoolLogoState = {
  error: string | null;
  success: boolean;
  logoUrl?: string | null;
};

const LOGO_BUCKET = "school-logos";
const LOGO_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;
const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

async function ensureAdmin(): Promise<SchoolFormState | null> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    return { error: "ไม่มีสิทธิ์ในการดำเนินการ", success: false };
  }
  return null;
}

async function ensureAdminLogo(): Promise<SchoolLogoState | null> {
  const auth = await getCurrentUser();
  if (!auth || auth.profile.role !== "admin") {
    return { error: "ไม่มีสิทธิ์ในการดำเนินการ", success: false };
  }
  return null;
}

/**
 * Pull the storage-relative path out of a Supabase public URL.
 *   https://<proj>.supabase.co/storage/v1/object/public/school-logos/<id>/logo-123.png
 *                                                      ^^^^^^^^^^^^^^^ marker
 * Returns null if the URL doesn't match (= it was a manually-pasted
 * external URL from before, not a file we own).
 */
function extractStoragePath(
  publicUrl: string,
  bucket: string,
): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

/**
 * Update the school's settings. Schools is a single-tenant table — there's
 * exactly one row (seeded by SQL on first setup). This action UPDATEs that row.
 *
 * If the schools table is empty (migration not run), the action will fail with
 * a clear message asking admin to run the seed SQL.
 */
export async function updateSchool(
  _prev: SchoolFormState,
  formData: FormData,
): Promise<SchoolFormState> {
  const guard = await ensureAdmin();
  if (guard) return guard;

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return {
      error:
        "ไม่พบ id ของโรงเรียน — กรุณารัน SQL seed (ดู /setup/school วิธีการตั้งค่า)",
      success: false,
    };
  }

  const name_th = String(formData.get("name_th") ?? "").trim();
  if (!name_th) {
    return {
      error: "กรุณากรอกชื่อโรงเรียน",
      success: false,
      fieldErrors: { name_th: "ต้องกรอก" },
    };
  }

  // Note: `logo_url` is intentionally NOT touched here. Logo is handled by
  // the dedicated `uploadSchoolLogo` / `removeSchoolLogo` actions below
  // (file upload to Supabase Storage, then save the public URL). Including
  // logo_url in this payload would let stale form state wipe a freshly-
  // uploaded logo.
  const payload = {
    name_th,
    name_en: String(formData.get("name_en") ?? "").trim() || null,
    affiliation: String(formData.get("affiliation") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    district: String(formData.get("district") ?? "").trim() || null,
    province: String(formData.get("province") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    director_name: String(formData.get("director_name") ?? "").trim() || null,
    director_title:
      String(formData.get("director_title") ?? "").trim() || "ผู้อำนวยการ",
    deputy_director_name:
      String(formData.get("deputy_director_name") ?? "").trim() || null,
    academic_head_name:
      String(formData.get("academic_head_name") ?? "").trim() || null,
    assessment_officer_name:
      String(formData.get("assessment_officer_name") ?? "").trim() || null,
  };

  const admin = createAdminClient();
  const { error } = await admin.from("schools").update(payload).eq("id", id);
  if (error) {
    return { error: `ไม่สามารถบันทึก: ${error.message}`, success: false };
  }

  revalidatePath("/setup/school");
  return { error: null, success: true };
}

/**
 * Upload a new school logo to Supabase Storage and store its public URL
 * in `schools.logo_url`. Replaces any previous logo (old file is cleaned
 * up best-effort after the DB write succeeds).
 *
 * Form fields:
 *   - `id`   school UUID (hidden input on the form)
 *   - `file` the image file from `<input type="file" />`
 *
 * Validations:
 *   - MIME type ∈ image/png | image/jpeg | image/webp
 *   - size ≤ 2 MB
 *
 * Filename pattern: `<schoolId>/logo-<timestamp>.<ext>` — including the
 * timestamp prevents the CDN from serving a stale cached version after
 * the user uploads a replacement.
 */
export async function uploadSchoolLogo(
  _prev: SchoolLogoState,
  formData: FormData,
): Promise<SchoolLogoState> {
  const guard = await ensureAdminLogo();
  if (guard) return guard;

  const schoolId = String(formData.get("id") ?? "").trim();
  if (!schoolId) {
    return { error: "ไม่พบ id โรงเรียน", success: false };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "กรุณาเลือกไฟล์รูปภาพ", success: false };
  }
  if (
    !LOGO_ALLOWED_TYPES.includes(
      file.type as (typeof LOGO_ALLOWED_TYPES)[number],
    )
  ) {
    return {
      error: "รองรับเฉพาะไฟล์ PNG / JPG / WebP",
      success: false,
    };
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { error: "ไฟล์ใหญ่เกิน 2 MB", success: false };
  }

  const admin = createAdminClient();

  // 1. Snapshot the current logo_url so we can clean up the old file after
  //    the new one is in place (best-effort — failure here is non-fatal).
  const { data: currentRow } = await admin
    .from("schools")
    .select("logo_url")
    .eq("id", schoolId)
    .maybeSingle();
  const oldUrl = currentRow?.logo_url ?? null;

  // 2. Upload the new file to Storage. Use a timestamp in the filename so
  //    consecutive uploads never share a path (avoids CDN cache showing
  //    the previous image after replace).
  const extFromMime = (file.type.split("/")[1] ?? "png").replace(
    "jpeg",
    "jpg",
  );
  const path = `${schoolId}/logo-${Date.now()}.${extFromMime}`;
  const { error: uploadErr } = await admin.storage
    .from(LOGO_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadErr) {
    return {
      error: `อัปโหลดไม่สำเร็จ: ${uploadErr.message}`,
      success: false,
    };
  }

  // 3. Resolve the public URL and write it back to schools.logo_url.
  const { data: pub } = admin.storage.from(LOGO_BUCKET).getPublicUrl(path);
  const newUrl = pub.publicUrl;
  const { error: updateErr } = await admin
    .from("schools")
    .update({ logo_url: newUrl })
    .eq("id", schoolId);
  if (updateErr) {
    return {
      error: `บันทึก URL ลงฐานข้อมูลไม่สำเร็จ: ${updateErr.message}`,
      success: false,
    };
  }

  // 4. Best-effort cleanup of the previous logo file (only if it's one of
  //    our own Storage files; externally-pasted URLs from the old text-
  //    input UI won't match and are left alone).
  if (oldUrl) {
    const oldPath = extractStoragePath(oldUrl, LOGO_BUCKET);
    if (oldPath) {
      await admin.storage.from(LOGO_BUCKET).remove([oldPath]);
    }
  }

  // Refresh the school page itself + the layout (sidebar shows the logo).
  revalidatePath("/setup/school");
  revalidatePath("/", "layout");
  return { error: null, success: true, logoUrl: newUrl };
}

/**
 * Clear the school logo — sets `schools.logo_url` to NULL and removes the
 * file from Storage (best-effort). Used by the "ลบโลโก้" button on the
 * school form.
 */
export async function removeSchoolLogo(
  _prev: SchoolLogoState,
  formData: FormData,
): Promise<SchoolLogoState> {
  const guard = await ensureAdminLogo();
  if (guard) return guard;

  const schoolId = String(formData.get("id") ?? "").trim();
  if (!schoolId) {
    return { error: "ไม่พบ id โรงเรียน", success: false };
  }

  const admin = createAdminClient();

  const { data: currentRow } = await admin
    .from("schools")
    .select("logo_url")
    .eq("id", schoolId)
    .maybeSingle();
  const oldUrl = currentRow?.logo_url ?? null;

  // Clear the DB row first — the file delete is best-effort.
  const { error: updateErr } = await admin
    .from("schools")
    .update({ logo_url: null })
    .eq("id", schoolId);
  if (updateErr) {
    return {
      error: `ล้าง URL ในฐานข้อมูลไม่สำเร็จ: ${updateErr.message}`,
      success: false,
    };
  }

  if (oldUrl) {
    const oldPath = extractStoragePath(oldUrl, LOGO_BUCKET);
    if (oldPath) {
      await admin.storage.from(LOGO_BUCKET).remove([oldPath]);
    }
  }

  revalidatePath("/setup/school");
  revalidatePath("/", "layout");
  return { error: null, success: true, logoUrl: null };
}
