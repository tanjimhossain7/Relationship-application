// All dates are plain local calendar days written as YYYY-MM-DD.

export function ymd(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s)
  d.setDate(d.getDate() + n)
  return ymd(d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000)
}

export const today = () => ymd()

/** Monday of the week containing the given day. */
export function weekStart(s: string = today()): string {
  const d = parseYmd(s)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return ymd(d)
}

/** Next date (today or later) this month/day happens, for yearly things. */
export function nextYearly(s: string, from: string = today()): string {
  const base = parseYmd(s)
  const f = parseYmd(from)
  let d = new Date(f.getFullYear(), base.getMonth(), base.getDate())
  if (ymd(d) < from) d = new Date(f.getFullYear() + 1, base.getMonth(), base.getDate())
  return ymd(d)
}

export function pretty(s: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return parseYmd(s).toLocaleDateString(undefined, opts)
}

export function relative(s: string, from: string = today()): string {
  const n = daysBetween(from, s)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  if (n > 0) return n < 60 ? `in ${n} days` : `in ${Math.round(n / 30)} months`
  const a = -n
  if (a < 60) return `${a} days ago`
  if (a < 730) return `${Math.round(a / 30)} months ago`
  return `${Math.round(a / 365)} years ago`
}

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
