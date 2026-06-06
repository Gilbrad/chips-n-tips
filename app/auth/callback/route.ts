import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const redirectTo = next.startsWith('/') ? next : '/'

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
      }

      return NextResponse.redirect(
        new URL(
          `/login?error_description=${encodeURIComponent(error.message)}`,
          requestUrl.origin,
        ),
      )
    } catch {
      return NextResponse.redirect(
        new URL(
          '/login?message=Supabase%20environment%20variables%20are%20missing.',
          requestUrl.origin,
        ),
      )
    }
  }

  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
