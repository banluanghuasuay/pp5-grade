import { cache } from "react";
import { createClient } from "./server";

/**
 * Get the currently authenticated user and their profile row from `public.users`.
 *
 * Returns `null` when:
 * - No auth session
 * - Auth session exists but no matching row in `public.users` (orphan account)
 * - User is marked `is_active = false`
 *
 * Use in Server Components, Server Actions, and Route Handlers.
 *
 * RLS policy `users_self_read` allows the authenticated user to read their own row.
 *
 * Wrapped in React `cache()` — multiple calls within the same request tree (e.g. from
 * both a layout and a nested layout) only hit the database once.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, username, full_name, title, role, is_active")
    .eq("auth_user_id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) return null;

  return { user, profile };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * Get the currently authenticated student (parent portal).
 *
 * Returns `null` when:
 * - No auth session
 * - Auth session exists but no matching row in `public.students` (e.g. a staff
 *   user accidentally logged into the parent portal)
 *
 * Wrapped in React `cache()` — see `getCurrentUser`.
 */
export const getCurrentStudent = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select(
      "id, student_code, title, first_name, last_name, gender, birth_date",
    )
    .eq("auth_user_id", user.id)
    .single();

  if (studentError || !student) return null;

  return { user, student };
});

export type CurrentStudent = NonNullable<
  Awaited<ReturnType<typeof getCurrentStudent>>
>;
