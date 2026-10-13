// Finds a movie poster on Wikipedia (no API key needed): the lead image of the film's article.
// Film posters are non-free images, which the page-images API hides unless asked for with
// pilicense=any.
type Pages = { query?: { pages?: Record<string, { title: string; index?: number; thumbnail?: { source: string } }> } }

async function search(q: string) {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=500&pilicense=any&gsrsearch=' +
    encodeURIComponent(q)
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Underpantmaru/1.0 (https://github.com/tanjimhossain7/relationship-application)' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null
  const j = (await res.json()) as Pages
  // Best match first, and only pages that actually have an image.
  return Object.values(j.query?.pages ?? {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .find((p) => p.thumbnail)
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const title = (q.get('title') || '').trim()
  const year = (q.get('year') || '').trim()
  if (!title) return Response.json({ error: 'missing title' }, { status: 400 })
  try {
    // Prefer articles with a film infobox, then fall back to a plain search.
    const page =
      (await search(`${title} ${year} hastemplate:"Infobox film"`.replace(/\s+/g, ' '))) ??
      (await search(`${title} ${year} film`.replace(/\s+/g, ' ')))
    return Response.json({ poster: page?.thumbnail?.source ?? null, page: page?.title ?? null })
  } catch {
    return Response.json({})
  }
}
