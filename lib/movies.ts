'use client'

export type Movie = {
  id: string
  title: string
  year: number | null
  watched_on: string | null
  poster_url: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

export async function findPoster(title: string, year?: number | null): Promise<string | null> {
  try {
    const r = await fetch(`/api/poster?title=${encodeURIComponent(title)}&year=${year ?? ''}`)
    const j = (await r.json()) as { poster?: string | null }
    return j.poster ?? null
  } catch {
    return null
  }
}
