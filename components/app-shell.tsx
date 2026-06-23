'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  LayoutDashboard,
  LogIn,
  LogOut,
  MoreHorizontal,
  Tags,
  UserPlus,
  WalletCards,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { useFinance } from '@/components/finance-provider'
import LocalDataImportPrompt from '@/components/local-data-import-prompt'
import PaymentReminderNotifications from '@/components/payment-reminder-notifications'
import {
  setPaymentReminderPreference,
  setRemotePaymentReminderPreference,
} from '@/lib/payment-reminders'
import { disableRemotePaymentReminders } from '@/lib/push-notifications'
import { cn } from '@/lib/utils'
import type { SyncState } from '@/components/finance-provider'

function formatRelativeSyncTime(dateValue: string, now: number) {
  const syncedAt = new Date(dateValue).getTime()

  if (!Number.isFinite(syncedAt)) {
    return null
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - syncedAt) / 1000))

  if (elapsedSeconds < 45) {
    return 'just now'
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min${elapsedMinutes === 1 ? '' : 's'} ago`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)

  if (elapsedHours < 24) {
    return `${elapsedHours} hr${elapsedHours === 1 ? '' : 's'} ago`
  }

  const elapsedDays = Math.floor(elapsedHours / 24)

  if (elapsedDays === 1) {
    return 'yesterday'
  }

  return `${elapsedDays} days ago`
}

function getBackupStatusLabel(
  syncState: SyncState,
  lastSyncedAt: string | null,
  now: number | null,
) {
  const relativeTime =
    lastSyncedAt && now ? formatRelativeSyncTime(lastSyncedAt, now) : null

  if (syncState === 'syncing') {
    return 'Syncing'
  }

  if (syncState === 'synced') {
    return relativeTime ? `Synced ${relativeTime}` : 'Synced'
  }

  if (syncState === 'offline') {
    return relativeTime ? `Offline. Synced ${relativeTime}` : 'Offline'
  }

  if (syncState === 'error') {
    return relativeTime ? `Error. Synced ${relativeTime}` : 'Error'
  }

  return 'Local only'
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isConfigured, isLoading: isAuthLoading, signOut, user } = useAuth()
  const { currency, lastSyncedAt, syncState } = useFinance()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState<number | null>(null)

  const navItems = useMemo(
    () => [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
      { href: '/calendar', label: 'Calendar', icon: CalendarDays },
      { href: '/currency', label: 'Currency', icon: CircleDollarSign },
      { href: '/categories', label: 'Categories', icon: Tags },
    ],
    [],
  )
  const mobileNavItems = navItems.filter(({ href }) => href !== '/currency')
  const backupStatusLabel = getBackupStatusLabel(
    syncState,
    lastSyncedAt,
    currentTime,
  )

  useEffect(() => {
    if (!user) {
      return
    }

    const updateCurrentTime = () => setCurrentTime(Date.now())
    updateCurrentTime()

    const intervalId = window.setInterval(updateCurrentTime, 60 * 1000)

    return () => window.clearInterval(intervalId)
  }, [user])

  const handleAuthAction = async () => {
    setIsMobileMenuOpen(false)

    if (!user) {
      router.push('/login')
      return
    }

    await disableRemotePaymentReminders(user.id)
    setRemotePaymentReminderPreference(user.id, false)
    setPaymentReminderPreference(user.id, false)
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
                  Your personal Wallet
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
                <p className="mt-1 text-xs text-muted-foreground">
                  Backup: {backupStatusLabel}
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
          {isMobileMenuOpen ? (
            <>
              <button
                aria-label="Close more menu"
                className="fixed inset-0 bottom-16 z-0 cursor-default bg-foreground/10"
                onClick={() => setIsMobileMenuOpen(false)}
                type="button"
              />
              <div
                className="absolute bottom-full right-3 z-10 mb-2 w-64 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg"
                id="mobile-more-menu"
              >
                <div className="mb-2 rounded-lg border border-border bg-card p-3 text-card-foreground">
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      Backup: {backupStatusLabel}
                    </p>
                  ) : null}
                </div>

                <Link
                  className={cn(
                    'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                    pathname === '/currency'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  )}
                  href="/currency"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <CircleDollarSign size={18} />
                  Currency
                  <span className="ml-auto text-xs opacity-70">{currency}</span>
                </Link>

                <div className="my-2 border-t border-border" />

                {user ? (
                  <button
                    className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                    disabled={isAuthLoading}
                    onClick={() => void handleAuthAction()}
                    type="button"
                  >
                    <LogOut size={18} />
                    {isAuthLoading ? 'Checking session' : 'Sign out'}
                  </button>
                ) : (
                  <>
                    <Link
                      className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted"
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LogIn size={18} />
                      Log in
                    </Link>
                    <Link
                      className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted"
                      href="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <UserPlus size={18} />
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </>
          ) : null}

          <div className="relative z-10 mx-auto grid max-w-md grid-cols-5 gap-1">
            {mobileNavItems.map(({ href, label, icon: Icon }) => {
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
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon size={17} />
                  <span className="w-full truncate px-1 text-center">{label}</span>
                </Link>
              )
            })}
            <button
              aria-controls="mobile-more-menu"
              aria-expanded={isMobileMenuOpen}
              aria-label="More navigation options"
              className={cn(
                'flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-[0.68rem] font-medium transition-colors',
                isMobileMenuOpen || pathname === '/currency'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              type="button"
            >
              <MoreHorizontal size={17} />
              <span className="w-full truncate px-1 text-center">More</span>
            </button>
          </div>
        </nav>
      </div>
      <LocalDataImportPrompt key={user?.id ?? 'signed-out'} />
      <PaymentReminderNotifications />
    </div>
  )
}
