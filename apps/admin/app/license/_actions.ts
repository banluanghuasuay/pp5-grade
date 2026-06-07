"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { verifyToken } from "../../lib/license";

type ActionState = { success: boolean; error?: string } | null;

export async function saveLicenseKey(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = (formData.get("license_key") as string | null)?.trim();
  if (!token) return { success: false, error: "กรุณากรอก License Key" };

  // Verify signature + expiry
  const result = await verifyToken(token);
  if (!result.valid) {
    const messages: Record<string, string> = {
      invalid: "License Key ไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่",
      expired: "License Key นี้หมดอายุแล้ว กรุณาติดต่อผู้พัฒนาเพื่อต่ออายุ",
      missing: "License Key ไม่ถูกต้อง",
      school_mismatch: "License Key ไม่ตรงกับโรงเรียน",
    };
    return { success: false, error: messages[result.reason] };
  }

  // Verify school name matches DB
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data: school } = await supabase
    .from("schools")
    .select("id, name_th")
    .maybeSingle();

  if (!school) {
    return { success: false, error: "ยังไม่ได้ตั้งค่าข้อมูลโรงเรียน กรุณาติดต่อผู้ดูแลระบบ" };
  }

  if (school.name_th && result.payload.school_name !== school.name_th) {
    return {
      success: false,
      error: `License Key นี้ออกให้กับ "${result.payload.school_name}" ไม่ตรงกับโรงเรียนนี้`,
    };
  }

  // Save to DB
  const { error } = await supabase
    .from("schools")
    .update({ license_key: token })
    .eq("id", school.id);

  if (error) {
    return { success: false, error: "บันทึกไม่สำเร็จ กรุณาลองใหม่" };
  }

  redirect("/");
}
