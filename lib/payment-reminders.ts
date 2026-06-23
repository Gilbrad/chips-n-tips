import { toDateInputValue } from '@/lib/dates'
import type { PaymentDate } from '@/lib/finance-types'
import { formatCurrency, formatDateLabel } from '@/lib/format'

export const PAYMENT_REMINDER_DAYS = [5, 3, 1] as const

const DELIVERED_REMINDERS_PREFIX = 'chipsntips-payment-reminders-sent'
const REMOTE_REMINDER_PREFERENCE_PREFIX =
  'chipsntips-payment-reminders-remote-enabled'
const REMINDER_PREFERENCE_PREFIX = 'chipsntips-payment-reminders-enabled'
const REMINDER_PREFERENCE_EVENT = 'chipsntips-payment-reminder-preference'
const MS_PER_DAY = 86_400_000

export type PaymentReminderPermission = NotificationPermission | 'unsupported'

export interface PaymentReminder {
  daysBefore: (typeof PAYMENT_REMINDER_DAYS)[number]
  key: string
  paymentDate: PaymentDate
}

function preferenceKey(userId: string) {
  return `${REMINDER_PREFERENCE_PREFIX}:${userId}`
}

function remotePreferenceKey(userId: string) {
  return `${REMOTE_REMINDER_PREFERENCE_PREFIX}:${userId}`
}

function deliveredKey(userId: string) {
  return `${DELIVERED_REMINDERS_PREFIX}:${userId}`
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function parseStoredReminderMap(userId: string) {
  if (!canUseLocalStorage()) {
    return {}
  }

  try {
    return JSON.parse(
      window.localStorage.getItem(deliveredKey(userId)) ?? '{}',
    ) as Record<string, string>
  } catch {
    return {}
  }
}

function toUtcDayNumber(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number)

  return Date.UTC(year, month - 1, day) / MS_PER_DAY
}

function differenceInCalendarDays(targetDate: string, baseDate: string) {
  return toUtcDayNumber(targetDate) - toUtcDayNumber(baseDate)
}

export function getPaymentReminderPermission(): PaymentReminderPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.permission
}

export async function requestPaymentReminderPermission() {
  if (getPaymentReminderPermission() === 'unsupported') {
    return 'unsupported' as const
  }

  return Notification.requestPermission()
}

export function getPaymentReminderPreferenceSnapshot(userId: string) {
  if (!canUseLocalStorage()) {
    return 'false'
  }

  return window.localStorage.getItem(preferenceKey(userId)) === 'true'
    ? 'true'
    : 'false'
}

export function setPaymentReminderPreference(userId: string, enabled: boolean) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(preferenceKey(userId), String(enabled))
  window.dispatchEvent(new Event(REMINDER_PREFERENCE_EVENT))
}

export function getRemotePaymentReminderPreferenceSnapshot(userId: string) {
  if (!canUseLocalStorage()) {
    return 'false'
  }

  return window.localStorage.getItem(remotePreferenceKey(userId)) === 'true'
    ? 'true'
    : 'false'
}

export function setRemotePaymentReminderPreference(
  userId: string,
  enabled: boolean,
) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.setItem(remotePreferenceKey(userId), String(enabled))
  window.dispatchEvent(new Event(REMINDER_PREFERENCE_EVENT))
}

export function subscribePaymentReminderPreference(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const listener = () => callback()

  window.addEventListener('storage', listener)
  window.addEventListener(REMINDER_PREFERENCE_EVENT, listener)

  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener(REMINDER_PREFERENCE_EVENT, listener)
  }
}

export function getPendingPaymentReminders(
  paymentDates: PaymentDate[],
  today = toDateInputValue(),
) {
  return paymentDates.flatMap<PaymentReminder>((paymentDate) => {
    if (paymentDate.deletedAt || paymentDate.paidAt) {
      return []
    }

    const daysBefore = differenceInCalendarDays(paymentDate.dueOn, today)

    if (
      !PAYMENT_REMINDER_DAYS.includes(
        daysBefore as PaymentReminder['daysBefore'],
      )
    ) {
      return []
    }

    return [
      {
        daysBefore: daysBefore as PaymentReminder['daysBefore'],
        key: `${paymentDate.id}:${paymentDate.dueOn}:${daysBefore}`,
        paymentDate,
      },
    ]
  })
}

export function getUnsentPaymentReminders(
  userId: string,
  reminders: PaymentReminder[],
) {
  const sent = parseStoredReminderMap(userId)

  return reminders.filter((reminder) => !sent[reminder.key])
}

export function markPaymentReminderSent(userId: string, reminderKey: string) {
  if (!canUseLocalStorage()) {
    return
  }

  const sent = parseStoredReminderMap(userId)
  sent[reminderKey] = new Date().toISOString()
  window.localStorage.setItem(deliveredKey(userId), JSON.stringify(sent))
}

async function getReadyServiceWorkerRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  return Promise.race([
    navigator.serviceWorker.ready.catch(() => null),
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 800)),
  ])
}

export async function showPaymentReminderNotification(
  reminder: PaymentReminder,
  currency: string,
) {
  if (getPaymentReminderPermission() !== 'granted') {
    return false
  }

  const { daysBefore, paymentDate } = reminder
  const title =
    daysBefore === 1
      ? `${paymentDate.title} is due tomorrow`
      : `${paymentDate.title} is due in ${daysBefore} days`
  const amount = paymentDate.amount
    ? ` · ${formatCurrency(paymentDate.amount, currency)}`
    : ''
  const options: NotificationOptions = {
    badge: '/icon-192x192.png',
    body: `${formatDateLabel(paymentDate.dueOn)}${amount}`,
    data: {
      url: '/calendar',
    },
    icon: '/icon-192x192.png',
    tag: `chipsntips-${reminder.key}`,
  }
  const registration = await getReadyServiceWorkerRegistration()

  if (registration) {
    await registration.showNotification(title, options)
    return true
  }

  const notification = new Notification(title, options)
  notification.onclick = () => {
    window.focus()
    window.location.assign('/calendar')
  }

  return true
}
