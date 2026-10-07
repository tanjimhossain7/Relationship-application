'use client'

import { NAMES, PEOPLE, type Person } from '@/lib/people'

const LOOK: Record<Person, { bg: string; ring: string; emoji: string }> = {
  tanzim: { bg: 'linear-gradient(145deg, #10214d, #060b1c)', ring: '#9dbbff', emoji: '🫐' },
  azrina: { bg: 'linear-gradient(145deg, #0f3627, #04110c)', ring: '#8fe8b8', emoji: '🍵' },
}

export default function PersonPicker({ onChoose }: { onChoose: (p: Person) => void }) {
  return (
    <div className="fullscreen" style={{ gap: 28 }}>
      <div className="stack-sm pop">
        <div style={{ fontSize: 44 }} className="float">
          💌
        </div>
        <h1 style={{ fontSize: 34 }}>Who&apos;s this?</h1>
        <p className="muted">Pick yourself. No passwords, just vibes.</p>
      </div>
      <div className="stack" style={{ width: '100%', maxWidth: 380 }}>
        {PEOPLE.map((p, i) => (
          <button
            key={p}
            onClick={() => onChoose(p)}
            className="pressable pop"
            style={{
              animationDelay: `${0.12 + i * 0.1}s`,
              background: LOOK[p].bg,
              border: `1px solid ${LOOK[p].ring}40`,
              borderRadius: 26,
              padding: '22px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              textAlign: 'left',
              boxShadow: `0 14px 40px -16px ${LOOK[p].ring}80`,
            }}
          >
            <span style={{ fontSize: 34 }}>{LOOK[p].emoji}</span>
            <span className="grow">
              <span className="display" style={{ fontSize: 24, display: 'block' }}>
                {NAMES[p]}
              </span>
              <span className="small" style={{ color: LOOK[p].ring }}>
                That&apos;s me
              </span>
            </span>
            <span style={{ color: LOOK[p].ring, fontSize: 22 }}>→</span>
          </button>
        ))}
      </div>
      <p className="faint small">Together since April 22, 2024</p>
    </div>
  )
}
