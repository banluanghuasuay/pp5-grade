"use server";

import { createClient } from "@pp5/database/server";

export type ChangePasswordState = {
  error: string | null;
  success: boolean;
};

/**
 * Self-service password change for the logged-in student. Uses the session
 * client (cookie-authed) so `updateUser` targets the current student only —
 * no admin privileges needed. New students start with the default "123456"
 * (set at creation) and change it here.
 */
export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) {
    return { error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัว", success: false };
  }
  if (password !== confirm) {
    return { error: "รหัสผ่านยืนยันไม่ตรงกัน", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", success: false };
  }
  return { error: null, success: true };
}
