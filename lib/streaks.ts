import type { Slot } from './library'

export type Milestone = { title: string; sub: string; slot: Slot }

/** Only pops when a streak lands exactly on one of these. */
export function milestoneFor(days: number): Milestone | null {
  switch (days) {
    case 7:
      return { title: "That's a Badtzmaru streak", sub: '7 days in a row', slot: 'badtzmaru' }
    case 10:
      return { title: "That's an underpant streak", sub: '10 days in a row', slot: 'underpant' }
    case 15:
      return { title: "That's a petticoat streak", sub: '15 days in a row', slot: 'petticoat' }
    case 20:
      return { title: "That's a stupid ass people's streak", sub: '20 days in a row', slot: 'stupid' }
    case 25:
      return { title: "That's a Bambarbola Dagmagdola streak", sub: '25 days in a row', slot: 'bambarbola' }
  }
  if (days > 0 && days % 30 === 0) {
    const m = days / 30
    return {
      title: m === 1 ? "That's a 1 month streak" : `That's a ${m} month streak`,
      sub: 'Take a walk to Peace Bridge!',
      slot: 'peace_bridge',
    }
  }
  return null
}

export type StreakRow = { id?: string; person: string; current: number; best: number; last_day: string | null }
