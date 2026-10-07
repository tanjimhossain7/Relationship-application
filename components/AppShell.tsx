'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { MeContext } from '@/lib/hooks'
import { NAMES, type Person } from '@/lib/people'
import { ToastProvider } from './ui'
import Nav from './Nav'
import PersonPicker from './PersonPicker'
import WeeklyGate from './WeeklyGate'
import StreakPopup from './StreakPopup'
import Surprise, { type SurpriseKind } from './Surprise'
import { list, upsert, remove, removeImage, isDemo } from '@/lib/db'
import { addDays, today, weekStart } from '@/lib/dates'
import { milestoneFor, type Milestone, type StreakRow } from '@/lib/streaks'
import type { LibraryImage } from '@/lib/library'

const ME_KEY = 'us:me'
const SURPRISE_KEY = 'us:surprise:last'
const SURPRISE_EVERY_MS = 6 * 86400000

export default function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [me, setMe] = useState<Person | null>(null)
  const [gateDone, setGateDone] = useState(false)
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [surprise, setSurprise] = useState<SurpriseKind | null>(null)
  const [library, setLibrary] = useState<LibraryImage[]>([])
  const ran = useRef<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(ME_KEY) as Person | null
    if (saved === 'tanzim' || saved === 'azrina') setMe(saved)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (me) document.documentElement.dataset.person = me
    else delete document.documentElement.dataset.person
  }, [me])

  // Things that happen once each time the app is opened.
  useEffect(() => {
    if (!me || ran.current === me) return
    ran.current = me
    list<LibraryImage>('library_images').then(setLibrary).catch(() => {})
    bumpStreak(me)
      .then((days) => {
        const m = days ? milestoneFor(days) : null
        if (m) setMilestone(m)
      })
      .catch(() => {})
    cleanupOldPicks().catch(() => {})
  }, [me])

  // Surprises roll once the gate and any streak popup are out of the way.
  useEffect(() => {
    if (!me || !gateDone || milestone) return
    const last = Number(localStorage.getItem(SURPRISE_KEY) || 0)
    if (!last) {
      localStorage.setItem(SURPRISE_KEY, String(Date.now()))
      return
    }
    if (Date.now() - last > SURPRISE_EVERY_MS && Math.random() < 0.5) {
      const kinds: SurpriseKind[] = ['run', 'shower', 'moto']
      const t = setTimeout(() => {
        setSurprise(kinds[Math.floor(Math.random() * kinds.length)])
        localStorage.setItem(SURPRISE_KEY, String(Date.now()))
      }, 1800)
      return () => clearTimeout(t)
    }
  }, [me, gateDone, milestone])

  // Settings can preview surprises.
  useEffect(() => {
    const onPreview = (e: Event) => setSurprise((e as CustomEvent<SurpriseKind>).detail)
    const onLib = () => list<LibraryImage>('library_images').then(setLibrary).catch(() => {})
    window.addEventListener('us:surprise', onPreview)
    window.addEventListener('us:library', onLib)
    return () => {
      window.removeEventListener('us:surprise', onPreview)
      window.removeEventListener('us:library', onLib)
    }
  }, [])

  const choose = useCallback((p: Person) => {
    localStorage.setItem(ME_KEY, p)
    setGateDone(false)
    setMe(p)
  }, [])

  const switchPerson = useCallback(() => {
    localStorage.removeItem(ME_KEY)
    ran.current = null
    setMe(null)
  }, [])

  if (!mounted) return <div style={{ minHeight: '100dvh' }} />
  if (!me) return <PersonPicker onChoose={choose} />

  return (
    <MeContext.Provider value={{ me, switchPerson }}>
      <ToastProvider>
        {isDemo && <DemoBanner />}
        {!gateDone && <WeeklyGate me={me} onDone={() => setGateDone(true)} />}
        {gateDone && (
          <>
            {children}
            <Nav />
          </>
        )}
        {gateDone && milestone && <StreakPopup milestone={milestone} library={library} name={NAMES[me]} onClose={() => setMilestone(null)} />}
        {surprise && <Surprise kind={surprise} library={library} onDone={() => setSurprise(null)} />}
      </ToastProvider>
    </MeContext.Provider>
  )
}

function DemoBanner() {
  const [hide, setHide] = useState(false)
  if (hide) return null
  return (
    <div
      onClick={() => setHide(true)}
      className="small center"
      style={{ padding: 'calc(var(--safe-t) + 6px) 12px 6px', background: 'rgba(255,200,120,.12)', color: '#ffd9a8', fontWeight: 700 }}
    >
      Demo mode: saving to this phone only until Supabase is connected. Tap to hide.
    </div>
  )
}

/** Counts a visit for today. Returns the new streak if it changed today. */
async function bumpStreak(me: Person): Promise<number | null> {
  const [row] = await list<StreakRow & { id: string }>('streaks', { eq: { person: me } })
  const t = today()
  if (row?.last_day === t) return null
  const current = row?.last_day === addDays(t, -1) ? row.current + 1 : 1
  await upsert('streaks', { person: me, current, best: Math.max(current, row?.best ?? 0), last_day: t }, 'person')
  return current
}

/** Weekly pictures are temporary: anything older than 4 weeks goes. */
async function cleanupOldPicks() {
  const cutoff = addDays(weekStart(), -28)
  const picks = await list<{ id: string; week_start: string; image_path: string }>('weekly_picks')
  for (const p of picks.filter((p) => p.week_start < cutoff)) {
    await removeImage(p.image_path)
    await remove('weekly_picks', p.id)
  }
}
