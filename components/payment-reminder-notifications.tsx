'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useFinance } from '@/components/finance-provider'
import {
  getPaymentReminderPermission,
  getPaymentReminderPreferenceSnapshot,
  getPendingPaymentReminders,
  getRemotePaymentReminderPreferenceSnapshot,
  getUnsentPaymentReminders,
  markPaymentReminderSent,
  showPaymentReminderNotification,
  subscribePaymentReminderPreference,
} from '@/lib/payment-reminders'
import { canUseSupabasePushReminders } from '@/lib/push-notifications'

export default function PaymentReminderNotifications() {
  const { user } = useAuth()
  const { currency, paymentDates, userId } = useFinance()
  const remindersEnabled =
    useSyncExternalStore(
      subscribePaymentReminderPreference,
      () => getPaymentReminderPreferenceSnapshot(userId),
      () => 'false',
    ) === 'true'
  const remoteRemindersEnabled =
    useSyncExternalStore(
      subscribePaymentReminderPreference,
      () => getRemotePaymentReminderPreferenceSnapshot(userId),
      () => 'false',
    ) === 'true'

  useEffect(() => {
    if (!remindersEnabled || getPaymentReminderPermission() !== 'granted') {
      return
    }

    if (user && remoteRemindersEnabled && canUseSupabasePushReminders()) {
      return
    }

    let cancelled = false

    const checkReminders = async () => {
      const pendingReminders = getUnsentPaymentReminders(
        userId,
        getPendingPaymentReminders(paymentDates),
      )

      for (const reminder of pendingReminders) {
        if (cancelled) {
          return
        }

        const shown = await showPaymentReminderNotification(reminder, currency)

        if (shown) {
          markPaymentReminderSent(userId, reminder.key)
        }
      }
    }
    const runCheck = () => {
      void checkReminders()
    }
    const runWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        runCheck()
      }
    }

    runCheck()

    const intervalId = window.setInterval(runCheck, 60 * 60 * 1000)
    window.addEventListener('focus', runCheck)
    document.addEventListener('visibilitychange', runWhenVisible)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', runCheck)
      document.removeEventListener('visibilitychange', runWhenVisible)
    }
  }, [
    currency,
    paymentDates,
    remindersEnabled,
    remoteRemindersEnabled,
    user,
    userId,
  ])

  return null
}
