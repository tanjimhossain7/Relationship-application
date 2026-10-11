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
  promptOfTheDay,
  recentlyPlayed,
  spotifyConnected,
  spotifyEnabled,
  type SpotifyTrack,
} from '@/lib/spotify'
import { Empty, Field, Sheet, useToast } from '@/components/ui'

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
  const [sheet, setSheet] = useState<null | { kind: 'sent' | 'lately'; prompt?: string }>(null)
  const prompt = promptOfTheDay()

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
        <div>
          <h1>Music</h1>
          <p className="sub">Songs for each other, whenever</p>
        </div>
      </header>

      <div className="card glow" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), var(--card))' }}>
        <p className="tiny" style={{ color: 'var(--accent)' }}>
          Today&apos;s prompt
        </p>
        <h2 style={{ marginTop: 6 }}>Send {NAMES[them]} {prompt}</h2>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn small" onClick={() => setSheet({ kind: 'sent', prompt })}>
            Send one
          </button>
          <button className="btn small ghost" onClick={() => setSheet({ kind: 'sent' })}>
            Just send a song
          </button>
        </div>
      </div>

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
          <span style={{ fontSize: 26 }}>🎧</span>
          <div className="grow">
            <div style={{ fontWeight: 800 }}>Share what you&apos;re into lately</div>
            <div className="small muted">Only what you choose. Nothing is shared automatically.</div>
          </div>
          <span style={{ color: 'var(--accent)' }}>+</span>
        </button>
      )}

      {songs.loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : shown.length === 0 ? (
        <Empty
          emoji={tab === 'lately' ? '🎧' : '🎵'}
          title={tab === 'forYou' ? `Nothing from ${NAMES[them]} yet` : tab === 'sent' ? 'You haven’t sent anything yet' : 'No one has shared yet'}
          sub={tab === 'forYou' ? 'Maybe send one first and guilt trip them' : undefined}
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
        prompt={sheet?.prompt}
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
          <div style={{ fontWeight: 800, fontSize: 17, marginTop: 2 }}>{song.title || 'A song'}</div>
          {song.artist && <div className="small muted">{song.artist}</div>}
        </div>
      </div>
      {song.prompt && (
        <p className="small" style={{ marginTop: 10, color: 'var(--accent)' }}>
          Prompt: {song.prompt}
        </p>
      )}
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

function SongSheet({ open, kind, prompt, onClose, onSaved }: { open: boolean; kind: 'sent' | 'lately'; prompt?: string; onClose: () => void; onSaved: () => void }) {
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
        prompt: prompt ?? null,
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
        {prompt && <p style={{ color: 'var(--accent)', marginTop: -6 }}>Prompt: {prompt}</p>}

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
              <div style={{ fontWeight: 800 }} className="ellipsis">
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
      <span style={{ fontSize: 22 }}>🟢</span>
      <div className="grow">
        <div style={{ fontWeight: 800 }}>{connected ? 'Spotify connected' : 'Connect Spotify (optional)'}</div>
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
