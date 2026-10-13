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
import Icon, { type IconName } from '@/components/Icon'
import DietCoke from '@/components/DietCoke'
import { board, type Score } from '@/lib/games'
import { byFavorite, groupPlaces, type Visit } from '@/lib/eats'
import { countNew } from '@/lib/seen'
import type { Movie } from '@/lib/movies'
import type { ReactNode } from 'react'

type Pick = { id: string; chooser: string; for_person: string; image_path: string; caption: string | null; seen_at: string | null; week_start: string }
type Song = { id: string; from_person: string; to_person: string | null; title: string | null; artist: string | null; image_url: string | null; kind: string; seen_at: string | null; created_at: string }
type Strip = { id: string; image_path: string; created_by: string | null; created_at: string }
type Thought = { id: string; person: string; body: string; seen_at: string | null; created_at: string }

export default function Home() {
  const { me } = useMe()
  const them = other(me)
  const week = weekStart()
  const picks = useRows<Pick>('weekly_picks', { eq: { week_start: week } })
  const events = useRows<EventRow>('events')
  const songs = useRows<Song>('songs', { order: { column: 'created_at', ascending: false } })
  const strips = useRows<Strip>('photobooth', { order: { column: 'created_at', ascending: false } })
  const thoughts = useRows<Thought>('thoughts', { order: { column: 'created_at', ascending: false } })
  const scores = useRows<Score & { id: string; created_at: string }>('game_scores')
  const visits = useRows<Visit>('restaurant_visits')
  const movies = useRows<Movie>('movies', { order: { column: 'created_at', ascending: false } })
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
  const newSongs = songs.rows.filter((s) => s.kind === 'sent' && s.to_person === me && !s.seen_at)

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{greeting()}</p>
          <h1>
            Hi <em>{NAMES[me]}</em>
          </h1>
        </div>
        <div className="row">
          {streak ? (
            <span className="pill accent" title={`${streak} day Diet Coke streak`} style={{ padding: '2px 10px 2px 6px' }}>
              <DietCoke height={28} /> {streak}
            </span>
          ) : null}
          <Link href="/more" className="icon-btn" aria-label="More">
            <Icon name="gear" size={19} />
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
          <Icon name="photo" size={30} style={{ margin: '0 auto', opacity: 0.5 }} />
          <p className="muted" style={{ marginTop: 10 }}>
            {NAMES[them]} hasn&apos;t picked your picture this week yet
          </p>
        </div>
      )}

      {mine ? (
        <button className="card tight row pressable" onClick={() => setPicking(true)} style={{ textAlign: 'left' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(mine.image_path)} alt="" className="thumb" />
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Your pick for {NAMES[them]}</div>
            <div className="small muted">{mine.seen_at ? 'Opened ✓' : 'Not opened yet'}</div>
          </div>
          <span className="faint small">Change</span>
        </button>
      ) : (
        <button className="card row pressable new" onClick={() => setPicking(true)} style={{ textAlign: 'left' }}>
          <span className="icon-chip">
            <Icon name="heart" size={20} />
          </span>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Pick this week&apos;s picture for {NAMES[them]}</div>
            <div className="small muted">It&apos;s the first thing they see when they open the app</div>
          </div>
          <Icon name="arrow" size={18} style={{ color: 'var(--accent)' }} />
        </button>
      )}

      <DateIdeasCard />

      {newSongs.length > 0 && (
        <Link href="/music" className="card row pressable new">
          {newSongs[0].image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={newSongs[0].image_url} alt="" className="thumb" style={{ width: 44, height: 44 }} />
          ) : (
            <span className="icon-chip">
              <Icon name="music" size={20} />
            </span>
          )}
          <div className="grow">
            <div style={{ fontWeight: 600 }}>
              {NAMES[them]} sent you {newSongs.length === 1 ? 'a song' : `${newSongs.length} songs`}
            </div>
            <div className="small muted ellipsis">{newSongs[0].title ?? 'Tap to listen'}</div>
          </div>
          <Icon name="arrow" size={18} style={{ color: 'var(--accent)' }} />
        </Link>
      )}

      <div className="card spread">
        <div>
          <div className="counter">{days.toLocaleString()}</div>
          <div className="muted small" style={{ marginTop: 4 }}>
            days together
          </div>
        </div>
        <div className="faint small" style={{ textAlign: 'right' }}>
          since
          <br />
          {pretty(STARTED_DATING)}
        </div>
      </div>

      {memory && (
        <Link href="/moments?tab=memories" className="card pressable">
          <p className="eyebrow">
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
                  <div style={{ fontWeight: 600 }} className="ellipsis">
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
        <Tile href="/music" ico="music" t="Music" fresh={countNew('music', songs.rows, (x) => x.from_person === them)}>
          {songs.rows.length ? (
            <div className="row" style={{ gap: 8 }}>
              <div className="covers">
                {songs.rows
                  .filter((x) => x.image_url)
                  .slice(0, 3)
                  .map((x) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={x.id} src={x.image_url!} alt="" />
                  ))}
              </div>
              <span className="ellipsis grow">{songs.rows[0].title ?? 'A song'}</span>
            </div>
          ) : (
            'Songs for each other'
          )}
        </Tile>
        <Tile href="/photobooth" ico="camera" t="Photobooth" fresh={countNew('photobooth', strips.rows, (x) => x.created_by === them)} bg={strips.rows[0] && imageUrl(strips.rows[0].image_path)}>
          {strips.rows.length ? `${strips.rows.length} strip${strips.rows.length === 1 ? '' : 's'}` : 'Every strip ever'}
        </Tile>
        <Tile href="/thoughts" ico="thought" t="Thoughtboard" fresh={thoughts.rows.filter((x) => x.person === them && !x.seen_at).length}>
          {thoughts.rows[0] ? <span className="clamp quote">{thoughts.rows[0].body}</span> : 'Random brain stuff'}
        </Tile>
        <Tile href="/moments" ico="calendar" t="Moments" fresh={countNew('moments', events.rows as (EventRow & { created_at?: string })[], (x) => x.created_by === them)}>
          {next[0] ? (
            <span className="ellipsis" style={{ display: 'block' }}>
              {next[0].title} · <span style={{ color: 'var(--accent)' }}>{relative(next[0].on)}</span>
            </span>
          ) : (
            'Big days & memories'
          )}
        </Tile>
        <Tile href="/games" ico="trophy" t="Games" fresh={countNew('games', scores.rows, (x) => x.person === them)}>
          <GamesPreview scores={scores.rows} />
        </Tile>
        <Tile href="/eats" ico="burger" t="Eats" fresh={countNew('eats', visits.rows, (x) => x.created_by === them)}>
          <EatsPreview visits={visits.rows} />
        </Tile>
        <Tile href="/movies" ico="film" t="Movies" wide fresh={countNew('movies', movies.rows, (x) => x.created_by === them)}>
          {movies.rows.some((m) => m.poster_url) ? (
            <span className="poster-row" style={{ marginTop: 4 }}>
              {movies.rows
                .filter((m) => m.poster_url)
                .slice(0, 7)
                .map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={m.poster_url!} alt="" />
                ))}
            </span>
          ) : movies.rows.length ? (
            `${movies.rows.length} seen together`
          ) : (
            'Everything we saw together'
          )}
        </Tile>
      </div>

      <WeeklyPickSheet open={picking} onClose={() => setPicking(false)} existing={mine} onSaved={picks.reload} />
    </main>
  )
}

function Tile({ href, ico, t, fresh, bg, wide, children }: { href: string; ico: IconName; t: string; fresh: number; bg?: string; wide?: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={`tile pressable ${bg ? 'has-bg' : ''} ${wide ? 'wide' : ''}`}>
      {bg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bg} alt="" className="tile-bg" />
      )}
      {fresh > 0 && <span className="new-badge">{fresh} new</span>}
      <span className="tile-ico">
        <Icon name={ico} size={20} />
      </span>
      <span style={{ minWidth: 0 }}>
        <div className="t">{t}</div>
        <div className="s">{children}</div>
      </span>
    </Link>
  )
}

function GamesPreview({ scores }: { scores: Score[] }) {
  const b = board(scores)
  const total = b.wins.tanzim + b.wins.azrina
  if (!scores.length) return <>Who&apos;s winning</>
  return (
    <span style={{ display: 'block' }}>
      <span className="spread" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="c-t">{NAMES.tanzim[0]} {b.wins.tanzim}</span>
        <span className="c-a">{b.wins.azrina} {NAMES.azrina[0]}</span>
      </span>
      <span className="bar thin" style={{ marginTop: 6 }}>
        <i style={{ width: total ? `${(b.wins.tanzim / total) * 100}%` : '50%', background: 'var(--tanzim)' }} />
        <i style={{ width: total ? `${(b.wins.azrina / total) * 100}%` : '50%', background: 'var(--azrina)' }} />
      </span>
    </span>
  )
}

function EatsPreview({ visits }: { visits: Visit[] }) {
  const top = groupPlaces(visits).sort(byFavorite)[0]
  if (!top) return <>Ratings & roasts</>
  return (
    <span style={{ display: 'block' }}>
      <span className="ellipsis" style={{ display: 'block', color: 'var(--text)' }}>
        {top.name}
      </span>
      {top.avg !== null ? <span style={{ color: 'var(--accent)' }}>Favorite · {top.avg}</span> : 'Favorite'}
    </span>
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
