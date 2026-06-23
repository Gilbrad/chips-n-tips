/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from '@serwist/turbopack/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

interface PaymentReminderPushPayload {
  badge?: string
  body?: string
  icon?: string
  tag?: string
  title?: string
  url?: string
}

const serwist = new Serwist({
  clientsClaim: true,
  fallbacks: {
    entries: [
      {
        matcher({ request }) {
          return request.destination === 'document'
        },
        url: '/~offline',
      },
    ],
  },
  navigationPreload: true,
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: defaultCache,
  skipWaiting: true,
})

function parsePushPayload(data: PushEvent['data']) {
  if (!data) {
    return {}
  }

  try {
    return data.json() as PaymentReminderPushPayload
  } catch {
    return {
      body: data.text(),
    }
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event.data)
  const title = payload.title ?? "Chips n' Tips reminder"

  event.waitUntil(
    self.registration.showNotification(title, {
      badge: payload.badge ?? '/icon-192x192.png',
      body: payload.body,
      data: {
        url: payload.url ?? '/calendar',
      },
      icon: payload.icon ?? '/icon-192x192.png',
      tag: payload.tag,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const notificationData = event.notification.data as
    | { url?: string }
    | undefined
  const destination = new URL(
    notificationData?.url ?? '/calendar',
    self.location.origin,
  ).href

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
      })
      const existingClient = clients.find(
        (client) => new URL(client.url).origin === self.location.origin,
      ) as WindowClient | undefined

      if (existingClient) {
        const navigatedClient = await existingClient
          .navigate(destination)
          .catch(() => null)

        await (navigatedClient ?? existingClient).focus()
        return
      }

      await self.clients.openWindow(destination)
    })(),
  )
})

serwist.addEventListeners()
