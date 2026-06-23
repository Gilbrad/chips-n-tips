'use client'

import {
  createClient,
  hasSupabaseConfig,
} from '@/lib/supabase/client'
import { shouldUseServiceWorker } from '@/lib/dev-flags'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const SERVICE_WORKER_READY_TIMEOUT_MS = 7000

function hasVapidPublicKey() {
  return Boolean(VAPID_PUBLIC_KEY)
}

function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index)
  }

  return output
}

function canUsePushManager() {
  return (
    shouldUseServiceWorker() &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  let timeoutId: number | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
  }
}

async function getReadyServiceWorkerRegistration() {
  if (!canUsePushManager()) {
    throw new Error('Push notifications are not supported in this browser.')
  }

  return withTimeout(
    navigator.serviceWorker.ready,
    SERVICE_WORKER_READY_TIMEOUT_MS,
    'The service worker is not ready for push notifications yet.',
  )
}

function toPushSubscriptionRow(userId: string, subscription: PushSubscription) {
  const serialized = subscription.toJSON()
  const endpoint = serialized.endpoint
  const auth = serialized.keys?.auth
  const p256dh = serialized.keys?.p256dh

  if (!endpoint || !auth || !p256dh) {
    throw new Error('The browser did not return a complete push subscription.')
  }

  return {
    auth,
    endpoint,
    p256dh,
    revoked_at: null,
    timezone: getUserTimezone(),
    user_agent: navigator.userAgent,
    user_id: userId,
  }
}

async function upsertRemotePushSubscription(
  userId: string,
  subscription: PushSubscription,
) {
  const supabase = createClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(toPushSubscriptionRow(userId, subscription), {
      onConflict: 'endpoint',
    })

  if (error) {
    throw error
  }
}

async function revokeRemotePushSubscription(
  endpoint: string,
  userId?: string,
) {
  if (!hasSupabaseConfig()) {
    return
  }

  const supabase = createClient()
  let query = supabase
    .from('push_subscriptions')
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq('endpoint', endpoint)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  await query
}

export function canUseSupabasePushReminders() {
  return hasSupabaseConfig() && hasVapidPublicKey() && canUsePushManager()
}

export async function enableRemotePaymentReminders(userId: string) {
  if (!canUseSupabasePushReminders() || !VAPID_PUBLIC_KEY) {
    throw new Error('Supabase push reminders are not configured.')
  }

  const registration = await getReadyServiceWorkerRegistration()
  const existingSubscription = await registration.pushManager.getSubscription()

  if (existingSubscription) {
    await revokeRemotePushSubscription(existingSubscription.endpoint, userId).catch(
      () => undefined,
    )
    await existingSubscription.unsubscribe()
  }

  const subscription = await registration.pushManager.subscribe({
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    userVisibleOnly: true,
  })

  await upsertRemotePushSubscription(userId, subscription)

  return subscription
}

export async function disableRemotePaymentReminders(userId?: string) {
  if (!canUsePushManager()) {
    return
  }

  const registration = await navigator.serviceWorker.ready.catch(() => null)
  const subscription = await registration?.pushManager
    .getSubscription()
    .catch(() => null)

  if (!subscription) {
    return
  }

  await revokeRemotePushSubscription(subscription.endpoint, userId).catch(
    () => undefined,
  )
  await subscription.unsubscribe().catch(() => undefined)
}
