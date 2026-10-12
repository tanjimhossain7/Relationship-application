import type { Person } from './people'

export type Visit = {
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

export type Place = {
  key: string
  name: string
  visits: Visit[]
  t: number | null
  a: number | null
  avg: number | null
  last: string
  cuisine: string | null
}

export const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null && x !== undefined).map(Number)
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
}

/** Groups visits by place. */
export function groupPlaces(visits: Visit[]): Place[] {
  const m = new Map<string, Visit[]>()
  for (const v of visits) {
    const k = v.name.trim().toLowerCase()
    m.set(k, [...(m.get(k) ?? []), v])
  }
  return [...m.entries()].map(([key, vs]) => ({
    key,
    name: vs[0].name,
    visits: vs,
    t: avg(vs.map((v) => v.tanzim_rating)),
    a: avg(vs.map((v) => v.azrina_rating)),
    avg: avg([...vs.map((v) => v.tanzim_rating), ...vs.map((v) => v.azrina_rating)]),
    last: vs.map((v) => v.visited_on).sort().reverse()[0],
    cuisine: vs.find((v) => v.cuisine)?.cuisine ?? null,
  }))
}

/**
 * Favorites first: highest average, then the one you keep going back to, then
 * the most recent. Places nobody has rated yet sink to the bottom.
 */
export function byFavorite(a: Place, b: Place) {
  return (b.avg ?? -1) - (a.avg ?? -1) || b.visits.length - a.visits.length || b.last.localeCompare(a.last)
}

export const visitAvg = (v: Visit) => avg([v.tanzim_rating, v.azrina_rating])
