'use client'

import { useEffect, useState } from 'react'
import { imageUrl, list, update } from '@/lib/db'
import { weekStart } from '@/lib/dates'
import { NAMES, other, type Person } from '@/lib/people'

type Pick = { id: string; chooser: Person; image_path: string; caption: string | null; seen_at: string | null }

/** If the other person picked a picture for you this week, you have to open it first. */
export default function WeeklyGate({ me, onDone }: { me: Person; onDone: () => void }) {
  const [pick, setPick] = useState<Pick | null | undefined>(undefined)
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    list<Pick>('weekly_picks', { eq: { for_person: me, week_start: weekStart() } })
      .then(([p]) => {
        if (p && !p.seen_at) setPick(p)
        else onDone()
      })
      .catch(() => onDone())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me])

  if (pick === undefined) {
    return (
      <div className="fullscreen">
        <div style={{ fontSize: 40 }} className="float">
          💌
        </div>
      </div>
    )
  }
  if (!pick) return null

  const from = NAMES[other(me)]

  if (!opened) {
    return (
      <div className="fullscreen" style={{ gap: 26 }}>
        <div className="wiggle" style={{ fontSize: 96 }}>
          💌
        </div>
        <div className="stack-sm">
          <h1>{from} picked this week&apos;s picture for you</h1>
          <p className="muted">You can&apos;t get in until you open it. Rules are rules.</p>
        </div>
        <button
          className="btn"
          style={{ minWidth: 200 }}
          onClick={() => {
            setOpened(true)
            update('weekly_picks', pick.id, { seen_at: new Date().toISOString() }).catch(() => {})
          }}
        >
          Open it
        </button>
      </div>
    )
  }

  return (
    <div className="fullscreen" style={{ gap: 20 }}>
      <div className="hero-photo pop" style={{ width: '100%', maxWidth: 420, maxHeight: '64dvh' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(pick.image_path)} alt="" />
      </div>
      {pick.caption && (
        <p className="display" style={{ fontSize: 20 }}>
          “{pick.caption}”
        </p>
      )}
      <p className="muted small">from {from}, for this whole week</p>
      <button className="btn" onClick={onDone}>
        Okay I&apos;m in 🥹
      </button>
    </div>
  )
}
