import { ImageResponse } from 'next/og'

/** App icon: a soft pink heart on a blue-to-green gradient (his and hers). */
export function iconResponse(size: number) {
  const h = size * 0.36 // heart square side
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1b3a86 0%, #10214d 35%, #0f3627 70%, #1f6b4c 100%)',
        }}
      >
        <div style={{ position: 'relative', width: h * 1.708, height: h * 1.561, marginTop: h * 0.15, display: 'flex' }}>
          <div style={{ position: 'absolute', left: h * 0.354, top: h * 0.354, width: h, height: h, background: '#ffb3c9', transform: 'rotate(45deg)', borderRadius: h * 0.08 }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: h, height: h, background: '#ffb3c9', borderRadius: h }} />
          <div style={{ position: 'absolute', left: h * 0.708, top: 0, width: h, height: h, background: '#ffb3c9', borderRadius: h }} />
        </div>
      </div>
    ),
    { width: size, height: size },
  )
}
