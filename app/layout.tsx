import { Analytics } from '@vercel/analytics/next'
import { SerwistProvider } from '@serwist/turbopack/react'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/auth-provider'
import AppShell from '@/components/app-shell'
import { FinanceProvider } from '@/components/finance-provider'
import ServiceWorkerRegister from '@/components/service-worker-register'
import { shouldUseServiceWorker } from '@/lib/dev-flags'
import { SpeedInsights } from "@vercel/speed-insights/next"
import './globals.css'

export const metadata: Metadata = {
  applicationName: "Chips n' Tips",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Chips n' Tips",
  },
  title: {
    default: "Chips n' Tips",
    template: "%s | Chips n' Tips",
  },
  description:
    'Offline-first finance tracking with Supabase accounts, payment calendars, categories, and local IndexedDB storage.',
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: [
    { color: '#f8fafc', media: '(prefers-color-scheme: light)' },
    { color: '#0f172a', media: '(prefers-color-scheme: dark)' },
  ],
  width: 'device-width',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const application = (
    <AuthProvider>
      <FinanceProvider>
        <AppShell>{children}</AppShell>
      </FinanceProvider>
    </AuthProvider>
  )

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        {shouldUseServiceWorker() ? (
          <SerwistProvider swUrl="/serwist/sw.js">{application}</SerwistProvider>
        ) : (
          application
        )}
        <ServiceWorkerRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
        {process.env.NODE_ENV === 'production' && <SpeedInsights />}
      </body>
    </html>
  )
}
