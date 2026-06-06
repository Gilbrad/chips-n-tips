'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, type ReactNode } from 'react'
import {
  CalendarDays,
  CircleDollarSign,
  LayoutDashboard,
  LogIn,
  LogOut,
  Tags,
  UserPlus,
  WalletCards,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { useFinance } from '@/components/finance-provider'
import LocalDataImportPrompt from '@/components/local-data-import-prompt'
import { cn } from '@/lib/utils'

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isConfigured, isLoading: isAuthLoading, signOut, user } = useAuth()
  const { currency, syncState } = useFinance()

  const navItems = useMemo(
    () => [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/calendar', label: 'Calendar', icon: CalendarDays },
      { href: '/currency', label: 'Currency', icon: CircleDollarSign },
      { href: '/categories', label: 'Categories', icon: Tags },
    ],
    [],
  )

  const handleAuthAction = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    await signOut()
    router.push('/login')
  }

  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup')
  ) {
    return <>{children}</>
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="flex min-h-dvh w-full gap-5">
        <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-r border-border bg-sidebar px-4 py-5 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-7 flex items-center gap-3">
              <div className="rounded-lg bg-primary p-2 text-primary-foreground">
                <WalletCards size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Finance
                </p>
                <p className="text-lg font-semibold">Chips n&apos; Tips</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href

                return (
                  <Link
                    className={cn(
                      'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                    href={href}
                    key={href}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-6 rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Session
              </p>
              <p className="mt-2 truncate text-sm font-medium">
                {user?.email ?? (isConfigured ? 'Signed out' : 'Offline mode')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Currency: {currency}
              </p>
              {user ? (
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  Backup: {syncState}
                </p>
              ) : null}
            </div>
          </div>

          {user ? (
            <Button
              className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10"
              disabled={isAuthLoading}
              onClick={handleAuthAction}
              variant="outline"
            >
              <LogOut size={16} />
              {isAuthLoading ? 'Checking session' : 'Sign out'}
            </Button>
          ) : (
            <div className="grid gap-2">
              <Button
                className="w-full justify-start gap-2"
                disabled={isAuthLoading}
                onClick={() => router.push('/login')}
                variant="outline"
              >
                <LogIn size={16} />
                {isAuthLoading ? 'Checking session' : 'Log in'}
              </Button>
              <Button
                className="w-full justify-start gap-2"
                disabled={isAuthLoading}
                onClick={() => router.push('/signup')}
              >
                <UserPlus size={16} />
                Sign up
              </Button>
            </div>
          )}
        </aside>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href

              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-[0.68rem] font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  href={href}
                  key={href}
                >
                  <Icon size={17} />
                  <span className="w-full truncate px-1 text-center">{label}</span>
                </Link>
              )
            })}
            <button
              className={cn(
                'flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-[0.68rem] font-medium transition-colors',
                user
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              disabled={isAuthLoading}
              onClick={() => void handleAuthAction()}
              type="button"
            >
              {user ? <LogOut size={17} /> : <LogIn size={17} />}
              <span className="w-full truncate px-1 text-center">
                {isAuthLoading ? 'Checking' : user ? 'Sign out' : 'Log in'}
              </span>
            </button>
          </div>
        </nav>
      </div>
      <LocalDataImportPrompt key={user?.id ?? 'signed-out'} />
    </div>
  )
}
