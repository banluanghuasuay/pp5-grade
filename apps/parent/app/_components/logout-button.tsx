"use client";

import { Button } from "@pp5/ui";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

/**
 * Logout button with pending feedback. Without this the button just sits there
 * after a click (the server action signs out + redirects), so it looks like
 * nothing happened until the page suddenly changes. Uses useFormStatus to read
 * the wrapping <form action={logoutAction}> pending state.
 */
export function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
        {pending ? "กำลังออก..." : "ออกจากระบบ"}
      </span>
    </Button>
  );
}
