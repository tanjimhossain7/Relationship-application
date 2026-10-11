'use client'

import { imageUrl } from '@/lib/db'
import { slotEmoji, type LibraryImage } from '@/lib/library'
import type { Milestone } from '@/lib/streaks'

export default function StreakPopup({ milestone, library, name, onClose }: { milestone: Milestone; library: LibraryImage[]; name: string; onClose: () => void }) {
  const pics = library.filter((l) => l.slot === milestone.slot)
  const pic = pics.length ? pics[Math.floor(Math.random() * pics.length)] : null
  return (
    <div className="fullscreen" onClick={onClose} style={{ zIndex: 92 }}>
      <Confetti />
      {pic ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl(pic.image_path)} alt="" className="pop" style={{ maxWidth: 280, maxHeight: '42dvh', borderRadius: 26, objectFit: 'cover' }} />
      ) : (
        <div className="pop float" style={{ fontSize: 120, lineHeight: 1 }}>
          {slotEmoji(milestone.slot)}
        </div>
      )}
      <div className="stack-sm pop" style={{ animationDelay: '0.15s' }}>
        <p className="tiny" style={{ color: 'var(--accent)' }}>
          {milestone.sub}
        </p>
        <h1 style={{ fontSize: 32 }}>{milestone.title}!</h1>
        <p className="muted">Proud of you {name}. Mildly.</p>
      </div>
      <button className="btn pop" style={{ animationDelay: '0.3s' }} onClick={onClose}>
        Yay
      </button>
    </div>
  )
}

function Confetti() {
  const bits = ['✨', '💖', '🎉', '⭐', '💫', '🫶']
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: 26 }).map((_, i) => (
        <span
          key={i}
          className="rain"
          style={
            {
              left: `${(i * 37) % 100}%`,
              fontSize: 18 + ((i * 7) % 16),
              animationDuration: `${2.6 + ((i * 13) % 20) / 10}s`,
              animationDelay: `${((i * 17) % 15) / 10}s`,
              '--spin': `${i % 2 ? 300 : -300}deg`,
            } as React.CSSProperties
          }
        >
          {bits[i % bits.length]}
        </span>
      ))}
    </div>
  )
}
