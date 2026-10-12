'use client'

import { useEffect, useState } from 'react'
import { imageUrl, list } from '@/lib/db'
import type { LibraryImage } from '@/lib/library'
import { NAMES, PEOPLE, type Person } from '@/lib/people'
import Icon from './Icon'

const LOOK: Record<Person, { bg: string; ring: string; pic: string }> = {
  tanzim: { bg: 'linear-gradient(150deg, #142a5e, #070d22 70%)', ring: '#a9c2ff', pic: '/badtzmaru.png' },
  azrina: { bg: 'linear-gradient(150deg, #134430, #050f0b 70%)', ring: '#9fe6bf', pic: '/azrina.jpg' },
}

export default function PersonPicker({ onChoose }: { onChoose: (p: Person) => void }) {
  // Tanzim's card uses the motorcycle Badtzmaru from the picture library once it's uploaded.
  const [moto, setMoto] = useState<string | null>(null)
  useEffect(() => {
    list<LibraryImage>('library_images', { eq: { slot: 'moto' } })
      .then(([m]) => m && setMoto(imageUrl(m.image_path) ?? null))
      .catch(() => {})
  }, [])

  return (
    <div className="fullscreen" style={{ gap: 30 }}>
      <div className="stack-sm pop">
        <p className="eyebrow">Underpantmaru</p>
        <h1 style={{ fontSize: 38 }}>
          Who&apos;s <em>this?</em>
        </h1>
      </div>
      <div className="stack" style={{ width: '100%', maxWidth: 380 }}>
        {PEOPLE.map((p, i) => {
          const pic = p === 'tanzim' && moto ? moto : LOOK[p].pic
          return (
            <button
              key={p}
              onClick={() => onChoose(p)}
              className="pressable pop picker-card"
              style={{ animationDelay: `${0.1 + i * 0.08}s`, background: LOOK[p].bg, borderColor: `${LOOK[p].ring}33` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pic} alt="" className={pic.endsWith('.jpg') ? 'avatar photo' : 'avatar'} />
              <span className="grow">
                <span className="display" style={{ fontSize: 26, display: 'block' }}>
                  {NAMES[p]}
                </span>
                <span className="small" style={{ color: LOOK[p].ring }}>
                  That&apos;s me
                </span>
              </span>
              <Icon name="arrow" size={20} style={{ color: LOOK[p].ring }} />
            </button>
          )
        })}
      </div>
      <p className="faint small">Together since April 22, 2024</p>
    </div>
  )
}
