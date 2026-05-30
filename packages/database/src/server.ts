import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

type CookieToSet = { name: string; value: string; options: CookieOptions }

/** Per-app cookie prefix — see comment in `./client.ts` for rationale. */
const COOKIE_NAME = process.env.NEXT_PUBLIC_SUPABASE_AUTH_STORAGE_KEY

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(COOKIE_NAME ? { cookieOptions: { name: COOKIE_NAME } } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll was called from a Server Component.
            // Cookie refresh is handled by middleware — safe to ignore here.
          }
        },
      },
    },
  )
}
