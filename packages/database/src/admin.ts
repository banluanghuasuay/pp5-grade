import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Create a Supabase client with the **service_role** key.
 *
 * 🚨 SERVER-ONLY · NEVER import this from a Client Component.
 *
 * This client:
 * - Bypasses ALL Row-Level Security policies
 * - Has full database admin powers (can read/write any table, modify auth.users)
 * - Must be invoked only from Server Actions, Route Handlers, or build scripts
 *
 * The env var `SUPABASE_SERVICE_ROLE_KEY` intentionally lacks the `NEXT_PUBLIC_`
 * prefix so Next.js will refuse to bundle its value into client code — calling
 * this from a client component will fail at runtime with an undefined key.
 *
 * Typical uses:
 * - Creating auth users for staff (Phase 1.9 — teachers) and students (1.10)
 * - Resetting passwords from the admin panel
 * - System maintenance scripts
 *
 * Auth options:
 * - `persistSession: false` — service clients are stateless; no cookies needed
 * - `autoRefreshToken: false` — no token to refresh (it's the static service key)
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var. " +
        "createAdminClient() must be called from a server context with both set.",
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
