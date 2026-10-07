'use client'

import { useEffect, useMemo, useState } from 'react'
import { insert, remove, update } from '@/lib/db'
import { pretty, relative, today } from '@/lib/dates'
import { useMe, useRows } from '@/lib/hooks'
import { NAMES, other, type Person } from '@/lib/people'
import { roastFor } from '@/lib/roasts'
import { Empty, Field, Sheet, Stars, useToast } from '@/components/ui'

type Visit = {
  id: string
  name: string
  visited_on: string
  cuisine: string | null
  area: string | null
  tanzim_rating: number | null
  azrina_rating: number | null
  tanzim_review: string | null
  azrina_review: string | null
  created_by: Person | null
  created_at: string
}

type Place = {
  key: string
  name: string
  visits: Visit[]
  t: number | null
  a: number | null
  avg: number | null
  last: string
  cuisine: string | null
}

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null && x !== undefined).map(Number)
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
}

type Sort = 'avg' | 'recent' | 'visits' | 'name'

export default function EatsPage() {
  const { me } = useMe()
  const visits = useRows<Visit>('restaurant_visits', { order: { column: 'visited_on', ascending: false } })
  const [tab, setTab] = useState<'places' | 'visits'>('places')
  const [sort, setSort] = useState<Sort>('avg')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Visit | null>(null)
  const [place, setPlace] = useState<string | null>(null)

  const places = useMemo(() => {
    const m = new Map<string, Visit[]>()
    for (const v of visits.rows) {
      const k = v.name.trim().toLowerCase()
      m.set(k, [...(m.get(k) ?? []), v])
    }
    const out: Place[] = [...m.entries()].map(([key, vs]) => {
      const t = avg(vs.map((v) => v.tanzim_rating))
      const a = avg(vs.map((v) => v.azrina_rating))
      return {
        key,
        name: vs[0].name,
        visits: vs,
        t,
        a,
        avg: avg([...vs.map((v) => v.tanzim_rating), ...vs.map((v) => v.azrina_rating)]),
        last: vs.map((v) => v.visited_on).sort().reverse()[0],
        cuisine: vs.find((v) => v.cuisine)?.cuisine ?? null,
      }
    })
    const cmp: Record<Sort, (a: Place, b: Place) => number> = {
      avg: (a, b) => (b.avg ?? -1) - (a.avg ?? -1),
      recent: (a, b) => b.last.localeCompare(a.last),
      visits: (a, b) => b.visits.length - a.visits.length,
      name: (a, b) => a.name.localeCompare(b.name),
    }
    return out.sort(cmp[sort])
  }, [visits.rows, sort])

  const ql = q.trim().toLowerCase()
  const shownPlaces = places.filter((p) => !ql || p.name.toLowerCase().includes(ql) || (p.cuisine ?? '').toLowerCase().includes(ql))
  const shownVisits = visits.rows.filter((v) => !ql || v.name.toLowerCase().includes(ql) || (v.cuisine ?? '').toLowerCase().includes(ql))
  const month = today().slice(0, 7)
  const thisMonth = visits.rows.filter((v) => v.visited_on.startsWith(month)).length
  const openPlace = places.find((p) => p.key === place)

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Eats</h1>
          <p className="sub">
            {places.length} places · {visits.rows.length} visits · {thisMonth} this month
          </p>
        </div>
      </header>

      <div className="seg">
        <button className={tab === 'places' ? 'on' : ''} onClick={() => setTab('places')}>
          Places
        </button>
        <button className={tab === 'visits' ? 'on' : ''} onClick={() => setTab('visits')}>
          Every visit
        </button>
      </div>

      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search places or cuisine" />

      {visits.loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : visits.rows.length === 0 ? (
        <Empty emoji="🍜" title="No food logged yet" sub="Add every place you’ve eaten. The app will judge you." />
      ) : tab === 'places' ? (
        <>
          <div className="chips">
            {(
              [
                ['avg', 'Top rated'],
                ['recent', 'Recent'],
                ['visits', 'Most visited'],
                ['name', 'A–Z'],
              ] as [Sort, string][]
            ).map(([k, l]) => (
              <button key={k} className={`chip ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="card" style={{ padding: '10px 12px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Place</th>
                  <th className="num c-t">T</th>
                  <th className="num c-a">A</th>
                  <th className="num">Avg</th>
                </tr>
              </thead>
              <tbody>
                {shownPlaces.map((p) => (
                  <tr key={p.key} onClick={() => setPlace(p.key)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 800 }}>{p.name}</div>
                      <div className="faint small">
                        {p.visits.length > 1 ? `${p.visits.length} visits · ` : ''}
                        {p.cuisine ? `${p.cuisine} · ` : ''}
                        {relative(p.last)}
                      </div>
                    </td>
                    <td className="num">
                      <Stars value={p.t} color="var(--tanzim)" />
                    </td>
                    <td className="num">
                      <Stars value={p.a} color="var(--azrina)" />
                    </td>
                    <td className="num" style={{ fontSize: 16 }}>
                      <Stars value={p.avg} color="var(--text)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="stack">
          {shownVisits.map((v) => (
            <VisitCard key={v.id} v={v} me={me} onEdit={() => setEditing(v)} />
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setAdding(true)} aria-label="Add a place">
        +
      </button>

      <VisitSheet
        open={adding || !!editing}
        visit={editing}
        all={visits.rows}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
        onSaved={visits.reload}
      />

      <Sheet open={!!openPlace} onClose={() => setPlace(null)} title={openPlace?.name}>
        {openPlace && (
          <div className="stack">
            <div className="row">
              <div className="card grow center tight">
                <div className="display c-t" style={{ fontSize: 26 }}>
                  <Stars value={openPlace.t} />
                </div>
                <div className="small muted">{NAMES.tanzim}</div>
              </div>
              <div className="card grow center tight">
                <div className="display c-a" style={{ fontSize: 26 }}>
                  <Stars value={openPlace.a} />
                </div>
                <div className="small muted">{NAMES.azrina}</div>
              </div>
              <div className="card grow center tight">
                <div className="display" style={{ fontSize: 26 }}>
                  <Stars value={openPlace.avg} />
                </div>
                <div className="small muted">Average</div>
              </div>
            </div>
            {openPlace.visits.map((v) => (
              <VisitCard
                key={v.id}
                v={v}
                me={me}
                onEdit={() => {
                  setPlace(null)
                  setEditing(v)
                }}
              />
            ))}
          </div>
        )}
      </Sheet>
    </main>
  )
}

function VisitCard({ v, me, onEdit }: { v: Visit; me: Person; onEdit: () => void }) {
  const myRating = me === 'tanzim' ? v.tanzim_rating : v.azrina_rating
  return (
    <div className="card">
      <div className="spread">
        <div className="grow">
          <h3 className="ellipsis">{v.name}</h3>
          <p className="small faint">
            {pretty(v.visited_on)}
            {v.cuisine ? ` · ${v.cuisine}` : ''}
            {v.area ? ` · ${v.area}` : ''}
          </p>
        </div>
        <span className="display" style={{ fontSize: 22 }}>
          <Stars value={avg([v.tanzim_rating, v.azrina_rating])} />
        </span>
      </div>
      <div className="stack-sm" style={{ marginTop: 10 }}>
        {(['tanzim', 'azrina'] as Person[]).map((p) => {
          const r = p === 'tanzim' ? v.tanzim_rating : v.azrina_rating
          const rev = p === 'tanzim' ? v.tanzim_review : v.azrina_review
          return (
            <div key={p} className="row small" style={{ alignItems: 'flex-start' }}>
              <span className={p === 'tanzim' ? 'c-t' : 'c-a'} style={{ fontWeight: 800, width: 62, flex: 'none' }}>
                {NAMES[p]}
              </span>
              <span style={{ fontWeight: 800, width: 28, flex: 'none' }}>
                <Stars value={r} />
              </span>
              <span className="muted grow">{rev || (r === null ? 'no review yet' : '')}</span>
            </div>
          )
        })}
      </div>
      <button className="btn small ghost" style={{ marginTop: 12 }} onClick={onEdit}>
        {myRating === null ? 'Add your rating' : 'Edit'}
      </button>
    </div>
  )
}

function VisitSheet({ open, visit, all, onClose, onSaved }: { open: boolean; visit: Visit | null; all: Visit[]; onClose: () => void; onSaved: () => void }) {
  const { me } = useMe()
  const toast = useToast()
  const [name, setName] = useState('')
  const [date, setDate] = useState(today())
  const [cuisine, setCuisine] = useState('')
  const [area, setArea] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [review, setReview] = useState('')
  const [busy, setBusy] = useState(false)
  const rk = me === 'tanzim' ? 'tanzim_rating' : 'azrina_rating'
  const vk = me === 'tanzim' ? 'tanzim_review' : 'azrina_review'

  useEffect(() => {
    if (!open) return
    setName(visit?.name ?? '')
    setDate(visit?.visited_on ?? today())
    setCuisine(visit?.cuisine ?? '')
    setArea(visit?.area ?? '')
    setRating(visit ? (visit[rk] as number | null) : null)
    setReview(visit ? ((visit[vk] as string | null) ?? '') : '')
  }, [open, visit, rk, vk])

  const names = useMemo(() => Array.from(new Set(all.map((v) => v.name))).sort(), [all])

  // Fill in cuisine/area from earlier visits to the same place.
  useEffect(() => {
    if (visit) return
    const prev = all.find((v) => v.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (prev) {
      setCuisine((c) => c || prev.cuisine || '')
      setArea((a) => a || prev.area || '')
    }
  }, [name, all, visit])

  async function save() {
    if (!name.trim()) return
    setBusy(true)
    try {
      const row = { name: name.trim(), visited_on: date, cuisine: cuisine.trim() || null, area: area.trim() || null, [rk]: rating, [vk]: review.trim() || null }
      if (visit) {
        await update('restaurant_visits', visit.id, row)
        toast('🍽️', 'Saved')
      } else {
        const created = await insert<Visit>('restaurant_visits', { ...row, created_by: me })
        const roast = roastFor(created, all)
        if (roast) toast('🐷', roast, 6500)
        else toast('🍽️', `Added. ${NAMES[other(me)]} can add their rating too.`)
      }
      onSaved()
      onClose()
    } catch (e) {
      toast('😵', e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={visit ? visit.name : 'Where did you eat?'}>
      <div className="stack">
        <Field label="Place">
          <input className="input" list="places" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ramen place, the taco truck…" />
          <datalist id="places">
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>
        <div className="row">
          <div className="grow">
            <Field label="Cuisine">
              <input className="input" value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Japanese" />
            </Field>
          </div>
          <div className="grow">
            <Field label="Area">
              <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Downtown" />
            </Field>
          </div>
        </div>
        <Field label="When">
          <input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="field">
          <span>
            Your rating: <strong style={{ color: 'var(--accent)', fontSize: 16 }}>{rating === null ? 'not yet' : `${rating}/10`}</strong>
          </span>
          <input className="range" type="range" min={0} max={10} step={0.5} value={rating ?? 5} onChange={(e) => setRating(Number(e.target.value))} />
          {rating !== null && (
            <button className="faint small" style={{ alignSelf: 'flex-start', paddingLeft: 4 }} onClick={() => setRating(null)}>
              clear rating
            </button>
          )}
        </div>
        <Field label="Your review">
          <textarea className="input" rows={3} value={review} onChange={(e) => setReview(e.target.value)} placeholder="the dumplings carried, the service did not" />
        </Field>
        <button className="btn block" disabled={busy || !name.trim()} onClick={save}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {visit && (
          <button
            className="btn danger block"
            onClick={async () => {
              if (!confirm('Delete this visit?')) return
              await remove('restaurant_visits', visit.id)
              onSaved()
              onClose()
            }}
          >
            Delete visit
          </button>
        )}
      </div>
    </Sheet>
  )
}
