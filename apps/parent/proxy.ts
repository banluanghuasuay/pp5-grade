import type { NextRequest } from "next/server";
import { updateSession } from "@pp5/database/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request, {
    // This app is for students/parents — session is only valid if there's a row in `students`
    validateSession: async (supabase, user) => {
      const { data } = await supabase
        .from("students")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      return !!data;
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
