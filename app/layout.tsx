import type { Metadata, Viewport } from 'next'
import { Fraunces, Geist } from 'next/font/google'
import AppShell from '@/components/AppShell'
import './globals.css'

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', axes: ['SOFT', 'opsz'], style: ['normal', 'italic'] })
const body = Geist({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'Underpantmaru',
  description: 'Tanzim & Azrina',
  appleWebApp: { capable: true, title: 'Underpantmaru', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#08090d',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
