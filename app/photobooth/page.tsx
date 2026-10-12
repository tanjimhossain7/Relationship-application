'use client'

import { useState } from 'react'
import { imageUrl, insert, remove, removeImage } from '@/lib/db'
import { uploadImage } from '@/lib/db'
import { pretty, today } from '@/lib/dates'
import { useMe, useRows } from '@/lib/hooks'
import { Empty, Field, Lightbox, PhotoPicker, Sheet, useToast } from '@/components/ui'
import { useMarkSeen } from '@/lib/seen'

type Strip = { id: string; image_path: string; caption: string | null; taken_on: string | null; created_at: string }

export default function PhotoboothPage() {
  useMarkSeen('photobooth')
  const strips = useRows<Strip>('photobooth', { order: { column: 'created_at', ascending: false } })
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const sorted = [...strips.rows].sort((a, b) => (b.taken_on ?? b.created_at).localeCompare(a.taken_on ?? a.created_at))
  const cur = open !== null ? sorted[open] : null

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Photobooth</h1>
          <p className="sub">{sorted.length ? `${sorted.length} strips and counting` : 'Every strip, forever'}</p>
        </div>
      </header>

      {strips.loading ? (
        <div className="masonry">
          {[220, 300, 260, 200].map((h, i) => (
            <div key={i} className="skeleton" style={{ height: h }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Empty emoji="📸" title="No strips yet" sub="Add all the digital photobooth pictures here" />
      ) : (
        <div className="masonry">
          {sorted.map((s, i) => (
            <button key={s.id} className="pressable" onClick={() => setOpen(i)} style={{ display: 'block', width: '100%', textAlign: 'left' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(s.image_path)} alt="" className="photo" loading="lazy" style={{ borderRadius: 18 }} />
              {(s.caption || s.taken_on) && (
                <div className="small" style={{ padding: '6px 4px 0' }}>
                  {s.caption && <div style={{ fontWeight: 700 }}>{s.caption}</div>}
                  {s.taken_on && <div className="faint">{pretty(s.taken_on)}</div>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setAdding(true)} aria-label="Add strips">
        +
      </button>

      {cur && (
        <Lightbox
          src={imageUrl(cur.image_path)!}
          caption={
            <div className="stack-sm">
              <div>
                {cur.caption && <strong style={{ color: 'var(--text)' }}>{cur.caption}</strong>}
                {cur.taken_on && <div>{pretty(cur.taken_on)}</div>}
              </div>
              <button
                className="faint small"
                onClick={async () => {
                  if (!confirm('Delete this strip?')) return
                  await removeImage(cur.image_path)
                  await remove('photobooth', cur.id)
                  setOpen(null)
                  strips.reload()
                }}
              >
                Delete
              </button>
            </div>
          }
          onClose={() => setOpen(null)}
          onPrev={() => setOpen((o) => (o === null ? o : Math.max(0, o - 1)))}
          onNext={() => setOpen((o) => (o === null ? o : Math.min(sorted.length - 1, o + 1)))}
        />
      )}

      <AddSheet open={adding} onClose={() => setAdding(false)} onSaved={strips.reload} />
    </main>
  )
}

function AddSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { me } = useMe()
  const toast = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [caption, setCaption] = useState('')
  const [date, setDate] = useState(today())
  const [progress, setProgress] = useState<number | null>(null)

  async function save() {
    setProgress(0)
    try {
      for (let i = 0; i < files.length; i++) {
        const path = await uploadImage(files[i], 'photobooth')
        await insert('photobooth', { image_path: path, caption: caption.trim() || null, taken_on: date || null, created_by: me })
        setProgress(i + 1)
      }
      toast('📸', `Added ${files.length} strip${files.length === 1 ? '' : 's'}`)
      setFiles([])
      setCaption('')
      onSaved()
      onClose()
    } catch (e) {
      toast('😵', e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setProgress(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add photobooth strips">
      <div className="stack">
        <PhotoPicker multiple onPick={(f) => setFiles((x) => [...x, ...f])}>
          <div className="stack-sm center">
            <div style={{ fontSize: 30 }}>🎞️</div>
            <div className="muted">{files.length ? `${files.length} selected · tap to add more` : 'Choose one or many'}</div>
          </div>
        </PhotoPicker>
        {files.length > 0 && (
          <div className="row" style={{ overflowX: 'auto' }}>
            {files.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={URL.createObjectURL(f)} alt="" className="thumb" />
            ))}
          </div>
        )}
        <Field label="Where / what (optional)">
          <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Distillery District, after ramen" />
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <button className="btn block" disabled={!files.length || progress !== null} onClick={save}>
          {progress !== null ? `Uploading ${progress}/${files.length}…` : 'Add'}
        </button>
      </div>
    </Sheet>
  )
}
