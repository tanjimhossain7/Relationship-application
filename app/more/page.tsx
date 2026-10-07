'use client'

import Link from 'next/link'
import { useState } from 'react'
import { imageUrl, insert, isDemo, remove, removeImage, uploadImage } from '@/lib/db'
import { useMe, useRows } from '@/lib/hooks'
import { SLOTS, type LibraryImage, type Slot } from '@/lib/library'
import { NAMES, other } from '@/lib/people'
import { spotifyEnabled } from '@/lib/spotify'
import { PhotoPicker, useToast } from '@/components/ui'
import type { SurpriseKind } from '@/components/Surprise'

export default function MorePage() {
  const { me, switchPerson } = useMe()

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>More</h1>
          <p className="sub">Settings and the secret stuff</p>
        </div>
      </header>

      <div className="stack-sm">
        <Link href="/music" className="card tight row pressable">
          <span style={{ fontSize: 22 }}>🎧</span>
          <span className="grow" style={{ fontWeight: 800 }}>
            Music
          </span>
          <span className="faint">→</span>
        </Link>
        <Link href="/photobooth" className="card tight row pressable">
          <span style={{ fontSize: 22 }}>📸</span>
          <span className="grow" style={{ fontWeight: 800 }}>
            Photobooth
          </span>
          <span className="faint">→</span>
        </Link>
      </div>

      <div className="card spread">
        <div>
          <div style={{ fontWeight: 800 }}>You&apos;re {NAMES[me]}</div>
          <div className="small muted">On this phone</div>
        </div>
        <button className="btn small ghost" onClick={() => confirm(`Switch to ${NAMES[other(me)]}?`) && switchPerson()}>
          Switch
        </button>
      </div>

      <div className="card tight small muted stack-sm">
        <div>
          <strong style={{ color: 'var(--text)' }}>Storage:</strong> {isDemo ? 'demo mode (this phone only)' : 'shared via Supabase'}
        </div>
        <div>
          <strong style={{ color: 'var(--text)' }}>Spotify connect:</strong> {spotifyEnabled ? 'available in Music' : 'not set up (sending links still works)'}
        </div>
        <div>
          <strong style={{ color: 'var(--text)' }}>Install:</strong> in Safari tap Share → Add to Home Screen
        </div>
      </div>

      {me === 'tanzim' && <Library />}
    </main>
  )
}

function Library() {
  const toast = useToast()
  const lib = useRows<LibraryImage>('library_images', { order: { column: 'created_at', ascending: true } })
  const [busy, setBusy] = useState<Slot | null>(null)

  async function add(slot: Slot, files: File[]) {
    setBusy(slot)
    try {
      for (const f of files) {
        const path = await uploadImage(f, `library/${slot}`)
        await insert('library_images', { slot, image_path: path })
      }
      await lib.reload()
      window.dispatchEvent(new Event('us:library'))
    } catch (e) {
      toast('😵', e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(null)
    }
  }

  const preview = (k: SurpriseKind) => window.dispatchEvent(new CustomEvent('us:surprise', { detail: k }))

  return (
    <>
      <p className="section-label">Picture library · only you see this</p>
      <p className="small muted" style={{ marginTop: -6, paddingLeft: 4 }}>
        Used by the streak popups and the surprise animations. Each slot picks one at random. Empty slots use the emoji.
      </p>
      {SLOTS.map((s) => {
        const imgs = lib.rows.filter((l) => l.slot === s.slot)
        return (
          <div key={s.slot} className="card stack-sm">
            <div className="row">
              <span style={{ fontSize: 24 }}>{s.emoji}</span>
              <div className="grow">
                <div style={{ fontWeight: 800 }}>{s.label}</div>
                <div className="small faint">{s.hint}</div>
              </div>
            </div>
            {imgs.length > 0 && (
              <div className="row wrap">
                {imgs.map((i) => (
                  <button
                    key={i.id}
                    onClick={async () => {
                      if (!confirm('Remove this picture?')) return
                      await removeImage(i.image_path)
                      await remove('library_images', i.id)
                      lib.reload()
                      window.dispatchEvent(new Event('us:library'))
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl(i.image_path)} alt="" className="thumb" />
                  </button>
                ))}
              </div>
            )}
            <PhotoPicker multiple onPick={(f) => add(s.slot, f)}>
              <span className="muted small">{busy === s.slot ? 'Uploading…' : '+ Add pictures'}</span>
            </PhotoPicker>
          </div>
        )
      })}

      <p className="section-label">Preview the surprises</p>
      <div className="row wrap">
        <button className="btn small ghost" onClick={() => preview('run')}>
          🐧 Running
        </button>
        <button className="btn small ghost" onClick={() => preview('shower')}>
          🩲 Shower
        </button>
        <button className="btn small ghost" onClick={() => preview('moto')}>
          🏍️ Peace Bridge
        </button>
      </div>
    </>
  )
}
