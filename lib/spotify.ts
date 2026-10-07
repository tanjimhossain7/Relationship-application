'use client'

// Optional "Connect Spotify" (now playing / recently played). Uses the PKCE flow,
// so only a client ID is needed and tokens stay on this phone. Nothing is ever
// shared automatically: a song is only posted when you tap share.

export const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || ''
export const spotifyEnabled = !!SPOTIFY_CLIENT_ID

const SCOPES = 'user-read-currently-playing user-read-recently-played'
const TOKEN_KEY = 'us:spotify:token'
const VERIFIER_KEY = 'us:spotify:verifier'

type Token = { access_token: string; refresh_token?: string; expires_at: number }

const redirectUri = () => `${window.location.origin}/music/callback`

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  arr.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function connectSpotify() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)))
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  localStorage.setItem(VERIFIER_KEY, verifier)
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  })
  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

async function tokenRequest(body: Record<string, string>): Promise<Token> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, ...body }),
  })
  if (!res.ok) throw new Error('Spotify said no')
  const j = await res.json()
  const prev = readToken()
  const t: Token = {
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? prev?.refresh_token,
    expires_at: Date.now() + (j.expires_in - 60) * 1000,
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t))
  return t
}

export async function finishSpotifyLogin(code: string) {
  const verifier = localStorage.getItem(VERIFIER_KEY) || ''
  await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), code_verifier: verifier })
  localStorage.removeItem(VERIFIER_KEY)
}

function readToken(): Token | null {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null')
  } catch {
    return null
  }
}

export const spotifyConnected = () => typeof window !== 'undefined' && !!readToken()

export function disconnectSpotify() {
  localStorage.removeItem(TOKEN_KEY)
}

async function accessToken(): Promise<string | null> {
  const t = readToken()
  if (!t) return null
  if (Date.now() < t.expires_at) return t.access_token
  if (!t.refresh_token) return null
  try {
    return (await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh_token })).access_token
  } catch {
    disconnectSpotify()
    return null
  }
}

export type SpotifyTrack = { url: string; title: string; artist: string; image?: string }

type ApiTrack = {
  name: string
  artists: { name: string }[]
  external_urls: { spotify: string }
  album?: { images?: { url: string }[] }
}

const toTrack = (t: ApiTrack): SpotifyTrack => ({
  url: t.external_urls.spotify,
  title: t.name,
  artist: t.artists.map((a) => a.name).join(', '),
  image: t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url,
})

export async function nowPlaying(): Promise<SpotifyTrack | null> {
  const tok = await accessToken()
  if (!tok) return null
  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${tok}` },
  })
  if (res.status !== 200) return null
  const j = await res.json()
  return j?.item?.type === 'track' ? toTrack(j.item) : null
}

export async function recentlyPlayed(): Promise<SpotifyTrack[]> {
  const tok = await accessToken()
  if (!tok) return []
  const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
    headers: { Authorization: `Bearer ${tok}` },
  })
  if (!res.ok) return []
  const j = await res.json()
  const seen = new Set<string>()
  return (j.items ?? [])
    .map((i: { track: ApiTrack }) => toTrack(i.track))
    .filter((t: SpotifyTrack) => (seen.has(t.url) ? false : (seen.add(t.url), true)))
}

// ---------- links ----------

export function parseSpotifyUrl(input: string): { type: string; id: string; url: string } | null {
  const s = input.trim()
  const m =
    s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|artist)\/([A-Za-z0-9]+)/) ||
    s.match(/spotify:(track|album|playlist|episode|artist):([A-Za-z0-9]+)/)
  if (!m) return null
  return { type: m[1], id: m[2], url: `https://open.spotify.com/${m[1]}/${m[2]}` }
}

/** Tries the Spotify app first, falls back to the web player. */
export function openInSpotify(url: string) {
  const p = parseSpotifyUrl(url)
  if (!p) {
    window.open(url, '_blank')
    return
  }
  const started = Date.now()
  window.location.href = `spotify:${p.type}:${p.id}`
  setTimeout(() => {
    if (document.visibilityState === 'visible' && Date.now() - started < 2500) window.open(p.url, '_blank')
  }, 1500)
}

export const SONG_PROMPTS = [
  'a song that sounds like our first date',
  'the song stuck in your head right now',
  'a song you want to hear in the car together',
  'a song that reminds you of me',
  'a song for a rainy day in',
  'the most unhinged song in your library',
  'a song you would slow dance to in the kitchen',
  'a song from when we first started talking',
  'a song that would play in the movie about us',
  'a song that is pure main character energy',
  'a song you think I have never heard',
  'a song that fixes a bad day',
  'a song for a late night drive',
  'a guilty pleasure you would never admit to anyone else',
]

export function promptOfTheDay(date = new Date()) {
  const n = Math.floor(date.getTime() / 86400000)
  return SONG_PROMPTS[n % SONG_PROMPTS.length]
}
