'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { list } from '@/lib/db'
import { useMe } from '@/lib/hooks'

const TABS = [
  { href: '/', label: 'Home', ico: '🏠' },
  { href: '/moments', label: 'Moments', ico: '🗓️' },
  { href: '/thoughts', label: 'Thoughts', ico: '💭', badge: 'thoughts' },
  { href: '/games', label: 'Games', ico: '🏆' },
  { href: '/eats', label: 'Eats', ico: '🍜' },
] as const

export default function Nav() {
  const path = usePathname()
  const { me } = useMe()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const load = () =>
      list<{ id: string; person: string; seen_at: string | null }>('thoughts', { eq: { seen_at: null } })
        .then((rows) => setUnread(rows.filter((r) => r.person !== me).length))
        .catch(() => {})
    load()
    const onVis = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('us:thoughts-seen', load)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('us:thoughts-seen', load)
    }
  }, [me, path])

  return (
    <nav className="nav">
      {TABS.map((t) => {
        const on = t.href === '/' ? path === '/' : path.startsWith(t.href)
        return (
          <Link key={t.href} href={t.href} className={on ? 'on' : ''}>
            <span className="ico">{t.ico}</span>
            {t.label}
            {'badge' in t && unread > 0 && !on && <span className="badge">{unread}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
