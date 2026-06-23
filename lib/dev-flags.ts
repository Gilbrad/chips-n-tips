export function isDevPushEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_DEV_PUSH === 'true'
}

export function shouldUseServiceWorker() {
  return process.env.NODE_ENV === 'production' || isDevPushEnabled()
}
