"use server";

import { createClient } from "@pp5/database/server";
import { redirect } from "next/navigation";

export type LoginState = {
  error: string | null;
};

const ADMIN_DOMAIN = "admin.pp5.local";
const TEACHER_DOMAIN = "teacher.pp5.local";

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };
  }

  const supabase = await createClient();

  // Try admin domain first
  let { error } = await supabase.auth.signInWithPassword({
    email: `${username}@${ADMIN_DOMAIN}`,
    password,
  });

  // Fallback to teacher domain
  if (error) {
    ({ error } = await supabase.auth.signInWithPassword({
      email: `${username}@${TEACHER_DOMAIN}`,
      password,
    }));
  }

  if (error) {
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }

  // signIn succeeded — but check if the account is still active.
  // Otherwise the proxy would let them in then page-level checks would
  // kick them back to /login, creating a confusing loop.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      return {
        error: "บัญชีนี้ถูกปิดใช้งาน · กรุณาติดต่อผู้ดูแลระบบ",
      };
    }
  }

  // Success → redirect (throws — no return needed)
  redirect("/");
}
