// Finds a movie poster on Wikipedia (no API key needed): the lead image of the film's article.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const title = (q.get('title') || '').trim()
  const year = (q.get('year') || '').trim()
  if (!title) return Response.json({ error: 'missing title' }, { status: 400 })
  const search = `${title} ${year} film`.replace(/\s+/g, ' ')
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=500&gsrsearch=' +
    encodeURIComponent(search)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'underpantmaru/1.0' }, next: { revalidate: 86400 } })
    if (!res.ok) return Response.json({})
    const j = (await res.json()) as { query?: { pages?: Record<string, { title: string; thumbnail?: { source: string } }> } }
    const page = Object.values(j.query?.pages ?? {})[0]
    return Response.json({ poster: page?.thumbnail?.source ?? null, page: page?.title ?? null })
  } catch {
    return Response.json({})
  }
}
