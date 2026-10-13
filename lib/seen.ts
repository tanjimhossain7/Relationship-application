'use client'

import { useEffect } from 'react'

// "N new" badges on the home tiles. Each phone remembers when it last opened a
// section; anything the other person added after that counts as new.

export type Section = 'music' | 'photobooth' | 'thoughts' | 'moments' | 'games' | 'eats' | 'movies'

const key = (s: Section) => `us:seen:${s}`

/** When this phone last opened a section. The first time, that's now (no flood of old stuff). */
export function lastSeen(s: Section): string {
  try {
    const v = localStorage.getItem(key(s))
    if (v) return v
    const now = new Date().toISOString()
    localStorage.setItem(key(s), now)
    return now
  } catch {
    return new Date().toISOString()
  }
}

export function markSeen(s: Section) {
  try {
    localStorage.setItem(key(s), new Date().toISOString())
  } catch {}
}

/** Call at the top of a section page so its badge clears. */
export function useMarkSeen(s: Section) {
  useEffect(() => {
    markSeen(s)
    return () => markSeen(s)
  }, [s])
}

/** Rows the other person created after this phone last opened the section. */
export function countNew<T extends { created_at?: string }>(s: Section, rows: T[], byThem: (r: T) => boolean): number {
  const since = Date.parse(lastSeen(s))
  return rows.filter((r) => byThem(r) && Date.parse(r.created_at ?? '') > since).length
}
