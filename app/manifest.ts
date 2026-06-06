import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#f8fafc',
    description:
      'Offline-first finance tracking with local-first storage and account support.',
    display: 'standalone',
    icons: [
      {
        sizes: 'any',
        src: '/icon.svg',
        type: 'image/svg+xml',
      },
      {
        sizes: '32x32',
        src: '/icon-light-32x32.png',
        type: 'image/png',
      },
      {
        sizes: '180x180',
        src: '/apple-icon.png',
        type: 'image/png',
      },
    ],
    name: "Chips n' Tips",
    short_name: 'Chips',
    start_url: '/',
    theme_color: '#0f766e',
  }
}
