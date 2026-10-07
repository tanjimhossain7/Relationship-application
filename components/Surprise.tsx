'use client'

import { useEffect, useMemo } from 'react'
import { imageUrl } from '@/lib/db'
import type { LibraryImage, Slot } from '@/lib/library'

export type SurpriseKind = 'run' | 'shower' | 'moto'

export default function Surprise({ kind, library, onDone }: { kind: SurpriseKind; library: LibraryImage[]; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, kind === 'shower' ? 6000 : 6800)
    return () => clearTimeout(t)
  }, [kind, onDone])

  const pic = (slot: Slot) => {
    const xs = library.filter((l) => l.slot === slot)
    return xs.length ? imageUrl(xs[Math.floor(Math.random() * xs.length)].image_path) : undefined
  }

  return (
    <div className="surprise" onClick={onDone} style={kind === 'moto' ? { background: 'linear-gradient(180deg, rgba(4,8,20,.88), rgba(10,20,45,.92))', animation: 'fade .5s ease' } : undefined}>
      {kind === 'run' && <Runner src={pic('badtzmaru')} />}
      {kind === 'shower' && <Shower src={pic('underpant')} />}
      {kind === 'moto' && <Moto src={pic('moto')} rider={pic('badtzmaru')} />}
    </div>
  )
}

function Runner({ src }: { src?: string }) {
  return (
    <div className="runner">
      <span className="bob">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="" /> : '🐧'}
      </span>
      <span style={{ fontSize: 22, marginLeft: -6, opacity: 0.7 }}>💨</span>
    </div>
  )
}

function Shower({ src }: { src?: string }) {
  const drops = useMemo(
    () =>
      Array.from({ length: 42 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 2.6,
        dur: 2.2 + Math.random() * 2,
        size: 26 + Math.random() * 26,
        spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
        i,
      })),
    [],
  )
  return (
    <>
      {drops.map((d) => (
        <span
          key={d.i}
          className="rain"
          style={
            {
              left: `${d.left}%`,
              fontSize: d.size,
              animationDuration: `${d.dur}s`,
              animationDelay: `${d.delay}s`,
              '--spin': `${d.spin}deg`,
            } as React.CSSProperties
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src ? <img src={src} alt="" style={{ width: d.size * 1.5 }} /> : '🩲'}
        </span>
      ))}
    </>
  )
}

function Moto({ src, rider }: { src?: string; rider?: string }) {
  return (
    <>
      <svg className="bridge" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b6ea8" stopOpacity="0.55" />
            <stop offset="1" stopColor="#0b1d33" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <rect width="400" height="140" fill="url(#sky)" />
        <rect y="96" width="400" height="44" fill="url(#water)" />
        {/* deck */}
        <rect x="0" y="22" width="400" height="6" rx="2" fill="#e9eef5" opacity="0.92" />
        {/* the arches */}
        {[0, 1, 2, 3, 4].map((i) => {
          const x = 10 + i * 76
          return (
            <g key={i} stroke="#e9eef5" strokeWidth="3" fill="none" opacity="0.85">
              <path d={`M${x} 98 Q ${x + 38} -10 ${x + 76} 98`} />
              {[1, 2, 3, 4, 5].map((k) => (
                <line key={k} x1={x + (76 * k) / 6} y1="28" x2={x + (76 * k) / 6} y2={98 - 216 * (k / 6) * (1 - k / 6)} strokeWidth="1.2" />
              ))}
              <line x1={x} y1="28" x2={x} y2="104" strokeWidth="5" />
            </g>
          )
        })}
        <line x1="390" y1="28" x2="390" y2="104" stroke="#e9eef5" strokeWidth="5" opacity="0.85" />
        {/* lamp posts */}
        {Array.from({ length: 9 }).map((_, i) => (
          <g key={i}>
            <line x1={20 + i * 45} y1="22" x2={20 + i * 45} y2="8" stroke="#e9eef5" strokeWidth="1.2" opacity="0.7" />
            <circle cx={20 + i * 45} cy="8" r="2.2" fill="#ffe9a8" />
          </g>
        ))}
      </svg>
      <div className="moto">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" />
        ) : (
          <span style={{ position: 'relative', display: 'inline-block' }}>
            {rider ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={rider} alt="" style={{ width: 54, position: 'absolute', left: 14, top: -34 }} />
            ) : (
              <span style={{ position: 'absolute', left: 14, top: -30, fontSize: 40 }}>🐧</span>
            )}
            🏍️
          </span>
        )}
        <span style={{ fontSize: 22, opacity: 0.7 }}>💨</span>
      </div>
      <div className="display" style={{ position: 'absolute', top: '22%', width: '100%', textAlign: 'center', fontSize: 22, opacity: 0.9 }}>
        vroom vroom, Peace Bridge 🌉
      </div>
    </>
  )
}
