'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  createClient,
  hasSupabaseConfig,
  isEmailSignupEnabled,
} from '@/lib/supabase/client'

export default function SignUpPage() {
  const router = useRouter()
  const isConfigured = hasSupabaseConfig()
  const emailSignupEnabled = isEmailSignupEnabled()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEmailSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isConfigured) {
      setError('Supabase environment variables are not configured yet.')
      return
    }

    if (!emailSignupEnabled) {
      setError('Email signup is temporarily unavailable.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (data.session) {
      router.push('/')
      return
    }

    setError('Email signup could not create an immediate session.')
  }

  const handleGoogleOAuth = async () => {
    if (!isConfigured) {
      setError('Add your Supabase URL and publishable key before using OAuth.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
      provider: 'google',
    })

    setLoading(false)

    if (oauthError) {
      setError(oauthError.message)
    }
  }

  return (
    <main className="flex min-h-dvh items-center bg-background px-4 py-8 text-foreground">
      <section className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Chips n&apos; Tips
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Sign up
          </h1>
        </div>

        {emailSignupEnabled ? (
          <>
            <form className="space-y-3" onSubmit={handleEmailSignup}>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <input
                  autoComplete="email"
                  className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  id="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <input
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  id="password"
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  required
                  type="password"
                  value={password}
                />
              </div>

              <Button className="h-11 w-full" disabled={loading} type="submit">
                Create account
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        ) : null}

        <div className="grid gap-3">
          <Button
            disabled={loading}
            onClick={() => void handleGoogleOAuth()}
            type="button"
            variant="outline"
          >
            Continue with Google
          </Button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3">
          <Link
            className={buttonVariants({
              className: 'h-11 w-full',
              variant: 'outline',
            })}
            href="/"
          >
            Continue offline
          </Link>
          <p className="text-center text-sm text-muted-foreground">
            Have an account?{' '}
            <Link className="font-medium text-primary" href="/login">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
