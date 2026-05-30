import {
  createServerClient,
  type CookieOptions,
} from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'

type CookieToSet = { name: string; value: string; options: CookieOptions }

/** Per-app cookie prefix — see comment in `./client.ts` for rationale. */
const COOKIE_NAME = process.env.NEXT_PUBLIC_SUPABASE_AUTH_STORAGE_KEY

export type UpdateSessionOptions = {
  /**
   * Routes accessible without authentication.
   * Exact match or `path/*` prefix.
   * @default ['/login']
   */
  publicPaths?: string[]
  /**
   * Where to redirect unauthenticated users.
   * @default '/login'
   */
  loginPath?: string
  /**
   * Where to redirect authenticated users when they hit the loginPath.
   * @default '/'
   */
  homePath?: string
  /**
   * Optional callback to validate the session belongs to THIS app.
   *
   * Use it to prevent cross-app session leakage: e.g. an admin who logged into
   * `apps/admin` opens `apps/parent` — they share cookies because both run on
   * `localhost`, so the parent proxy would otherwise treat the admin as
   * "authenticated" and create a redirect loop with the page-level student check.
   *
   * Return `true` if the user is valid for this app, `false` otherwise.
   * When `false`, the user is treated as unauthenticated (but the session cookie
   * is NOT cleared, so the user can switch back to the correct app).
   */
  validateSession?: (
    supabase: SupabaseClient<Database>,
    user: User,
  ) => Promise<boolean>
}

/**
 * Refreshes the Supabase session cookie and enforces route protection.
 *
 * Call from `proxy.ts` (Next.js 16). CRITICAL: never remove the `getUser()` call.
 * It refreshes the access token and writes new cookies onto the response.
 */
export async function updateSession(
  request: NextRequest,
  options: UpdateSessionOptions = {},
) {
  const {
    publicPaths = ['/login'],
    loginPath = '/login',
    homePath = '/',
    validateSession,
  } = options

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(COOKIE_NAME ? { cookieOptions: { name: COOKIE_NAME } } : {}),
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // CRITICAL: refreshes the access token + writes new cookies on supabaseResponse
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  // If validateSession is provided, run it to confirm the session is for this app
  let user: User | null = authUser
  if (authUser && validateSession) {
    const isValid = await validateSession(supabase, authUser)
    if (!isValid) {
      // Cross-app session — treat as unauthenticated but keep cookies intact
      // so the user can switch back to the app where they're valid
      user = null
    }
  }

  const pathname = request.nextUrl.pathname
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )

  // Not authenticated + trying to access protected route → redirect to login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = loginPath
    return copyCookies(supabaseResponse, NextResponse.redirect(url))
  }

  // Authenticated + visiting login → redirect to home
  if (user && pathname === loginPath) {
    const url = request.nextUrl.clone()
    url.pathname = homePath
    return copyCookies(supabaseResponse, NextResponse.redirect(url))
  }

  return supabaseResponse
}

/** Copy cookies from Supabase response onto a custom response (e.g. a redirect). */
function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value)
  })
  return to
}
