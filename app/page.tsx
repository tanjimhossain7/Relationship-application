'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { imageUrl, list, upsert, uploadImage, removeImage } from '@/lib/db'
import { daysBetween, pretty, relative, today, weekStart } from '@/lib/dates'
import { onThisDay, typeEmoji, upcoming, type EventRow } from '@/lib/events'
import { useMe, useRows } from '@/lib/hooks'
import { NAMES, STARTED_DATING, other } from '@/lib/people'
import { Field, PhotoPicker, Sheet, useToast } from '@/components/ui'
import { DateIdeasCard } from '@/components/DateIdeas'

type Pick = { id: string; chooser: string; for_person: string; image_path: string; caption: string | null; seen_at: string | null; week_start: string }
type Song = { id: string; from_person: string; to_person: string | null; title: string | null; kind: string; seen_at: string | null }

export default function Home() {
  const { me } = useMe()
  const them = other(me)
  const week = weekStart()
  const picks = useRows<Pick>('weekly_picks', { eq: { week_start: week } })
  const events = useRows<EventRow>('events')
  const songs = useRows<Song>('songs', { eq: { to_person: me, seen_at: null } })
  const [streak, setStreak] = useState<number | null>(null)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    list<{ id: string; current: number }>('streaks', { eq: { person: me } })
      .then(([r]) => setStreak(r?.current ?? null))
      .catch(() => {})
  }, [me])

  const forMe = picks.rows.find((p) => p.for_person === me)
  const mine = picks.rows.find((p) => p.chooser === me)
  const days = daysBetween(STARTED_DATING, today())
  const next = upcoming(events.rows).slice(0, 3)
  const memory = onThisDay(events.rows)[0]
  const newSongs = songs.rows.filter((s) => s.from_person === them)

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <p className="muted small">{greeting()}</p>
          <h1>Hi {NAMES[me]}</h1>
        </div>
        <div className="row">
          {streak ? <span className="pill accent">🔥 {streak}</span> : null}
          <Link href="/more" className="icon-btn" aria-label="More">
            ⚙️
          </Link>
        </div>
      </header>

      {forMe ? (
        <div className="hero-photo glow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(forMe.image_path)} alt="" />
          <div className="cap">
            <p className="tiny" style={{ opacity: 0.8 }}>
              {NAMES[them]}&apos;s pick this week
            </p>
            {forMe.caption && (
              <p className="display" style={{ fontSize: 19, marginTop: 2 }}>
                {forMe.caption}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="card center" style={{ padding: '30px 18px' }}>
          <div style={{ fontSize: 34 }} className="float">
            🖼️
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            {NAMES[them]} hasn&apos;t picked your picture this week yet
          </p>
        </div>
      )}

      {mine ? (
        <button className="card tight row pressable" onClick={() => setPicking(true)} style={{ textAlign: 'left' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(mine.image_path)} alt="" className="thumb" />
          <div className="grow">
            <div style={{ fontWeight: 800 }}>Your pick for {NAMES[them]}</div>
            <div className="small muted">{mine.seen_at ? 'Opened ✓' : 'Not opened yet'}</div>
          </div>
          <span className="faint small">Change</span>
        </button>
      ) : (
        <button className="card row pressable new" onClick={() => setPicking(true)} style={{ textAlign: 'left' }}>
          <span style={{ fontSize: 28 }}>💌</span>
          <div className="grow">
            <div style={{ fontWeight: 800 }}>Pick this week&apos;s picture for {NAMES[them]}</div>
            <div className="small muted">It&apos;s the first thing they see when they open the app</div>
          </div>
          <span style={{ color: 'var(--accent)' }}>→</span>
        </button>
      )}

      <DateIdeasCard />

      {newSongs.length > 0 && (
        <Link href="/music" className="card row pressable new">
          <span style={{ fontSize: 28 }}>🎵</span>
          <div className="grow">
            <div style={{ fontWeight: 800 }}>
              {NAMES[them]} sent you {newSongs.length === 1 ? 'a song' : `${newSongs.length} songs`}
            </div>
            <div className="small muted ellipsis">{newSongs[0].title ?? 'Tap to listen'}</div>
          </div>
          <span style={{ color: 'var(--accent)' }}>→</span>
        </Link>
      )}

      <div className="card spread">
        <div>
          <div className="counter">{days.toLocaleString()}</div>
          <div className="muted small" style={{ marginTop: 4 }}>
            days of us
          </div>
        </div>
        <div className="faint small" style={{ textAlign: 'right' }}>
          since
          <br />
          {pretty(STARTED_DATING)}
        </div>
      </div>

      {memory && (
        <Link href="/moments?tab=memories" className="card pressable" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--pink) 16%, transparent), var(--card))' }}>
          <p className="tiny" style={{ color: 'var(--pink)' }}>
            {memory.yearsAgo === 1 ? 'This time last year' : `${memory.yearsAgo} years ago`}
          </p>
          <div className="row" style={{ marginTop: 8 }}>
            <span style={{ fontSize: 26 }}>{typeEmoji(memory.type)}</span>
            <div className="grow">
              <h3>{memory.title}</h3>
              <p className="small muted">{pretty(memory.date)}</p>
            </div>
          </div>
        </Link>
      )}

      {next.length > 0 && (
        <>
          <p className="section-label">Coming up</p>
          <div className="stack-sm">
            {next.map((e) => (
              <Link key={e.id + e.on} href="/moments" className="card tight row pressable">
                <span style={{ fontSize: 24 }}>{typeEmoji(e.type)}</span>
                <div className="grow">
                  <div style={{ fontWeight: 800 }} className="ellipsis">
                    {e.title}
                    {e.id === 'anniversary' && e.years ? ` · ${e.years} years` : ''}
                  </div>
                  <div className="small muted">{pretty(e.on, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                </div>
                <span className="pill accent">{relative(e.on)}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <p className="section-label">Our stuff</p>
      <div className="tiles">
        <Tile href="/music" em="🎧" t="Music" s="Songs for each other" />
        <Tile href="/photobooth" em="📸" t="Photobooth" s="Every strip ever" />
        <Tile href="/thoughts" em="💭" t="Thoughtboard" s="Random brain stuff" />
        <Tile href="/moments" em="🗓️" t="Moments" s="Big days & memories" />
        <Tile href="/games" em="🏆" t="Games" s="Who's winning" />
        <Tile href="/eats" em="🍜" t="Eats" s="Ratings & roasts" />
      </div>

      <WeeklyPickSheet open={picking} onClose={() => setPicking(false)} existing={mine} onSaved={picks.reload} />
    </main>
  )
}

function Tile({ href, em, t, s }: { href: string; em: string; t: string; s: string }) {
  return (
    <Link href={href} className="tile pressable">
      <span className="em">{em}</span>
      <span>
        <div className="t">{t}</div>
        <div className="s">{s}</div>
      </span>
    </Link>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Up late, huh'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

function WeeklyPickSheet({ open, onClose, existing, onSaved }: { open: boolean; onClose: () => void; existing?: Pick; onSaved: () => void }) {
  const { me } = useMe()
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | undefined>()
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setFile(null)
      setPreview(undefined)
      setCaption(existing?.caption ?? '')
    }
  }, [open, existing])

  async function save() {
    if (!file && !existing) return
    setBusy(true)
    try {
      const path = file ? await uploadImage(file, 'weekly') : existing!.image_path
      if (file && existing) await removeImage(existing.image_path)
      await upsert(
        'weekly_picks',
        { chooser: me, for_person: other(me), week_start: weekStart(), image_path: path, caption: caption.trim() || null, seen_at: file ? null : existing?.seen_at ?? null },
        'chooser,week_start',
      )
      toast('💌', `Sent. ${NAMES[other(me)]} has to open it next time.`)
      onSaved()
      onClose()
    } catch (e) {
      toast('😵', e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`This week's picture for ${NAMES[other(me)]}`}>
      <div className="stack">
        <PhotoPicker
          preview={preview ?? (existing ? imageUrl(existing.image_path) : undefined)}
          onPick={([f]) => {
            setFile(f)
            setPreview(URL.createObjectURL(f))
          }}
        />
        <Field label="Little caption (optional)">
          <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="remember this day?" maxLength={120} />
        </Field>
        <button className="btn block" disabled={busy || (!file && !existing)} onClick={save}>
          {busy ? 'Sending…' : existing && !file ? 'Update caption' : 'Send it'}
        </button>
      </div>
    </Sheet>
  )
}
