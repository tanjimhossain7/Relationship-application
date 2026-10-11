'use client'

import { useEffect, useState } from 'react'
import { insert, list, update } from '@/lib/db'
import { pretty, relative, today } from '@/lib/dates'
import { useMe } from '@/lib/hooks'
import { NAMES, other, type Person } from '@/lib/people'
import { Field, Sheet, useToast } from './ui'

export type DateIdea = {
  id: string
  from_person: Person
  to_person: Person
  what: string
  place: string | null
  on_date: string | null
  at_time: string | null
  note: string | null
  status: 'pending' | 'yes' | 'maybe'
  responded_at: string | null
  seen_answer_at: string | null
  event_id: string | null
  created_at: string
}

export function whenText(d: DateIdea) {
  const day = d.on_date ? pretty(d.on_date, { weekday: 'long', month: 'short', day: 'numeric' }) : 'Some day soon'
  return d.at_time ? `${day} · ${d.at_time}` : day
}

/** Saves the answer. A yes also drops the date into Moments. */
export async function answerIdea(d: DateIdea, status: 'yes' | 'maybe') {
  let event_id = d.event_id
  if (status === 'yes' && !event_id && d.on_date) {
    const ev = await insert<{ id: string }>('events', {
      title: d.place ? `${d.what} @ ${d.place}` : d.what,
      date: d.on_date,
      type: 'date',
      notes: [d.at_time, d.note].filter(Boolean).join(' · ') || null,
      yearly: false,
      created_by: d.from_person,
    })
    event_id = ev.id
  }
  await update('date_ideas', d.id, { status, responded_at: new Date().toISOString(), seen_answer_at: null, event_id })
}

/** Shown when the app opens: date ideas waiting on your answer, one at a time. */
export function DateIdeaPopup({ me, onDone }: { me: Person; onDone: () => void }) {
  const [queue, setQueue] = useState<DateIdea[] | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    list<DateIdea>('date_ideas', { eq: { to_person: me, status: 'pending' }, order: { column: 'created_at', ascending: true } })
      .then((rows) => {
        if (rows.length) setQueue(rows)
        else onDone()
      })
      .catch(() => onDone())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me])

  if (!queue?.length) return null
  const d = queue[0]

  async function answer(status: 'yes' | 'maybe') {
    setBusy(true)
    try {
      await answerIdea(d, status)
    } catch {
      // keep going; it'll ask again next time
    }
    setBusy(false)
    const rest = queue!.slice(1)
    if (rest.length) setQueue(rest)
    else onDone()
  }

  return (
    <div className="fullscreen" style={{ gap: 22 }}>
      <div className="float" style={{ fontSize: 76 }}>
        💘
      </div>
      <div className="stack-sm">
        <p className="tiny" style={{ color: 'var(--accent)' }}>
          {NAMES[d.from_person]} wants to take you on a date
        </p>
        <h1 style={{ fontSize: 32 }}>{d.what}</h1>
      </div>
      <div className="card stack-sm" style={{ width: '100%', maxWidth: 380, textAlign: 'left' }}>
        {d.place && (
          <div className="row">
            <span>📍</span>
            <span>{d.place}</span>
          </div>
        )}
        <div className="row">
          <span>🗓️</span>
          <span>{whenText(d)}</span>
        </div>
        {d.note && (
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span>💬</span>
            <span className="muted">{d.note}</span>
          </div>
        )}
      </div>
      <div className="stack-sm" style={{ width: '100%', maxWidth: 380 }}>
        <button className="btn block" disabled={busy} onClick={() => answer('yes')}>
          Yes! 💕
        </button>
        <button className="btn ghost block" disabled={busy} onClick={() => answer('maybe')}>
          Maybe, I have to check
        </button>
      </div>
      {queue.length > 1 && <p className="faint small">{queue.length - 1} more after this</p>}
    </div>
  )
}

export function ProposeDateSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: () => void }) {
  const { me } = useMe()
  const toast = useToast()
  const [what, setWhat] = useState('')
  const [place, setPlace] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setWhat('')
    setPlace('')
    setDate('')
    setTime('')
    setNote('')
  }, [open])

  async function save() {
    if (!what.trim() || !date) return
    setBusy(true)
    try {
      await insert('date_ideas', {
        from_person: me,
        to_person: other(me),
        what: what.trim(),
        place: place.trim() || null,
        on_date: date,
        at_time: time ? formatTime(time) : null,
        note: note.trim() || null,
        status: 'pending',
      })
      toast('💘', `Sent. ${NAMES[other(me)]} sees it next time they open the app.`)
      onSaved?.()
      window.dispatchEvent(new Event('us:date-ideas'))
      onClose()
    } catch (e) {
      toast('😵', e instanceof Error ? e.message : 'Could not send')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Propose a date to ${NAMES[other(me)]}`}>
      <div className="stack">
        <Field label="What">
          <input className="input" value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Sushi and a sunset walk" maxLength={120} />
        </Field>
        <Field label="Where">
          <input className="input" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Waterfront, that place on King St…" maxLength={120} />
        </Field>
        <div className="row">
          <div className="grow">
            <Field label="When">
              <input className="input" type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div style={{ width: 130 }}>
            <Field label="Time (optional)">
              <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
        </div>
        <Field label="Anything else (optional)">
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="dress cute, I'm driving" />
        </Field>
        <button className="btn block" disabled={busy || !what.trim() || !date} onClick={save}>
          {busy ? 'Sending…' : 'Send it 💘'}
        </button>
      </div>
    </Sheet>
  )
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** Home card: your proposals and their answers, plus maybes you still owe an answer on. */
export function DateIdeasCard() {
  const { me } = useMe()
  const toast = useToast()
  const [ideas, setIdeas] = useState<DateIdea[]>([])
  const [proposing, setProposing] = useState(false)

  const load = () =>
    list<DateIdea>('date_ideas', { order: { column: 'created_at', ascending: false } })
      .then(setIdeas)
      .catch(() => {})

  useEffect(() => {
    load()
    window.addEventListener('us:date-ideas', load)
    return () => window.removeEventListener('us:date-ideas', load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me])

  // Tell the proposer once when an answer comes in.
  useEffect(() => {
    const fresh = ideas.filter((d) => d.from_person === me && d.status !== 'pending' && !d.seen_answer_at)
    if (!fresh.length) return
    const d = fresh[0]
    toast(d.status === 'yes' ? '💕' : '🤔', d.status === 'yes' ? `${NAMES[d.to_person]} said yes to ${d.what}!` : `${NAMES[d.to_person]} said maybe to ${d.what}`, 5000)
    Promise.all(fresh.map((x) => update('date_ideas', x.id, { seen_answer_at: new Date().toISOString() }))).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideas, me])

  const upcomingOnly = (d: DateIdea) => !d.on_date || d.on_date >= today()
  const owed = ideas.filter((d) => d.to_person === me && d.status === 'maybe' && upcomingOnly(d))
  const mine = ideas.filter((d) => d.from_person === me && upcomingOnly(d)).slice(0, 3)

  return (
    <>
      <button className="card row pressable" onClick={() => setProposing(true)} style={{ textAlign: 'left' }}>
        <span style={{ fontSize: 26 }}>💘</span>
        <div className="grow">
          <div style={{ fontWeight: 800 }}>Propose a date</div>
          <div className="small muted">What, where, when. {NAMES[other(me)]} answers when they open the app.</div>
        </div>
        <span style={{ color: 'var(--accent)', fontSize: 22 }}>+</span>
      </button>

      {owed.map((d) => (
        <div key={d.id} className="card new">
          <p className="tiny" style={{ color: 'var(--accent)' }}>
            You said maybe · {NAMES[d.from_person]}&apos;s idea
          </p>
          <h3 style={{ marginTop: 4 }}>{d.what}</h3>
          <p className="small muted">
            {d.place ? `${d.place} · ` : ''}
            {whenText(d)}
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn small" onClick={() => answerIdea(d, 'yes').then(load)}>
              Okay yes 💕
            </button>
            <span className="faint small">still checking…</span>
          </div>
        </div>
      ))}

      {mine.length > 0 && (
        <div className="stack-sm">
          {mine.map((d) => (
            <div key={d.id} className="card tight row">
              <div className="grow">
                <div style={{ fontWeight: 800 }} className="ellipsis">
                  {d.what}
                </div>
                <div className="small muted ellipsis">
                  {d.on_date ? relative(d.on_date) : ''}
                  {d.place ? ` · ${d.place}` : ''}
                </div>
              </div>
              <span className={`pill ${d.status === 'yes' ? 'accent' : ''}`}>{d.status === 'yes' ? 'Yes 💕' : d.status === 'maybe' ? 'Maybe 🤔' : 'Waiting'}</span>
            </div>
          ))}
        </div>
      )}

      <ProposeDateSheet open={proposing} onClose={() => setProposing(false)} onSaved={load} />
    </>
  )
}
