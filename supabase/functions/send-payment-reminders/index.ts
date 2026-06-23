// @ts-nocheck

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const REMINDER_DAYS = [5, 3, 1]
const BATCH_SIZE = 250
const MS_PER_DAY = 86_400_000

const jsonHeaders = {
  'Content-Type': 'application/json',
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error(`${name} is not configured.`)
  }

  return value
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...init?.headers,
    },
  })
}

function getDateInTimezone(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(new Date())
  const byType = new Map(parts.map((part) => [part.type, part.value]))

  return `${byType.get('year')}-${byType.get('month')}-${byType.get('day')}`
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

function differenceInCalendarDays(targetDate: string, baseDate: string) {
  return (
    (Date.parse(`${targetDate}T00:00:00.000Z`) -
      Date.parse(`${baseDate}T00:00:00.000Z`)) /
    MS_PER_DAY
  )
}

function formatDateLabel(dateValue: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${dateValue}T00:00:00.000Z`))
}

function formatCurrency(amount: number | string | null, currency: string) {
  if (amount === null) {
    return ''
  }

  try {
    return new Intl.NumberFormat('en-US', {
      currency,
      style: 'currency',
    }).format(Number(amount))
  } catch {
    return Number(amount).toFixed(2)
  }
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

async function fetchActiveSubscriptions(supabase) {
  const subscriptions = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id,user_id,endpoint,p256dh,auth,timezone')
      .is('revoked_at', null)
      .order('created_at', { ascending: true })
      .range(from, from + BATCH_SIZE - 1)

    if (error) {
      throw error
    }

    const page = data ?? []
    subscriptions.push(...page)

    if (page.length < BATCH_SIZE) {
      return subscriptions
    }

    from += BATCH_SIZE
  }
}

async function claimDelivery(
  supabase,
  subscriptionId: string,
  paymentDateId: string,
  dueOn: string,
  daysBefore: number,
) {
  const { data, error } = await supabase.rpc(
    'claim_payment_reminder_delivery',
    {
      p_days_before: daysBefore,
      p_due_on: dueOn,
      p_payment_date_id: paymentDateId,
      p_subscription_id: subscriptionId,
    },
  )

  if (error) {
    throw error
  }

  return data as string | null
}

async function processSubscriptionBatch(supabase, subscriptions) {
  const userIds = [...new Set(subscriptions.map((item) => item.user_id))]
  const datesToCheck = [
    ...new Set(
      subscriptions.flatMap((subscription) => {
        const today = getDateInTimezone(subscription.timezone || 'UTC')

        return REMINDER_DAYS.map((days) => addDays(today, days))
      }),
    ),
  ]
  const [{ data: paymentDates, error: paymentDatesError }, preferencesResult] =
    await Promise.all([
      supabase
        .from('payment_dates')
        .select('id,user_id,title,amount,due_on')
        .in('user_id', userIds)
        .in('due_on', datesToCheck)
        .is('deleted_at', null)
        .is('paid_at', null),
      supabase
        .from('user_preferences')
        .select('user_id,currency')
        .in('user_id', userIds),
    ])

  if (paymentDatesError) {
    throw paymentDatesError
  }

  if (preferencesResult.error) {
    throw preferencesResult.error
  }

  const paymentsByUser = new Map()
  const currencyByUser = new Map(
    (preferencesResult.data ?? []).map((preference) => [
      preference.user_id,
      preference.currency,
    ]),
  )

  for (const paymentDate of paymentDates ?? []) {
    const current = paymentsByUser.get(paymentDate.user_id) ?? []
    current.push(paymentDate)
    paymentsByUser.set(paymentDate.user_id, current)
  }

  const stats = {
    failed: 0,
    sent: 0,
    skipped: 0,
  }

  for (const subscription of subscriptions) {
    const today = getDateInTimezone(subscription.timezone || 'UTC')
    const userPaymentDates = paymentsByUser.get(subscription.user_id) ?? []

    for (const paymentDate of userPaymentDates) {
      const daysBefore = differenceInCalendarDays(paymentDate.due_on, today)

      if (!REMINDER_DAYS.includes(daysBefore)) {
        continue
      }

      let deliveryId: string | null = null

      try {
        deliveryId = await claimDelivery(
          supabase,
          subscription.id,
          paymentDate.id,
          paymentDate.due_on,
          daysBefore,
        )
      } catch (error) {
        console.error('Could not claim reminder delivery', error)
        stats.failed += 1
        continue
      }

      if (!deliveryId) {
        stats.skipped += 1
        continue
      }

      const currency = currencyByUser.get(subscription.user_id) ?? 'USD'
      const amount = formatCurrency(paymentDate.amount, currency)
      const title =
        daysBefore === 1
          ? `${paymentDate.title} is due tomorrow`
          : `${paymentDate.title} is due in ${daysBefore} days`
      const payload = {
        badge: '/icon-192x192.png',
        body: `${formatDateLabel(paymentDate.due_on)}${
          amount ? ` · ${amount}` : ''
        }`,
        icon: '/icon-192x192.png',
        tag: `chipsntips-${paymentDate.id}-${paymentDate.due_on}-${daysBefore}`,
        title,
        url: '/calendar',
      }

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.auth,
              p256dh: subscription.p256dh,
            },
          },
          JSON.stringify(payload),
          {
            TTL: 60 * 60 * 24,
          },
        )

        await supabase
          .from('payment_reminder_deliveries')
          .update({
            sent_at: new Date().toISOString(),
            status: 'sent',
          })
          .eq('id', deliveryId)

        stats.sent += 1
      } catch (error) {
        const statusCode = Number(error?.statusCode ?? error?.status)

        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .update({
              revoked_at: new Date().toISOString(),
            })
            .eq('id', subscription.id)
        }

        await supabase
          .from('payment_reminder_deliveries')
          .update({
            error: error instanceof Error ? error.message : String(error),
            status: 'failed',
          })
          .eq('id', deliveryId)

        stats.failed += 1
      }
    }
  }

  return stats
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: jsonHeaders,
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, { status: 405 })
  }

  try {
    const cronSecret = requiredEnv('CRON_SECRET')
    const authorization = request.headers.get('authorization')

    if (authorization !== `Bearer ${cronSecret}`) {
      return jsonResponse({ error: 'Unauthorized.' }, { status: 401 })
    }

    webpush.setVapidDetails(
      requiredEnv('VAPID_SUBJECT'),
      requiredEnv('VAPID_PUBLIC_KEY'),
      requiredEnv('VAPID_PRIVATE_KEY'),
    )

    const supabase = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          persistSession: false,
        },
      },
    )
    const subscriptions = await fetchActiveSubscriptions(supabase)
    const totals = {
      failed: 0,
      sent: 0,
      skipped: 0,
      subscriptions: subscriptions.length,
    }

    for (const subscriptionBatch of chunk(subscriptions, BATCH_SIZE)) {
      const stats = await processSubscriptionBatch(supabase, subscriptionBatch)
      totals.failed += stats.failed
      totals.sent += stats.sent
      totals.skipped += stats.skipped
    }

    return jsonResponse(totals)
  } catch (error) {
    console.error(error)

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Reminder job failed.',
      },
      { status: 500 },
    )
  }
})
