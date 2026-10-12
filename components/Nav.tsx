'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { list } from '@/lib/db'
import { useMe } from '@/lib/hooks'
import Icon, { type IconName } from './Icon'

const TABS: { href: string; label: string; ico: IconName; badge?: boolean }[] = [
  { href: '/', label: 'Home', ico: 'home' },
  { href: '/moments', label: 'Moments', ico: 'calendar' },
  { href: '/thoughts', label: 'Thoughts', ico: 'thought', badge: true },
  { href: '/games', label: 'Games', ico: 'trophy' },
  { href: '/eats', label: 'Eats', ico: 'burger' },
]

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
            <Icon name={t.ico} size={22} stroke={on ? 1.9 : 1.6} />
            {t.label}
            {t.badge && unread > 0 && !on && <span className="badge">{unread}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
