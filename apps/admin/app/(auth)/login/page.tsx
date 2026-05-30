import { createClient } from "@pp5/database/server";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "เข้าสู่ระบบ · ระบบบันทึกผลการเรียน",
};

/**
 * Login page — fetches the school profile (logo + name + affiliation)
 * to show the school's identity above the login form. School row may
 * not exist yet (fresh install) — in that case LoginForm falls back to
 * a generic header.
 *
 * Server-side fetch is cheap (1 row, no auth required for these public
 * fields) and avoids a client-side flash of the generic header.
 */
export default async function LoginPage() {
  const supabase = await createClient();
  const { data: school } = await supabase
    .from("schools")
    .select("name_th, affiliation, logo_url")
    .maybeSingle();

  return (
    <LoginForm
      school={
        school
          ? {
              nameTh: school.name_th,
              affiliation: school.affiliation,
              logoUrl: school.logo_url,
            }
          : null
      }
    />
  );
}
