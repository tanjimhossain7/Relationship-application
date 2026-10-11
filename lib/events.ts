import { daysBetween, nextYearly, parseYmd, today } from './dates'
import { STARTED_DATING } from './people'

export type EventRow = {
  id: string
  title: string
  date: string
  end_date: string | null
  type: string
  notes: string | null
  yearly: boolean
  image_path: string | null
  created_by: string | null
}

export const EVENT_TYPES: { id: string; label: string; emoji: string }[] = [
  { id: 'date', label: 'Date', emoji: '💘' },
  { id: 'birthday', label: 'Birthday', emoji: '🎂' },
  { id: 'tournament', label: 'Tournament', emoji: '🏆' },
  { id: 'party', label: 'Party', emoji: '🎉' },
  { id: 'trip', label: 'Trip', emoji: '✈️' },
  { id: 'milestone', label: 'Milestone', emoji: '⭐' },
  { id: 'food', label: 'Food', emoji: '🍣' },
  { id: 'other', label: 'Other', emoji: '✨' },
]

export const typeEmoji = (t: string) => EVENT_TYPES.find((x) => x.id === t)?.emoji ?? '✨'

/** Built-in anniversary, never stored. */
export const ANNIVERSARY: EventRow = {
  id: 'anniversary',
  title: 'Our anniversary',
  date: STARTED_DATING,
  end_date: null,
  type: 'milestone',
  notes: 'April 22, 2024. Where it all started.',
  yearly: true,
  image_path: null,
  created_by: null,
}

export type Upcoming = EventRow & { on: string; years?: number }

export function upcoming(events: EventRow[], from = today()): Upcoming[] {
  const out: Upcoming[] = []
  for (const e of [ANNIVERSARY, ...events]) {
    if (e.yearly) {
      const on = nextYearly(e.date, from)
      out.push({ ...e, on, years: parseYmd(on).getFullYear() - parseYmd(e.date).getFullYear() })
    } else if ((e.end_date ?? e.date) >= from) {
      out.push({ ...e, on: e.date < from ? from : e.date })
    }
  }
  return out.sort((a, b) => a.on.localeCompare(b.on))
}

/** Past things from earlier years that happened around this time of year. */
export function onThisDay(events: EventRow[], from = today(), windowDays = 4): (EventRow & { yearsAgo: number })[] {
  const now = parseYmd(from)
  return events
    .filter((e) => !e.yearly && e.date < from)
    .map((e) => {
      const d = parseYmd(e.date)
      const thisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate())
      const diff = Math.abs(daysBetween(from, `${now.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`))
      return { e, diff, yearsAgo: now.getFullYear() - d.getFullYear(), ok: thisYear.getFullYear() > d.getFullYear() }
    })
    .filter((x) => x.ok && x.diff <= windowDays)
    .sort((a, b) => a.diff - b.diff)
    .map((x) => ({ ...x.e, yearsAgo: x.yearsAgo }))
}

export function pastEvents(events: EventRow[], from = today()) {
  return events.filter((e) => !e.yearly && (e.end_date ?? e.date) < from).sort((a, b) => b.date.localeCompare(a.date))
}

/** Parses bulk lines like "2024-05-10 | Title | type | notes". */
export function parseBulk(text: string): Omit<EventRow, 'id' | 'created_by' | 'image_path'>[] {
  const out: Omit<EventRow, 'id' | 'created_by' | 'image_path'>[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const parts = line.split('|').map((s) => s.trim())
    const m = parts[0].match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (!m || !parts[1]) continue
    const date = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
    const type = EVENT_TYPES.some((t) => t.id === parts[2]?.toLowerCase()) ? parts[2].toLowerCase() : 'other'
    out.push({ date, title: parts[1], type, notes: parts[3] || null, end_date: null, yearly: type === 'birthday' })
  }
  return out
}
