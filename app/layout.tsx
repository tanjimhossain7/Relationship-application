import type { Metadata, Viewport } from 'next'
import { Fredoka, Nunito } from 'next/font/google'
import AppShell from '@/components/AppShell'
import './globals.css'

const display = Fredoka({ subsets: ['latin'], variable: '--font-display', weight: ['400', '500', '600'] })
const body = Nunito({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'Us',
  description: 'Tanzim & Azrina',
  appleWebApp: { capable: true, title: 'Us', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0b12',
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
