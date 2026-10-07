'use client'

import { useEffect, useState } from 'react'
import { insert, remove, update } from '@/lib/db'
import { timeAgo } from '@/lib/dates'
import { useMe, useRows } from '@/lib/hooks'
import { NAMES, other, type Person } from '@/lib/people'
import { Empty, useToast } from '@/components/ui'

type Thought = { id: string; person: Person; body: string; reaction: string | null; seen_at: string | null; created_at: string }

const STARTERS = ['hmm it’s so interesting that', 'random thought:', 'not to be dramatic but', 'shower thought:', 'hot take:', 'i was just thinking about']
const REACTIONS = ['❤️', '😂', '🤯', '🥹', '🤔', '💀']

export default function ThoughtsPage() {
  const { me } = useMe()
  const toast = useToast()
  const thoughts = useRows<Thought>('thoughts', { order: { column: 'created_at', ascending: false } })
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [starter] = useState(() => STARTERS[Math.floor(Math.random() * STARTERS.length)])
  const [filter, setFilter] = useState<'all' | Person>('all')

  // Mark the other person's thoughts as read after a moment on the page.
  useEffect(() => {
    const unseen = thoughts.rows.filter((t) => t.person !== me && !t.seen_at)
    if (!unseen.length) return
    const t = setTimeout(async () => {
      await Promise.all(unseen.map((x) => update('thoughts', x.id, { seen_at: new Date().toISOString() }))).catch(() => {})
      window.dispatchEvent(new Event('us:thoughts-seen'))
    }, 2000)
    return () => clearTimeout(t)
  }, [thoughts.rows, me])

  async function post() {
    if (!body.trim()) return
    setBusy(true)
    try {
      await insert('thoughts', { person: me, body: body.trim() })
      setBody('')
      thoughts.reload()
      toast('💭', `Out there for ${NAMES[other(me)]} to find`)
    } catch (e) {
      toast('😵', e instanceof Error ? e.message : 'Could not post')
    } finally {
      setBusy(false)
    }
  }

  async function react(t: Thought, r: string) {
    const reaction = t.reaction === r ? null : r
    thoughts.setRows((rows) => rows.map((x) => (x.id === t.id ? { ...x, reaction } : x)))
    await update('thoughts', t.id, { reaction }).catch(() => thoughts.reload())
  }

  const shown = thoughts.rows.filter((t) => filter === 'all' || t.person === filter)

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Thoughtboard</h1>
          <p className="sub">Brain dumps for the other one to find</p>
        </div>
      </header>

      <div className="card">
        <textarea
          className="input"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`${starter}…`}
          style={{ background: 'transparent', border: 0, padding: 4, fontSize: 17 }}
          maxLength={1000}
        />
        <div className="spread" style={{ marginTop: 8 }}>
          <span className="faint small">{body.length ? `${body.length}/1000` : ''}</span>
          <button className="btn small" onClick={post} disabled={busy || !body.trim()}>
            Put it out there
          </button>
        </div>
      </div>

      <div className="chips">
        {(['all', 'tanzim', 'azrina'] as const).map((f) => (
          <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Everything' : f === me ? 'Mine' : NAMES[f]}
          </button>
        ))}
      </div>

      {thoughts.loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : shown.length === 0 ? (
        <Empty emoji="💭" title="Quiet in here" sub="First random thought wins nothing" />
      ) : (
        <div className="stack">
          {shown.map((t) => {
            const mine = t.person === me
            return (
              <div
                key={t.id}
                className={`card ${!mine && !t.seen_at ? 'new' : ''}`}
                style={{
                  borderLeft: `3px solid var(--${t.person})`,
                  borderTopLeftRadius: 8,
                  borderBottomLeftRadius: 8,
                }}
              >
                <div className="spread small">
                  <span className={t.person === 'tanzim' ? 'c-t' : 'c-a'} style={{ fontWeight: 800 }}>
                    {mine ? 'You' : NAMES[t.person]}
                  </span>
                  <span className="faint">{timeAgo(t.created_at)}</span>
                </div>
                <p style={{ marginTop: 6, fontSize: 17, whiteSpace: 'pre-wrap' }}>{t.body}</p>
                <div className="row" style={{ marginTop: 10 }}>
                  {mine ? (
                    <>
                      {t.reaction ? (
                        <span className="pill">
                          {NAMES[other(me)]} reacted {t.reaction}
                        </span>
                      ) : (
                        <span className="faint small">{t.seen_at ? 'Seen' : 'Not seen yet'}</span>
                      )}
                      <span className="grow" />
                      <button className="faint small" onClick={() => confirm('Delete this thought?') && remove('thoughts', t.id).then(thoughts.reload)}>
                        Delete
                      </button>
                    </>
                  ) : (
                    <div className="row" style={{ gap: 4 }}>
                      {REACTIONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => react(t, r)}
                          style={{
                            fontSize: 18,
                            width: 36,
                            height: 32,
                            borderRadius: 10,
                            background: t.reaction === r ? 'var(--card-hi)' : 'transparent',
                            opacity: t.reaction && t.reaction !== r ? 0.35 : 1,
                            transform: t.reaction === r ? 'scale(1.1)' : 'none',
                            transition: 'all .2s',
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
