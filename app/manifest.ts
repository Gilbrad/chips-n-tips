import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#f8fafc',
    description:
      'Offline-first finance tracking with local-first storage and account support.',
    display: 'standalone',
    icons: [
      {
        sizes: '192x192',
        src: '/icon-192x192.png',
        type: 'image/png',
      },
      {
        purpose: 'maskable',
        sizes: '512x512',
        src: '/icon-maskable-512x512.png',
        type: 'image/png',
      },
      {
        sizes: '512x512',
        src: '/icon-512x512.png',
        type: 'image/png',
      },
    ],
    name: "Chips n' Tips",
    short_name: 'Chips',
    scope: '/',
    start_url: '/',
    theme_color: '#0f766e',
  }
}
