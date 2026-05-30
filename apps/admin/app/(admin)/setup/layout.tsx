import { getCurrentUser } from "@pp5/database/queries";
import { redirect } from "next/navigation";

/**
 * Setup routes — auth required, role check is per-page now.
 *
 * Previously this layout bounced all non-admin staff to "/" but teachers
 * legitimately need access to a subset (the 3 menus opened in Phase 1:
 * การประเมิน — score-structure, activities, characteristics,
 * reading-thinking, competency; บันทึกเวลาเรียน — attendance, by-subject).
 *
 * Admin-only pages (school, academic-years, classrooms, holidays,
 * teachers, students, subjects, teaching, homerooms) each call
 * `requireAdmin()` from `@/lib/teacher-scope` at the top of their
 * server component — see that helper for the redirect logic.
 */
export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getCurrentUser();
  if (!auth) redirect("/login");

  return <>{children}</>;
}
