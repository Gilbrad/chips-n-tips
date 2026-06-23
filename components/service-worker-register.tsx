'use client'

import { useEffect } from 'react'
import { isDevPushEnabled } from '@/lib/dev-flags'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === 'production' ||
      isDevPushEnabled() ||
      !('serviceWorker' in navigator)
    ) {
      return
    }

    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch(() => undefined)
  }, [])

  return null
}
