'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  createClient,
  hasSupabaseConfig,
} from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const isConfigured = hasSupabaseConfig()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    const params = new URLSearchParams(window.location.search)
    return params.get('error_description') ?? params.get('message')
  })
  const [loading, setLoading] = useState(false)

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isConfigured) {
      setError('Supabase environment variables are not configured yet.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    router.push('/')
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
            Log in
          </h1>
        </div>

        <form className="space-y-3" onSubmit={handleEmailLogin}>
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
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="password"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              required
              type="password"
              value={password}
            />
          </div>

          <Button className="h-11 w-full" disabled={loading} type="submit">
            Log in
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          OAuth
          <span className="h-px flex-1 bg-border" />
        </div>

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

        {!isConfigured ? (
          <p className="mt-4 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            Continue offline now, then add Supabase env vars when you are ready
            for accounts.
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
            New here?{' '}
            <Link className="font-medium text-primary" href="/signup">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
