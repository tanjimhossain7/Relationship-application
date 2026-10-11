// Daily games. Most are "lower score wins" (fewer guesses / fewer mistakes);
// Krillion is higher wins. A day only counts toward the head-to-head when
// both of you played it, so skipping a day never costs you anything.

export type GameId = 'krillion' | 'wordle' | 'globle' | 'spotle' | 'spotle_movie' | 'connections'

export type Game = {
  id: GameId
  name: string
  emoji: string
  unit: string
  better: 'lower' | 'higher'
  max?: number
  failScore: number
  hint: string
  parse: (text: string) => { score: number; failed: boolean } | null
}

const SQUARES = /[⬜⬛🟥🟧🟨🟩🟦🟪🟫]/gu

function countSquareRows(text: string) {
  return text
    .split('\n')
    .map((l) => l.match(SQUARES) ?? [])
    .filter((m) => m.length > 0)
}

/** Generic "x/y" or "in N" or "= N" or a lone number. */
function firstNumber(text: string) {
  const m =
    text.match(/(\d+)\s*\/\s*\d+/) ||
    text.match(/=\s*(\d+)/) ||
    text.match(/\bin\s+(\d+)\b/i) ||
    text.match(/^\s*(\d+(?:\.\d+)?)\s*$/)
  return m ? Number(m[1]) : null
}

/** Spotle-style shares: one square per guess, green square means solved. */
function guessSquares(text: string, failScore: number) {
  const xy = text.match(/(\d+)\s*\/\s*\d+/)
  if (xy) return { score: Number(xy[1]), failed: false }
  const n = firstNumber(text)
  const squares: string[] = text.match(SQUARES) ?? []
  if (squares.length === 0) return n !== null ? { score: n, failed: false } : null
  const solved = squares.includes('🟩')
  return solved ? { score: squares.indexOf('🟩') + 1, failed: false } : { score: failScore, failed: true }
}

export const GAMES: Game[] = [
  {
    id: 'krillion',
    name: 'Krillion',
    emoji: '🦐',
    unit: 'points',
    better: 'higher',
    failScore: 0,
    hint: 'Paste your share text or type your score',
    parse: (t) => {
      const n = firstNumber(t)
      return n === null ? null : { score: n, failed: false }
    },
  },
  {
    id: 'wordle',
    name: 'Wordle',
    emoji: '🟩',
    unit: 'guesses',
    better: 'lower',
    max: 6,
    failScore: 7,
    hint: 'Paste "Wordle 1,234 4/6…"',
    parse: (t) => {
      const m = t.match(/Wordle[^\n]*?([1-6Xx])\s*\/\s*6/)
      if (!m) {
        const n = firstNumber(t)
        return n === null ? null : { score: n, failed: n > 6 }
      }
      return m[1].toUpperCase() === 'X' ? { score: 7, failed: true } : { score: Number(m[1]), failed: false }
    },
  },
  {
    id: 'globle',
    name: 'Globle',
    emoji: '🌎',
    unit: 'guesses',
    better: 'lower',
    failScore: 99,
    hint: 'Paste your Globle share (… = 5)',
    parse: (t) => {
      const eq = t.match(/=\s*(\d+)/)
      const n = eq ? Number(eq[1]) : firstNumber(t)
      return n === null ? null : { score: n, failed: false }
    },
  },
  {
    id: 'spotle',
    name: 'Spotle',
    emoji: '🎧',
    unit: 'guesses',
    better: 'lower',
    max: 10,
    failScore: 11,
    hint: 'Paste your Spotle share',
    parse: (t) => guessSquares(t, 11),
  },
  {
    id: 'spotle_movie',
    name: 'Spotle Movie',
    emoji: '🎬',
    unit: 'guesses',
    better: 'lower',
    max: 10,
    failScore: 11,
    hint: 'Paste your Spotle Movie share',
    parse: (t) => guessSquares(t, 11),
  },
  {
    id: 'connections',
    name: 'Connections',
    emoji: '🟪',
    unit: 'mistakes',
    better: 'lower',
    max: 4,
    failScore: 4,
    hint: 'Paste your Connections grid',
    parse: (t) => {
      const rows = countSquareRows(t).filter((r) => r.length === 4)
      if (rows.length === 0) {
        const n = firstNumber(t)
        return n === null ? null : { score: n, failed: n >= 4 }
      }
      const solved = rows.filter((r) => r.every((c) => c === r[0])).length
      const mistakes = rows.length - solved
      return { score: Math.min(4, mistakes), failed: solved < 4 }
    },
  },
]

/** Works out which game a pasted share text came from. */
export function detectGame(text: string): GameId | null {
  const t = text.toLowerCase()
  if (t.includes('krillion')) return 'krillion'
  if (t.includes('wordle')) return 'wordle'
  if (t.includes('connections')) return 'connections'
  if (t.includes('globle')) return 'globle'
  if (t.includes('spotle') && /movie|film|🎬/.test(t)) return 'spotle_movie'
  if (t.includes('spotle')) return 'spotle'
  return null
}

export const gameById = (id: string) => GAMES.find((g) => g.id === id)

export type Score = {
  id: string
  person: 'tanzim' | 'azrina'
  game: GameId
  played_on: string
  score: number
  failed: boolean
  raw?: string | null
}

export type Board = {
  wins: { tanzim: number; azrina: number }
  ties: number
  played: { tanzim: number; azrina: number }
  avg: { tanzim: number | null; azrina: number | null }
  days: { date: string; tanzim?: Score; azrina?: Score; winner: 'tanzim' | 'azrina' | 'tie' | null }[]
}

export function board(scores: Score[], game?: Game): Board {
  const filtered = game ? scores.filter((s) => s.game === game.id) : scores
  const byKey = new Map<string, { tanzim?: Score; azrina?: Score; date: string; game: GameId }>()
  for (const s of filtered) {
    const k = `${s.game}|${s.played_on}`
    const e = byKey.get(k) ?? { date: s.played_on, game: s.game }
    e[s.person] = s
    byKey.set(k, e)
  }
  const out: Board = {
    wins: { tanzim: 0, azrina: 0 },
    ties: 0,
    played: { tanzim: 0, azrina: 0 },
    avg: { tanzim: null, azrina: null },
    days: [],
  }
  const sums = { tanzim: 0, azrina: 0 }
  for (const e of byKey.values()) {
    let winner: Board['days'][number]['winner'] = null
    if (e.tanzim && e.azrina) {
      const g = gameById(e.game)!
      const t = Number(e.tanzim.score)
      const a = Number(e.azrina.score)
      if (t === a) winner = 'tie'
      else winner = (g.better === 'lower' ? t < a : t > a) ? 'tanzim' : 'azrina'
      if (winner === 'tie') out.ties++
      else out.wins[winner]++
    }
    for (const p of ['tanzim', 'azrina'] as const) {
      if (e[p]) {
        out.played[p]++
        sums[p] += Number(e[p]!.score)
      }
    }
    out.days.push({ date: e.date, tanzim: e.tanzim, azrina: e.azrina, winner })
  }
  for (const p of ['tanzim', 'azrina'] as const) {
    out.avg[p] = out.played[p] ? Math.round((sums[p] / out.played[p]) * 10) / 10 : null
  }
  out.days.sort((a, b) => b.date.localeCompare(a.date))
  return out
}
