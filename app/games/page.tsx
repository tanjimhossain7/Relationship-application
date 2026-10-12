'use client'

import { useEffect, useState } from 'react'
import { remove, upsert } from '@/lib/db'
import { pretty, relative, today } from '@/lib/dates'
import { GAMES, board, detectGame, gameById, type Game, type GameId, type Score } from '@/lib/games'
import { useMe, useRows } from '@/lib/hooks'
import { NAMES, other, type Person } from '@/lib/people'
import { Empty, Field, Sheet, useToast } from '@/components/ui'
import { useMarkSeen } from '@/lib/seen'

export default function GamesPage() {
  useMarkSeen('games')
  const { me } = useMe()
  const scores = useRows<Score>('game_scores', { order: { column: 'played_on', ascending: false } })
  const [sel, setSel] = useState<GameId | 'all'>('all')
  const [logging, setLogging] = useState<GameId | null | 'pick'>(null)

  const game = sel === 'all' ? undefined : gameById(sel)
  const b = board(scores.rows, game)
  const todayMine = new Set(scores.rows.filter((s) => s.person === me && s.played_on === today()).map((s) => s.game))
  const leader = b.wins.tanzim === b.wins.azrina ? null : b.wins.tanzim > b.wins.azrina ? 'tanzim' : 'azrina'
  const total = b.wins.tanzim + b.wins.azrina

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Games</h1>
          <p className="sub">Only days you both played count. No penalty for skipping.</p>
        </div>
      </header>

      <div className="card glow">
        <p className="tiny faint">{game ? `${game.emoji} ${game.name}` : 'All games'} · head to head</p>
        <div className="spread" style={{ marginTop: 10 }}>
          <Side p="tanzim" wins={b.wins.tanzim} lead={leader === 'tanzim'} me={me} />
          <div className="center faint small">
            {b.ties ? `${b.ties} tie${b.ties === 1 ? '' : 's'}` : 'vs'}
          </div>
          <Side p="azrina" wins={b.wins.azrina} lead={leader === 'azrina'} me={me} right />
        </div>
        <div className="bar" style={{ marginTop: 14 }}>
          <i style={{ width: total ? `${(b.wins.tanzim / total) * 100}%` : '50%', background: 'var(--tanzim)' }} />
          <i style={{ width: total ? `${(b.wins.azrina / total) * 100}%` : '50%', background: 'var(--azrina)' }} />
        </div>
        <p className="small muted center" style={{ marginTop: 10 }}>
          {leader ? `${leader === me ? 'You are' : `${NAMES[leader]} is`} up by ${Math.abs(b.wins.tanzim - b.wins.azrina)}` : total ? 'Dead even' : 'No head-to-heads yet'}
        </p>
      </div>

      <div className="chips">
        <button className={`chip ${sel === 'all' ? 'on' : ''}`} onClick={() => setSel('all')}>
          All
        </button>
        {GAMES.map((g) => (
          <button key={g.id} className={`chip ${sel === g.id ? 'on' : ''}`} onClick={() => setSel(g.id)}>
            {g.emoji} {g.name}
          </button>
        ))}
      </div>

      {sel === 'all' ? (
        <>
          <p className="section-label">Today</p>
          <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            {GAMES.map((g) => (
              <button key={g.id} className="tile pressable" style={{ minHeight: 86, padding: 12, alignItems: 'center', textAlign: 'center', opacity: todayMine.has(g.id) ? 0.55 : 1 }} onClick={() => setLogging(g.id)}>
                <span style={{ fontSize: 24 }}>{g.emoji}</span>
                <span className="small" style={{ fontWeight: 600 }}>
                  {g.name}
                </span>
                <span className="faint" style={{ fontSize: 11 }}>
                  {todayMine.has(g.id) ? 'logged ✓' : 'log it'}
                </span>
              </button>
            ))}
          </div>

          <p className="section-label">By game</p>
          <div className="card" style={{ padding: '10px 12px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th className="num c-t">T</th>
                  <th className="num c-a">A</th>
                </tr>
              </thead>
              <tbody>
                {GAMES.map((g) => {
                  const gb = board(scores.rows, g)
                  return (
                    <tr key={g.id} onClick={() => setSel(g.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        {g.emoji} {g.name}
                      </td>
                      <td className="num">{gb.wins.tanzim}</td>
                      <td className="num">{gb.wins.azrina}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        game && (
          <>
            <div className="row">
              <Stat label={`${NAMES.tanzim}'s avg`} value={b.avg.tanzim} unit={game.unit} cls="c-t" />
              <Stat label={`${NAMES.azrina}'s avg`} value={b.avg.azrina} unit={game.unit} cls="c-a" />
            </div>
            <button className="btn ghost block" onClick={() => setLogging(game.id)}>
              {todayMine.has(game.id) ? 'Edit today’s score' : `Log today’s ${game.name}`}
            </button>
            <p className="section-label">Recent</p>
            {b.days.length === 0 ? (
              <Empty emoji={game.emoji} title="No scores yet" />
            ) : (
              <div className="card" style={{ padding: '10px 12px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th className="num c-t">T</th>
                      <th className="num c-a">A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.days.slice(0, 40).map((d) => (
                      <tr key={d.date}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{relative(d.date).replace(/^in /, '')}</div>
                          <div className="faint small">{pretty(d.date, { month: 'short', day: 'numeric' })}</div>
                        </td>
                        <td className="num">
                          <ScoreCell s={d.tanzim} win={d.winner === 'tanzim'} canDelete={me === 'tanzim'} onDelete={scores.reload} />
                        </td>
                        <td className="num">
                          <ScoreCell s={d.azrina} win={d.winner === 'azrina'} canDelete={me === 'azrina'} onDelete={scores.reload} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}

      <button className="fab" onClick={() => setLogging(game?.id ?? 'pick')} aria-label="Log a score">
        +
      </button>

      <LogSheet
        open={logging !== null}
        initial={logging === 'pick' ? null : logging}
        existing={scores.rows.filter((s) => s.person === me && s.played_on === today())}
        onClose={() => setLogging(null)}
        onSaved={scores.reload}
        theirs={scores.rows.filter((s) => s.person === other(me) && s.played_on === today())}
      />
    </main>
  )
}

function Side({ p, wins, lead, me, right }: { p: Person; wins: number; lead: boolean; me: Person; right?: boolean }) {
  return (
    <div style={{ textAlign: right ? 'right' : 'left' }}>
      <div className="score-big" style={{ color: `var(--${p})` }}>
        {wins}
      </div>
      <div className="small" style={{ fontWeight: 600, marginTop: 4 }}>
        {lead && '👑 '}
        {p === me ? 'You' : NAMES[p]}
      </div>
    </div>
  )
}

function Stat({ label, value, unit, cls }: { label: string; value: number | null; unit: string; cls: string }) {
  return (
    <div className="card grow center">
      <div className={`display ${cls}`} style={{ fontSize: 28 }}>
        {value ?? '–'}
      </div>
      <div className="small muted">{label}</div>
      <div className="faint" style={{ fontSize: 11 }}>
        {unit}
      </div>
    </div>
  )
}

function fmt(s: Score) {
  return s.failed ? 'X' : String(Number(s.score))
}

function ScoreCell({ s, win, canDelete, onDelete }: { s?: Score; win: boolean; canDelete: boolean; onDelete: () => void }) {
  if (!s) return <span className="faint">·</span>
  return (
    <button
      onClick={() => canDelete && confirm('Delete this score?') && remove('game_scores', s.id).then(onDelete)}
      style={{ fontWeight: 600, color: win ? 'var(--accent)' : undefined }}
    >
      {fmt(s)}
      {win ? ' 👑' : ''}
    </button>
  )
}

function LogSheet({
  open,
  initial,
  existing,
  theirs,
  onClose,
  onSaved,
}: {
  open: boolean
  initial: GameId | null
  existing: Score[]
  theirs: Score[]
  onClose: () => void
  onSaved: () => void
}) {
  const { me } = useMe()
  const toast = useToast()
  const [gameId, setGameId] = useState<GameId>('wordle')
  const [text, setText] = useState('')
  const [score, setScore] = useState<number | ''>('')
  const [failed, setFailed] = useState(false)
  const [date, setDate] = useState(today())
  const [busy, setBusy] = useState(false)
  const game = gameById(gameId) as Game

  useEffect(() => {
    if (!open) return
    const g = initial ?? GAMES.find((x) => !existing.some((e) => e.game === x.id))?.id ?? 'wordle'
    setGameId(g)
    setDate(today())
    const ex = existing.find((e) => e.game === g)
    setText(ex?.raw ?? '')
    setScore(ex ? Number(ex.score) : '')
    setFailed(ex?.failed ?? false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  function onText(t: string) {
    setText(t)
    const detected = detectGame(t)
    const g = detected ? (gameById(detected) as Game) : game
    if (detected && detected !== gameId) setGameId(detected)
    const p = g.parse(t)
    if (p) {
      setScore(p.score)
      setFailed(p.failed)
    }
  }

  async function save() {
    if (score === '') return
    setBusy(true)
    try {
      await upsert(
        'game_scores',
        { person: me, game: gameId, played_on: date, score: failed ? game.failScore : score, failed, raw: text.trim() || null },
        'person,game,played_on',
      )
      const t = theirs.find((s) => s.game === gameId)
      if (t && date === today()) {
        const mine = failed ? game.failScore : Number(score)
        const their = Number(t.score)
        const win = game.better === 'lower' ? mine < their : mine > their
        toast(mine === their ? '🤝' : win ? '👑' : '🫠', mine === their ? 'Tie with ' + NAMES[other(me)] : win ? `You beat ${NAMES[other(me)]} today` : `${NAMES[other(me)]} got you today`)
      } else toast(game.emoji, 'Logged')
      onSaved()
      onClose()
    } catch (e) {
      toast('😵', e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Log a score">
      <div className="stack">
        <div className="chips">
          {GAMES.map((g) => (
            <button
              key={g.id}
              className={`chip ${gameId === g.id ? 'on' : ''}`}
              onClick={() => {
                setGameId(g.id)
                const ex = existing.find((e) => e.game === g.id)
                setText(ex?.raw ?? '')
                setScore(ex ? Number(ex.score) : '')
                setFailed(ex?.failed ?? false)
              }}
            >
              {g.emoji} {g.name}
            </button>
          ))}
        </div>
        <Field label="Paste your share text">
          <textarea className="input" rows={4} value={text} onChange={(e) => onText(e.target.value)} placeholder={game.hint} style={{ fontSize: 14 }} />
        </Field>
        <div className="row">
          <div className="grow">
            <Field label={`Or type it (${game.unit}, ${game.better} wins)`}>
              <div className="row">
                <button className="icon-btn" onClick={() => setScore((s) => Math.max(0, Number(s || 0) - 1))}>
                  −
                </button>
                <input
                  className="input center"
                  inputMode="decimal"
                  value={failed ? 'X' : score}
                  onChange={(e) => {
                    setFailed(false)
                    const v = e.target.value
                    setScore(v === '' ? '' : Number(v) || 0)
                  }}
                  style={{ fontSize: 22, fontWeight: 600 }}
                />
                <button className="icon-btn" onClick={() => (setFailed(false), setScore((s) => Number(s || 0) + 1))}>
                  +
                </button>
              </div>
            </Field>
          </div>
        </div>
        <label className="row card tight" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={failed} onChange={(e) => (setFailed(e.target.checked), e.target.checked && setScore(game.failScore))} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
          <span className="grow">Didn’t get it today</span>
        </label>
        <Field label="Day">
          <input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <button className="btn block" onClick={save} disabled={busy || score === ''}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Sheet>
  )
}
