"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyShortKey } from "../../lib/license";

type ActionState = { success: boolean; error?: string } | null;

export async function saveLicenseKey(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const key = (formData.get("license_key") as string | null)?.trim();
  if (!key) return { success: false, error: "กรุณากรอก License Key" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // ต้องได้ชื่อโรงเรียนก่อนถึงจะ verify ได้ (HMAC ผูกกับชื่อโรงเรียน)
  const { data: school } = await supabase
    .from("schools")
    .select("id, name_th")
    .maybeSingle();

  if (!school) {
    return {
      success: false,
      error: "ยังไม่ได้ตั้งค่าข้อมูลโรงเรียน กรุณาติดต่อผู้ดูแลระบบ",
    };
  }

  const result = await verifyShortKey(key, school.name_th ?? "");
  if (!result.valid) {
    const messages: Record<string, string> = {
      invalid: "License Key ไม่ถูกต้อง (อาจเป็นรหัสของโรงเรียนอื่น)",
      expired: "License Key นี้หมดอายุแล้ว กรุณาติดต่อผู้พัฒนาเพื่อต่ออายุ",
      missing: "ระบบยังไม่ได้ตั้งค่า License กรุณาติดต่อผู้พัฒนา",
      school_mismatch: "License Key ไม่ตรงกับโรงเรียน",
    };
    return { success: false, error: messages[result.reason] };
  }

  // Save to DB
  const { error } = await supabase
    .from("schools")
    .update({ license_key: key })
    .eq("id", school.id);

  if (error) {
    return { success: false, error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }

  // ล้าง access cache cookie เพื่อให้ proxy.ts ดึงสถานะใหม่จาก DB ทันที
  const cookieStore = await cookies();
  cookieStore.delete("pp5-access");

  redirect("/");
}
