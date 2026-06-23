'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { useFinance } from '@/components/finance-provider'
import {
  getPaymentReminderPermission,
  getPaymentReminderPreferenceSnapshot,
  PAYMENT_REMINDER_DAYS,
  requestPaymentReminderPermission,
  setPaymentReminderPreference,
  subscribePaymentReminderPreference,
  type PaymentReminderPermission,
} from '@/lib/payment-reminders'
import {
  canUseSupabasePushReminders,
  disableRemotePaymentReminders,
  enableRemotePaymentReminders,
} from '@/lib/push-notifications'

function getStatusText(
  permission: PaymentReminderPermission,
  enabled: boolean,
  remotePushAvailable: boolean,
  signedIn: boolean,
) {
  if (permission === 'unsupported') {
    return 'Unavailable'
  }

  if (permission === 'denied') {
    return 'Blocked'
  }

  if (!enabled) {
    return 'Off'
  }

  if (remotePushAvailable) {
    return 'Push on this device'
  }

  return signedIn ? 'Local fallback' : 'Local only'
}

export default function PaymentReminderSettings() {
  const { user } = useAuth()
  const { paymentDates, userId } = useFinance()
  const [permission, setPermission] = useState<PaymentReminderPermission>(
    'unsupported',
  )
  const [hasHydrated, setHasHydrated] = useState(false)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const remindersEnabled =
    useSyncExternalStore(
      subscribePaymentReminderPreference,
      () => getPaymentReminderPreferenceSnapshot(userId),
      () => 'false',
    ) === 'true'
  const activePaymentCount = paymentDates.filter(
    (paymentDate) => !paymentDate.deletedAt && !paymentDate.paidAt,
  ).length
  const unavailable =
    permission === 'unsupported' || permission === 'denied'
  const remotePushAvailable =
    hasHydrated && Boolean(user) && canUseSupabasePushReminders()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPermission(getPaymentReminderPermission())
      setHasHydrated(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  const toggleReminders = async () => {
    setError('')
    setIsSaving(true)

    try {
      if (remindersEnabled) {
        if (user) {
          await disableRemotePaymentReminders(user.id)
        }

        setPaymentReminderPreference(userId, false)
        return
      }

      const nextPermission =
        permission === 'granted'
          ? permission
          : await requestPaymentReminderPermission()

      setPermission(nextPermission)

      if (nextPermission !== 'granted') {
        return
      }

      if (user && remotePushAvailable) {
        await enableRemotePaymentReminders(user.id)
      }

      setPaymentReminderPreference(userId, true)
    } catch {
      setError('Could not save reminder settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Payment reminders</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {getStatusText(
              permission,
              remindersEnabled,
              remotePushAvailable,
              Boolean(user),
            )}
          </p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          {remindersEnabled ? <Bell size={20} /> : <BellOff size={20} />}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Lead time
          </p>
          <p className="mt-1 text-sm font-semibold">
            {PAYMENT_REMINDER_DAYS.join(' / ')} days
          </p>
        </div>
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Items
          </p>
          <p className="mt-1 text-sm font-semibold">{activePaymentCount}</p>
        </div>
      </div>

      <Button
        className="mt-4 h-11 w-full gap-2"
        disabled={unavailable || isSaving}
        onClick={() => void toggleReminders()}
        type="button"
        variant={remindersEnabled ? 'outline' : 'default'}
      >
        {remindersEnabled ? <BellOff size={16} /> : <Bell size={16} />}
        {isSaving
          ? 'Saving'
          : remindersEnabled
            ? 'Turn off reminders'
            : 'Enable reminders'}
      </Button>
      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
