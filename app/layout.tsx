import { Analytics } from '@vercel/analytics/next'
import { SerwistProvider } from '@serwist/turbopack/react'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AuthProvider } from '@/components/auth-provider'
import AppShell from '@/components/app-shell'
import { FinanceProvider } from '@/components/finance-provider'
import ServiceWorkerRegister from '@/components/service-worker-register'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        {process.env.NODE_ENV === 'production' ? (
          <SerwistProvider swUrl="/serwist/sw.js">{application}</SerwistProvider>
        ) : (
          application
        )}
        <ServiceWorkerRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
