import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Optional cookie name prefix to scope auth cookies per app.
 *
 * On the same dev host (`localhost`), admin (port 3000) and parent (port 3001)
 * would otherwise share Supabase cookies — logging into one overwrites the other.
 * Set this env var differently per app to keep sessions isolated:
 *
 *   apps/admin/.env.local:  NEXT_PUBLIC_SUPABASE_AUTH_STORAGE_KEY=sb-pp5-admin
 *   apps/parent/.env.local: NEXT_PUBLIC_SUPABASE_AUTH_STORAGE_KEY=sb-pp5-parent
 *
 * In production, admin and parent run on different domains so this is not strictly
 * needed — but keeping it set is harmless and makes dev behaviour match prod.
 */
const COOKIE_NAME = process.env.NEXT_PUBLIC_SUPABASE_AUTH_STORAGE_KEY

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    COOKIE_NAME ? { cookieOptions: { name: COOKIE_NAME } } : undefined,
  )
}
