import { addDays, daysBetween } from './dates'

type Visit = { id: string; name: string; visited_on: string }

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

const YESTERDAY = [
  'Didn\'t you get {prev} literally yesterday? Gluttons.',
  'Go on Ozempic right now.',
  '{prev} yesterday, {name} today. Your kitchen is filing a missing persons report.',
  'Back to back? The stove is just decor at this point.',
  'Two days, two restaurants. Your bank account just sighed.',
  'Yesterday {prev}, today {name}. Do you two even own a pan?',
]

const SAME_DAY = [
  'Two places in one day. Hobbit behaviour. Second breakfast type beat.',
  'You already ate at {prev} today. This is a food crawl, not a date.',
  'Same day double feature. Respectfully, go lie down.',
]

const SAME_PLACE = [
  '{name} again? They should put your names on a booth.',
  'Back at {name} already. Just ask them for a loyalty card and a key.',
  '{name}, again. The staff have started a group chat about you two.',
]

const BINGE = [
  '{count} restaurants this week. Go on Ozempic right now.',
  '{count} meals out in 7 days. Uber Eats wants to sponsor you.',
  '{count} places this week. At this point just move into a food court.',
]

/** Picks a roast for a new visit, or null when the visit is innocent. */
export function roastFor(visit: Visit, all: Visit[]): string | null {
  const others = all.filter((v) => v.id !== visit.id)
  const fill = (s: string, prev?: string, count?: number) =>
    s.replaceAll('{prev}', prev ?? '').replaceAll('{name}', visit.name).replaceAll('{count}', String(count ?? ''))

  const sameDay = others.find((v) => v.visited_on === visit.visited_on)
  if (sameDay) return fill(pick(SAME_DAY), sameDay.name)

  const yesterday = others.find((v) => v.visited_on === addDays(visit.visited_on, -1))
  if (yesterday) return fill(pick(YESTERDAY), yesterday.name)

  const weekCount =
    others.filter((v) => {
      const d = daysBetween(v.visited_on, visit.visited_on)
      return d >= 0 && d < 7
    }).length + 1
  if (weekCount >= 4) return fill(pick(BINGE), undefined, weekCount)

  const samePlace = others.find(
    (v) => v.name.trim().toLowerCase() === visit.name.trim().toLowerCase() && Math.abs(daysBetween(v.visited_on, visit.visited_on)) <= 10,
  )
  if (samePlace) return fill(pick(SAME_PLACE))

  return null
}
