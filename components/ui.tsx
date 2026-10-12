'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  if (!open) return null
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grabber" />
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </>
  )
}

export function Empty({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <div className="empty">
      <div className="big">{emoji}</div>
      <div className="display" style={{ fontSize: 18, color: 'var(--text)' }}>
        {title}
      </div>
      {sub && <p className="small" style={{ marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Lightbox({ src, caption, onClose, onPrev, onNext }: { src: string; caption?: ReactNode; onClose: () => void; onPrev?: () => void; onNext?: () => void }) {
  const startX = useRef<number | null>(null)
  return (
    <div
      className="lightbox"
      onClick={onClose}
      onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (startX.current === null) return
        const dx = e.changedTouches[0].clientX - startX.current
        if (dx > 50) onPrev?.()
        if (dx < -50) onNext?.()
        startX.current = null
      }}
    >
      <button className="icon-btn close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" onClick={(e) => e.stopPropagation()} />
      {caption && (
        <div className="muted center" style={{ marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
          {caption}
        </div>
      )}
    </div>
  )
}

/** A big tappable area that opens the photo picker. */
export function PhotoPicker({ onPick, multiple, children, preview }: { onPick: (files: File[]) => void; multiple?: boolean; children?: ReactNode; preview?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) onPick(files)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className="card pressable"
        onClick={() => ref.current?.click()}
        style={{ width: '100%', padding: preview ? 0 : 26, overflow: 'hidden', borderStyle: preview ? 'solid' : 'dashed' }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" style={{ width: '100%', maxHeight: 340, objectFit: 'cover' }} />
        ) : (
          children ?? (
            <div className="stack-sm center">
              <div style={{ fontSize: 30 }}>📷</div>
              <div className="muted">Tap to choose {multiple ? 'photos' : 'a photo'}</div>
            </div>
          )
        )}
      </button>
    </>
  )
}

// ---------- toasts ----------

type Toast = { id: number; emoji: string; text: ReactNode; ms: number }
const ToastCtx = createContext<(emoji: string, text: ReactNode, ms?: number) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const show = useCallback((emoji: string, text: ReactNode, ms = 3200) => {
    setToast({ id: Date.now(), emoji, text, ms })
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.ms)
    return () => clearTimeout(t)
  }, [toast])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" key={toast.id} onClick={() => setToast(null)}>
          <span className="em">{toast.emoji}</span>
          <div className="grow">{toast.text}</div>
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export function Stars({ value, color }: { value: number | null | undefined; color?: string }) {
  if (value === null || value === undefined || Number.isNaN(value)) return <span className="faint">–</span>
  return <span style={{ color }}>{Number(value).toFixed(Number(value) % 1 ? 1 : 0)}</span>
}
