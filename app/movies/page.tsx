'use client'

import { useEffect, useState } from 'react'
import { insert, remove, update } from '@/lib/db'
import { pretty } from '@/lib/dates'
import { useMe, useRows } from '@/lib/hooks'
import { NAMES } from '@/lib/people'
import { useMarkSeen } from '@/lib/seen'
import { findPoster, type Movie } from '@/lib/movies'
import { Empty, Field, Sheet, useToast } from '@/components/ui'

export default function MoviesPage() {
  useMarkSeen('movies')
  const movies = useRows<Movie>('movies', { order: { column: 'created_at', ascending: false } })
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<Movie | null>(null)
  const sorted = [...movies.rows].sort((a, b) => (b.watched_on ?? b.created_at).localeCompare(a.watched_on ?? a.created_at))

  // Movies added without a poster (or before the lookup existed) get one once.
  useEffect(() => {
    for (const m of movies.rows.filter((m) => !m.poster_url).slice(0, 8)) {
      findPoster(m.title, m.year).then((poster) => {
        if (!poster) return
        movies.setRows((rows) => rows.map((r) => (r.id === m.id ? { ...r, poster_url: poster } : r)))
        update('movies', m.id, { poster_url: poster }).catch(() => {})
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies.rows.map((m) => m.id + (m.poster_url ? 1 : 0)).join()])

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Movies</h1>
          <p className="sub">{sorted.length ? `${sorted.length} seen together` : 'Everything we saw together'}</p>
        </div>
      </header>

      {movies.loading ? (
        <div className="posters">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton poster" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Empty emoji="🎬" title="No movies yet" sub="Add every movie you saw together" />
      ) : (
        <div className="posters">
          {sorted.map((m) => (
            <button key={m.id} className="pressable" onClick={() => setOpen(m)} style={{ textAlign: 'left', minWidth: 0 }}>
              {m.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.poster_url} alt="" className="poster" loading="lazy" />
              ) : (
                <div className="poster poster-empty">
                  <span className="display">{m.title}</span>
                </div>
              )}
              <div className="small ellipsis" style={{ marginTop: 6, fontWeight: 500 }}>
                {m.title}
              </div>
              {m.watched_on && <div className="tiny faint">{pretty(m.watched_on, { month: 'short', year: 'numeric' })}</div>}
            </button>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setAdding(true)} aria-label="Add a movie">
        +
      </button>

      <MovieSheet open={adding || !!open} movie={open} onClose={() => (setAdding(false), setOpen(null))} onSaved={movies.reload} />
    </main>
  )
}

function MovieSheet({ open, movie, onClose, onSaved }: { open: boolean; movie: Movie | null; onClose: () => void; onSaved: () => void }) {
  const { me } = useMe()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(movie?.title ?? '')
    setYear(movie?.year ? String(movie.year) : '')
    setDate(movie?.watched_on ?? '')
    setNote(movie?.note ?? '')
  }, [open, movie])

  async function save() {
    if (!title.trim()) return
    setBusy(true)
    try {
      const y = Number(year) || null
      const changed = !movie || movie.title !== title.trim() || movie.year !== y
      const row = {
        title: title.trim(),
        year: y,
        watched_on: date || null,
        note: note.trim() || null,
        // A new or renamed movie looks its poster up again.
        poster_url: changed ? await findPoster(title.trim(), y) : movie!.poster_url,
      }
      if (movie) await update('movies', movie.id, row)
      else await insert('movies', { ...row, created_by: me })
      toast('🎬', movie ? 'Saved' : `${row.title} added`)
      onSaved()
      onClose()
    } catch (e) {
      toast('😵', e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={movie ? movie.title : 'Add a movie'}>
      <div className="stack">
        {movie?.poster_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={movie.poster_url} alt="" className="poster" style={{ width: 140, alignSelf: 'center' }} />
        )}
        {movie?.created_by && (
          <p className="small faint center" style={{ marginTop: -4 }}>
            Added by {movie.created_by === me ? 'you' : NAMES[movie.created_by as keyof typeof NAMES]}
          </p>
        )}
        <Field label="Movie">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Marty Supreme" />
        </Field>
        <div className="row">
          <Field label="Year (helps find the poster)">
            <input className="input" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="2025" />
          </Field>
          <Field label="Watched on (optional)">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Note (optional)">
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="cried, will not be taking questions" />
        </Field>
        <button className="btn block" disabled={busy || !title.trim()} onClick={save}>
          {busy ? 'Saving…' : movie ? 'Save' : 'Add'}
        </button>
        {movie && (
          <button
            className="faint small"
            onClick={async () => {
              if (!confirm(`Remove ${movie.title}?`)) return
              await remove('movies', movie.id)
              onSaved()
              onClose()
            }}
          >
            Delete
          </button>
        )}
      </div>
    </Sheet>
  )
}
