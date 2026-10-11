'use client'

import { useEffect, useMemo, useState } from 'react'
import { imageUrl, insert, remove, removeImage, update, uploadImage } from '@/lib/db'
import { parseYmd, pretty, relative, today, ymd } from '@/lib/dates'
import { EVENT_TYPES, onThisDay, parseBulk, pastEvents, typeEmoji, upcoming, type EventRow, type Upcoming } from '@/lib/events'
import { useMe, useRows } from '@/lib/hooks'
import { NAMES, type Person } from '@/lib/people'
import { Empty, Field, PhotoPicker, Sheet, useToast } from '@/components/ui'
import { ProposeDateSheet } from '@/components/DateIdeas'

type Tab = 'upcoming' | 'memories' | 'timeline'

export default function MomentsPage() {
  const events = useRows<EventRow>('events', { order: { column: 'date', ascending: true } })
  const [tab, setTab] = useState<Tab>('upcoming')
  const [editing, setEditing] = useState<EventRow | 'new' | null>(null)
  const [viewing, setViewing] = useState<EventRow | null>(null)
  const [importing, setImporting] = useState(false)
  const [proposing, setProposing] = useState(false)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t === 'memories' || t === 'timeline') setTab(t)
  }, [])

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Moments</h1>
          <p className="sub">Big days, small days, all of it</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn small" onClick={() => setProposing(true)}>
            💘 Propose
          </button>
          <button className="btn small ghost" onClick={() => setImporting(true)}>
            Bulk add
          </button>
        </div>
      </header>

      <div className="seg">
        <button className={tab === 'upcoming' ? 'on' : ''} onClick={() => setTab('upcoming')}>
          Upcoming
        </button>
        <button className={tab === 'memories' ? 'on' : ''} onClick={() => setTab('memories')}>
          Memories
        </button>
        <button className={tab === 'timeline' ? 'on' : ''} onClick={() => setTab('timeline')}>
          Timeline
        </button>
      </div>

      {events.loading ? (
        <div className="skeleton" style={{ height: 160 }} />
      ) : tab === 'upcoming' ? (
        <UpcomingList items={upcoming(events.rows)} onOpen={(e) => setViewing(e.id === 'anniversary' ? null : e)} />
      ) : tab === 'memories' ? (
        <Memories events={events.rows} onOpen={setViewing} />
      ) : (
        <Timeline events={events.rows} onOpen={setViewing} />
      )}

      <button className="fab" onClick={() => setEditing('new')} aria-label="Add a moment">
        +
      </button>

      <EventSheet
        open={!!editing}
        event={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={events.reload}
      />
      <EventView
        event={viewing}
        onClose={() => setViewing(null)}
        onEdit={() => {
          setEditing(viewing)
          setViewing(null)
        }}
        onDeleted={() => {
          setViewing(null)
          events.reload()
        }}
      />
      <ProposeDateSheet open={proposing} onClose={() => setProposing(false)} />
      <BulkSheet open={importing} onClose={() => setImporting(false)} onSaved={events.reload} />
    </main>
  )
}

function UpcomingList({ items, onOpen }: { items: Upcoming[]; onOpen: (e: Upcoming) => void }) {
  if (items.length <= 1 && items[0]?.id === 'anniversary') {
    return (
      <div className="stack">
        <EventCard e={items[0]} onOpen={() => {}} />
        <Empty emoji="🗓️" title="Nothing planned yet" sub="Add birthdays, tournaments, dates, parties, anything" />
      </div>
    )
  }
  const soon = items.filter((e) => e.on <= addMonths(1))
  const later = items.filter((e) => e.on > addMonths(1))
  return (
    <div className="stack">
      {soon.length > 0 && <p className="section-label">Next few weeks</p>}
      {soon.map((e) => (
        <EventCard key={e.id + e.on} e={e} onOpen={() => onOpen(e)} />
      ))}
      {later.length > 0 && <p className="section-label">Later</p>}
      {later.map((e) => (
        <EventCard key={e.id + e.on} e={e} onOpen={() => onOpen(e)} />
      ))}
    </div>
  )
}

function addMonths(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return ymd(d)
}

function EventCard({ e, onOpen }: { e: Upcoming; onOpen: () => void }) {
  const isToday = e.on === today()
  return (
    <button className={`card row pressable ${isToday ? 'glow new' : ''}`} onClick={onOpen} style={{ textAlign: 'left' }}>
      <div
        style={{
          width: 54,
          flex: 'none',
          textAlign: 'center',
          borderRadius: 14,
          padding: '6px 0',
          background: 'var(--card-hi)',
        }}
      >
        <div className="tiny" style={{ color: 'var(--accent)' }}>
          {parseYmd(e.on).toLocaleDateString(undefined, { month: 'short' })}
        </div>
        <div className="display" style={{ fontSize: 22, lineHeight: 1.1 }}>
          {parseYmd(e.on).getDate()}
        </div>
      </div>
      <div className="grow">
        <div style={{ fontWeight: 800 }} className="ellipsis">
          {typeEmoji(e.type)} {e.title}
        </div>
        <div className="small muted">
          {isToday ? 'Today!' : relative(e.on)}
          {e.yearly && e.years ? ` · ${e.type === 'birthday' ? 'turns ' : ''}${e.years}${e.type === 'birthday' ? '' : ` year${e.years === 1 ? '' : 's'}`}` : ''}
        </div>
      </div>
    </button>
  )
}

function Memories({ events, onOpen }: { events: EventRow[]; onOpen: (e: EventRow) => void }) {
  const past = pastEvents(events)
  const otd = onThisDay(events)
  const [random, setRandom] = useState<EventRow | null>(null)
  const thisMonth = useMemo(() => {
    const m = new Date().getMonth()
    const y = new Date().getFullYear()
    const near = new Set(otd.map((e) => e.id))
    return past.filter((e) => !near.has(e.id) && parseYmd(e.date).getMonth() === m && parseYmd(e.date).getFullYear() < y)
  }, [past, otd])

  if (past.length === 0) return <Empty emoji="📼" title="No memories yet" sub="Add past events (or bulk add a bunch) and they’ll resurface here" />

  const shuffle = () => {
    const pool = past.filter((e) => e.id !== random?.id)
    setRandom(pool[Math.floor(Math.random() * pool.length)] ?? past[0])
  }

  return (
    <div className="stack">
      <p className="section-label">On this day</p>
      {otd.length ? (
        otd.map((e) => <MemoryCard key={e.id} e={e} label={e.yearsAgo === 1 ? 'Last year' : `${e.yearsAgo} years ago`} onOpen={() => onOpen(e)} />)
      ) : (
        <p className="muted small" style={{ paddingLeft: 4 }}>
          Nothing from this week in past years. Yet.
        </p>
      )}

      <p className="section-label">Random memory</p>
      {random ? <MemoryCard e={random} label={relative(random.date)} onOpen={() => onOpen(random)} /> : null}
      <button className="btn ghost block" onClick={shuffle}>
        🎲 {random ? 'Another one' : 'Give me a random memory'}
      </button>

      {thisMonth.length > 0 && (
        <>
          <p className="section-label">This month, other years</p>
          {thisMonth.map((e) => (
            <MemoryCard key={e.id} e={e} label={pretty(e.date)} onOpen={() => onOpen(e)} />
          ))}
        </>
      )}
    </div>
  )
}

function MemoryCard({ e, label, onOpen }: { e: EventRow; label: string; onOpen: () => void }) {
  const img = imageUrl(e.image_path)
  return (
    <button className="card pressable pop" onClick={onOpen} style={{ textAlign: 'left', padding: 0, overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {img && <img src={img} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />}
      <div style={{ padding: 16 }}>
        <p className="tiny" style={{ color: 'var(--pink)' }}>
          {label}
        </p>
        <h3 style={{ marginTop: 4 }}>
          {typeEmoji(e.type)} {e.title}
        </h3>
        {e.notes && (
          <p className="small muted" style={{ marginTop: 4 }}>
            {e.notes}
          </p>
        )}
      </div>
    </button>
  )
}

function Timeline({ events, onOpen }: { events: EventRow[]; onOpen: (e: EventRow) => void }) {
  const past = pastEvents(events)
  if (!past.length) return <Empty emoji="🧵" title="The timeline is empty" sub="Past events show up here, newest first" />
  const years = Array.from(new Set(past.map((e) => e.date.slice(0, 4))))
  return (
    <div className="stack">
      {years.map((y) => (
        <div key={y} className="stack-sm">
          <p className="section-label">{y}</p>
          {past
            .filter((e) => e.date.startsWith(y))
            .map((e) => (
              <button key={e.id} className="card tight row pressable" onClick={() => onOpen(e)} style={{ textAlign: 'left' }}>
                <span style={{ fontSize: 22 }}>{typeEmoji(e.type)}</span>
                <div className="grow">
                  <div style={{ fontWeight: 800 }} className="ellipsis">
                    {e.title}
                  </div>
                  <div className="small muted">{pretty(e.date, { month: 'long', day: 'numeric' })}</div>
                </div>
                {e.image_path && <span className="faint">📷</span>}
              </button>
            ))}
        </div>
      ))}
    </div>
  )
}

function EventView({ event, onClose, onEdit, onDeleted }: { event: EventRow | null; onClose: () => void; onEdit: () => void; onDeleted: () => void }) {
  if (!event) return null
  const img = imageUrl(event.image_path)
  return (
    <Sheet open onClose={onClose}>
      <div className="stack">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img && <img src={img} alt="" className="photo" style={{ maxHeight: 320 }} />}
        <div>
          <p className="tiny" style={{ color: 'var(--accent)' }}>
            {EVENT_TYPES.find((t) => t.id === event.type)?.label ?? 'Moment'}
            {event.yearly ? ' · every year' : ''}
          </p>
          <h2 style={{ margin: '4px 0 2px' }}>
            {typeEmoji(event.type)} {event.title}
          </h2>
          <p className="muted">
            {pretty(event.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {event.end_date ? ` → ${pretty(event.end_date, { month: 'long', day: 'numeric' })}` : ''}
          </p>
        </div>
        {event.notes && <p>{event.notes}</p>}
        {event.created_by && <p className="faint small">Added by {NAMES[event.created_by as Person]}</p>}
        <div className="row">
          <button className="btn ghost grow" onClick={onEdit}>
            Edit
          </button>
          <button
            className="btn danger"
            onClick={async () => {
              if (!confirm('Delete this moment?')) return
              await removeImage(event.image_path)
              await remove('events', event.id)
              onDeleted()
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </Sheet>
  )
}

function EventSheet({ open, event, onClose, onSaved }: { open: boolean; event: EventRow | null; onClose: () => void; onSaved: () => void }) {
  const { me } = useMe()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today())
  const [endDate, setEndDate] = useState('')
  const [type, setType] = useState('date')
  const [notes, setNotes] = useState('')
  const [yearly, setYearly] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(event?.title ?? '')
    setDate(event?.date ?? today())
    setEndDate(event?.end_date ?? '')
    setType(event?.type ?? 'date')
    setNotes(event?.notes ?? '')
    setYearly(event?.yearly ?? false)
    setFile(null)
  }, [open, event])

  async function save() {
    if (!title.trim() || !date) return
    setBusy(true)
    try {
      let image_path = event?.image_path ?? null
      if (file) {
        const p = await uploadImage(file, 'events')
        if (image_path) await removeImage(image_path)
        image_path = p
      }
      const row = { title: title.trim(), date, end_date: endDate || null, type, notes: notes.trim() || null, yearly, image_path }
      if (event) await update('events', event.id, row)
      else await insert('events', { ...row, created_by: me })
      toast(typeEmoji(type), event ? 'Updated' : 'Added')
      onSaved()
      onClose()
    } catch (e) {
      toast('😵', e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={event ? 'Edit moment' : 'New moment'}>
      <div className="stack">
        <div className="chips">
          {EVENT_TYPES.map((t) => (
            <button
              key={t.id}
              className={`chip ${type === t.id ? 'on' : ''}`}
              onClick={() => {
                setType(t.id)
                if (t.id === 'birthday') setYearly(true)
              }}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
        <Field label="What">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Azrina's birthday, Ping pong tournament…" />
        </Field>
        <div className="row">
          <div className="grow">
            <Field label="When">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div className="grow">
            <Field label="Until (optional)">
              <input className="input" type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>
        </div>
        <label className="row card tight" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={yearly} onChange={(e) => setYearly(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
          <span className="grow">Happens every year</span>
        </label>
        <Field label="Notes (optional)">
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="what happened, who was there, the lore" />
        </Field>
        <PhotoPicker
          preview={file ? URL.createObjectURL(file) : imageUrl(event?.image_path)}
          onPick={([f]) => setFile(f)}
        />
        <button className="btn block" onClick={save} disabled={busy || !title.trim()}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Sheet>
  )
}

function BulkSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { me } = useMe()
  const toast = useToast()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const parsed = parseBulk(text)

  async function save() {
    setBusy(true)
    try {
      for (const e of parsed) await insert('events', { ...e, created_by: me })
      toast('📼', `Added ${parsed.length} moments`)
      setText('')
      onSaved()
      onClose()
    } catch (e) {
      toast('😵', e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add a bunch at once">
      <div className="stack">
        <p className="muted small">
          One per line: <code>date | title | type | notes</code>. Type and notes are optional. Types: {EVENT_TYPES.map((t) => t.id).join(', ')}.
        </p>
        <textarea
          className="input"
          rows={9}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'2024-04-22 | First date | date | sushi then the pier\n2024-07-04 | Fireworks at the beach | party\n2025-01-15 | Azrina’s birthday | birthday'}
          style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
        />
        <button className="btn block" onClick={save} disabled={busy || parsed.length === 0}>
          {busy ? 'Adding…' : `Add ${parsed.length || ''} moment${parsed.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </Sheet>
  )
}
