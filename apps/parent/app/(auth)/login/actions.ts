"use server";

import { createClient } from "@pp5/database/server";
import { redirect } from "next/navigation";

export type LoginState = {
  error: string | null;
};

const STUDENT_DOMAIN = "student.pp5.local";

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const studentCode = String(formData.get("studentCode") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!studentCode || !password) {
    return { error: "กรุณากรอกรหัสนักเรียนและรหัสผ่าน" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: `${studentCode}@${STUDENT_DOMAIN}`,
    password,
  });

  if (error) {
    return { error: "รหัสนักเรียนหรือรหัสผ่านไม่ถูกต้อง" };
  }

  redirect("/");
}
