'use client'

import { useEffect, useState } from 'react'
import { insert, remove, update } from '@/lib/db'
import { timeAgo } from '@/lib/dates'
import { useMe, useRows } from '@/lib/hooks'
import { NAMES, other, type Person } from '@/lib/people'
import {
  connectSpotify,
  disconnectSpotify,
  nowPlaying,
  openInSpotify,
  parseSpotifyUrl,
  recentlyPlayed,
  spotifyConnected,
  spotifyEnabled,
  type SpotifyTrack,
} from '@/lib/spotify'
import { Empty, Field, Sheet, useToast } from '@/components/ui'
import Icon from '@/components/Icon'
import { useMarkSeen } from '@/lib/seen'

type Song = {
  id: string
  kind: 'sent' | 'lately'
  from_person: Person
  to_person: Person | null
  spotify_url: string
  title: string | null
  artist: string | null
  image_url: string | null
  note: string | null
  prompt: string | null
  seen_at: string | null
  created_at: string
}

type Tab = 'forYou' | 'sent' | 'lately'

export default function MusicPage() {
  const { me } = useMe()
  const them = other(me)
  const songs = useRows<Song>('songs', { order: { column: 'created_at', ascending: false } })
  const [tab, setTab] = useState<Tab>('forYou')
  const [sheet, setSheet] = useState<null | { kind: 'sent' | 'lately' }>(null)
  useMarkSeen('music')

  const forYou = songs.rows.filter((s) => s.kind === 'sent' && s.to_person === me)
  const sent = songs.rows.filter((s) => s.kind === 'sent' && s.from_person === me)
  const lately = songs.rows.filter((s) => s.kind === 'lately')
  const shown = tab === 'forYou' ? forYou : tab === 'sent' ? sent : lately

  useEffect(() => {
    if (tab !== 'forYou') return
    const unseen = forYou.filter((s) => !s.seen_at)
    if (!unseen.length) return
    const t = setTimeout(() => {
      Promise.all(unseen.map((s) => update('songs', s.id, { seen_at: new Date().toISOString() }))).catch(() => {})
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, songs.rows])

  return (
    <main className="page">
      <header className="page-head">
        <h1>Music</h1>
        <button className="btn small" onClick={() => setSheet({ kind: 'sent' })}>
          <Icon name="send" size={16} /> Send {NAMES[them]} a song
        </button>
      </header>

      <Showcase songs={songs.rows} me={me} onFill={(id, patch) => songs.setRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))} />

      <div className="seg">
        <button className={tab === 'forYou' ? 'on' : ''} onClick={() => setTab('forYou')}>
          For you{forYou.some((s) => !s.seen_at) ? ' •' : ''}
        </button>
        <button className={tab === 'sent' ? 'on' : ''} onClick={() => setTab('sent')}>
          Sent
        </button>
        <button className={tab === 'lately' ? 'on' : ''} onClick={() => setTab('lately')}>
          Lately
        </button>
      </div>

      {tab === 'lately' && (
        <button className="card row pressable" onClick={() => setSheet({ kind: 'lately' })} style={{ textAlign: 'left' }}>
          <span className="icon-chip">
            <Icon name="plus" size={20} />
          </span>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Share what you&apos;re into lately</div>
            <div className="small muted">Only what you choose. Nothing is shared automatically.</div>
          </div>
        </button>
      )}

      {songs.loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : shown.length === 0 ? (
        <Empty
          emoji={tab === 'lately' ? '🎧' : '🎵'}
          title={tab === 'forYou' ? `Nothing from ${NAMES[them]} yet` : tab === 'sent' ? 'You haven’t sent anything yet' : 'No one has shared yet'}
          sub={tab === 'forYou' ? 'Send one first and guilt trip them' : undefined}
        />
      ) : (
        <div className="stack">
          {shown.map((s) => (
            <SongCard key={s.id} song={s} me={me} onDelete={() => remove('songs', s.id).then(songs.reload)} />
          ))}
        </div>
      )}

      {spotifyEnabled && <SpotifyConnectCard />}

      <SongSheet
        open={!!sheet}
        kind={sheet?.kind ?? 'sent'}
        onClose={() => setSheet(null)}
        onSaved={() => {
          songs.reload()
          if (sheet?.kind === 'lately') setTab('lately')
          else setTab('sent')
        }}
      />
    </main>
  )
}

/** The first thing on the Music page: big cover art and a playable Spotify preview. */
function Showcase({ songs, me, onFill }: { songs: Song[]; me: Person; onFill: (id: string, patch: Partial<Song>) => void }) {
  const ordered = [...songs].sort((a, b) => Number(isNewFor(b, me)) - Number(isNewFor(a, me)) || b.created_at.localeCompare(a.created_at)).slice(0, 12)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const cur = ordered.find((s) => s.id === pickedId) ?? ordered[0]
  const parsed = cur ? parseSpotifyUrl(cur.spotify_url) : null

  // Songs added without cover art (bulk adds, failed lookups) get it filled in once.
  useEffect(() => {
    const missing = ordered.filter((s) => !s.image_url && parseSpotifyUrl(s.spotify_url))
    for (const s of missing.slice(0, 6)) {
      fetch(`/api/spotify-oembed?url=${encodeURIComponent(parseSpotifyUrl(s.spotify_url)!.url)}`)
        .then((r) => r.json())
        .then((j: { title?: string; image?: string }) => {
          if (!j.image) return
          const patch = { image_url: j.image, title: s.title ?? j.title ?? null }
          onFill(s.id, patch)
          update('songs', s.id, patch).catch(() => {})
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered.map((s) => s.id + (s.image_url ? '1' : '0')).join()])

  if (!cur) return null
  return (
    <section className="showcase">
      {cur.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="showcase-bg" src={cur.image_url} alt="" />
      )}
      <div className="showcase-body">
        <div className="row" style={{ alignItems: 'flex-end', gap: 14 }}>
          {cur.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cur.image_url} alt="" className="cover-xl" />
          ) : (
            <div className="cover-xl cover-empty">
              <Icon name="music" size={34} />
            </div>
          )}
          <div className="grow" style={{ paddingBottom: 4 }}>
            <p className="eyebrow">
              {isNewFor(cur, me) ? 'New from ' + NAMES[cur.from_person] : cur.kind === 'lately' ? `${cur.from_person === me ? 'You are' : NAMES[cur.from_person] + ' is'} into` : cur.from_person === me ? `You sent ${NAMES[other(me)]}` : `From ${NAMES[cur.from_person]}`}
            </p>
            <h2 className="clamp" style={{ marginTop: 4 }}>{cur.title || 'A song'}</h2>
            {cur.artist && <p className="small muted ellipsis">{cur.artist}</p>}
            {cur.note && <p className="small" style={{ marginTop: 6, opacity: 0.85 }}>“{cur.note}”</p>}
          </div>
        </div>
        {parsed && (
          <iframe
            key={parsed.id}
            src={`https://open.spotify.com/embed/${parsed.type}/${parsed.id}?theme=0`}
            width="100%"
            height="80"
            style={{ border: 0, borderRadius: 12, marginTop: 14, display: 'block' }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        )}
        {ordered.length > 1 && (
          <div className="cover-strip">
            {ordered.map((s) => (
              <button key={s.id} onClick={() => setPickedId(s.id)} className={`cover-sm ${s.id === cur.id ? 'on' : ''}`} aria-label={s.title ?? 'Song'}>
                {s.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image_url} alt="" />
                ) : (
                  <Icon name="music" size={18} />
                )}
                {isNewFor(s, me) && <i className="dot" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

const isNewFor = (s: Song, me: Person) => s.kind === 'sent' && s.to_person === me && !s.seen_at

function SongCard({ song, me, onDelete }: { song: Song; me: Person; onDelete: () => void }) {
  const [preview, setPreview] = useState(false)
  const parsed = parseSpotifyUrl(song.spotify_url)
  const fromMe = song.from_person === me
  return (
    <div className={`card ${!song.seen_at && song.to_person === me ? 'new' : ''}`}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        {song.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.image_url} alt="" className="thumb" style={{ width: 64, height: 64 }} />
        ) : (
          <div className="thumb" style={{ width: 64, height: 64, display: 'grid', placeItems: 'center', fontSize: 26 }}>
            🎵
          </div>
        )}
        <div className="grow">
          <div className="row small" style={{ gap: 6 }}>
            <span className={song.from_person === 'tanzim' ? 'dot-t' : 'dot-a'} />
            <span className="muted">
              {fromMe ? 'You' : NAMES[song.from_person]} · {timeAgo(song.created_at)}
            </span>
          </div>
          <div style={{ fontWeight: 600, fontSize: 17, marginTop: 2 }}>{song.title || 'A song'}</div>
          {song.artist && <div className="small muted">{song.artist}</div>}
        </div>
      </div>
      {song.note && <p style={{ marginTop: 8 }}>{song.note}</p>}
      {preview && parsed && (
        <iframe
          src={`https://open.spotify.com/embed/${parsed.type}/${parsed.id}?theme=0`}
          width="100%"
          height="80"
          style={{ border: 0, borderRadius: 12, marginTop: 12 }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn small" onClick={() => openInSpotify(song.spotify_url)}>
          Open in Spotify
        </button>
        {parsed && (
          <button className="btn small ghost" onClick={() => setPreview((p) => !p)}>
            {preview ? 'Hide' : 'Preview'}
          </button>
        )}
        <span className="grow" />
        {fromMe && (
          <button className="faint small" onClick={() => confirm('Delete this song?') && onDelete()}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

function SongSheet({ open, kind, onClose, onSaved }: { open: boolean; kind: 'sent' | 'lately'; onClose: () => void; onSaved: () => void }) {
  const { me } = useMe()
  const toast = useToast()
  const [link, setLink] = useState('')
  const [meta, setMeta] = useState<{ title?: string; artist?: string; image?: string }>({})
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [recent, setRecent] = useState<SpotifyTrack[] | null>(null)
  const connected = spotifyEnabled && spotifyConnected()

  useEffect(() => {
    if (!open) return
    setLink('')
    setMeta({})
    setNote('')
    setRecent(null)
  }, [open])

  const parsed = parseSpotifyUrl(link)

  useEffect(() => {
    if (!parsed || meta.title) return
    let live = true
    fetch(`/api/spotify-oembed?url=${encodeURIComponent(parsed.url)}`)
      .then((r) => r.json())
      .then((j) => live && setMeta((m) => ({ ...m, title: j.title, image: j.image })))
      .catch(() => {})
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed?.url])

  function pickTrack(t: SpotifyTrack) {
    setLink(t.url)
    setMeta({ title: t.title, artist: t.artist, image: t.image })
  }

  async function paste() {
    try {
      const t = await navigator.clipboard.readText()
      setMeta({})
      setLink(t)
    } catch {
      toast('📋', 'Long-press the box and paste instead')
    }
  }

  async function save() {
    if (!parsed) return
    setBusy(true)
    try {
      await insert('songs', {
        kind,
        from_person: me,
        to_person: kind === 'sent' ? other(me) : null,
        spotify_url: parsed.url,
        title: meta.title ?? null,
        artist: meta.artist ?? null,
        image_url: meta.image ?? null,
        note: note.trim() || null,
      })
      toast('🎶', kind === 'sent' ? `Sent to ${NAMES[other(me)]}` : 'Shared')
      onSaved()
      onClose()
    } catch (e) {
      toast('😵', e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={kind === 'sent' ? `Send ${NAMES[other(me)]} a song` : 'Into this lately'}>
      <div className="stack">
        {connected && (
          <div className="row wrap">
            <button
              className="btn small ghost"
              onClick={async () => {
                const t = await nowPlaying()
                if (t) pickTrack(t)
                else toast('🔇', 'Nothing playing right now')
              }}
            >
              ▶ Now playing
            </button>
            <button className="btn small ghost" onClick={async () => setRecent(await recentlyPlayed())}>
              🕘 Recently played
            </button>
          </div>
        )}
        {recent && (
          <div className="stack-sm" style={{ maxHeight: 240, overflowY: 'auto' }}>
            {recent.length === 0 && <p className="muted small">Nothing recent</p>}
            {recent.map((t) => (
              <button key={t.url} className="card tight row pressable" style={{ textAlign: 'left' }} onClick={() => (pickTrack(t), setRecent(null))}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {t.image && <img src={t.image} alt="" className="thumb" style={{ width: 40, height: 40 }} />}
                <div className="grow">
                  <div className="ellipsis" style={{ fontWeight: 700 }}>
                    {t.title}
                  </div>
                  <div className="ellipsis small muted">{t.artist}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <Field label="Spotify link">
          <div className="row">
            <input
              className="input"
              value={link}
              onChange={(e) => {
                setMeta({})
                setLink(e.target.value)
              }}
              placeholder="https://open.spotify.com/track/…"
              inputMode="url"
            />
            <button className="btn small ghost" onClick={paste} type="button">
              Paste
            </button>
          </div>
        </Field>
        {!connected && <p className="small faint" style={{ marginTop: -6 }}>In Spotify: ••• → Share → Copy Song Link</p>}

        {parsed && (
          <div className="card tight row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {meta.image ? <img src={meta.image} alt="" className="thumb" /> : <div className="thumb" />}
            <div className="grow">
              <div style={{ fontWeight: 600 }} className="ellipsis">
                {meta.title ?? 'Spotify ' + parsed.type}
              </div>
              {meta.artist && <div className="small muted ellipsis">{meta.artist}</div>}
            </div>
            <span>✓</span>
          </div>
        )}
        {link && !parsed && <p className="small" style={{ color: 'var(--danger)' }}>That doesn&apos;t look like a Spotify link</p>}

        <Field label={kind === 'sent' ? 'Note (optional)' : 'Why (optional)'}>
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'sent' ? 'listen to this one at 0:42' : 'on repeat because…'} />
        </Field>
        <button className="btn block" disabled={!parsed || busy} onClick={save}>
          {busy ? 'Sending…' : kind === 'sent' ? 'Send' : 'Share'}
        </button>
      </div>
    </Sheet>
  )
}

function SpotifyConnectCard() {
  const [connected, setConnected] = useState(false)
  useEffect(() => setConnected(spotifyConnected()), [])
  return (
    <div className="card tight row">
      <div className="grow">
        <div style={{ fontWeight: 600 }}>{connected ? 'Spotify connected' : 'Connect Spotify (optional)'}</div>
        <div className="small muted">{connected ? 'Only used when you tap Now playing or Recently played.' : 'Lets you share what you’re playing in one tap.'}</div>
      </div>
      {connected ? (
        <button
          className="btn small ghost"
          onClick={() => {
            disconnectSpotify()
            setConnected(false)
          }}
        >
          Disconnect
        </button>
      ) : (
        <button className="btn small" onClick={connectSpotify}>
          Connect
        </button>
      )}
    </div>
  )
}
