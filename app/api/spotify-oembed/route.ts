// Looks up a Spotify link's title and cover art (no Spotify account needed).
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url') || ''
  if (!/^https:\/\/open\.spotify\.com\//.test(url)) return Response.json({ error: 'not a spotify link' }, { status: 400 })
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, { next: { revalidate: 86400 } })
    if (!res.ok) return Response.json({}, { status: 200 })
    const j = await res.json()
    return Response.json({ title: j.title as string, image: j.thumbnail_url as string })
  } catch {
    return Response.json({}, { status: 200 })
  }
}
