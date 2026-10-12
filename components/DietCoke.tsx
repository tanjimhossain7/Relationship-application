// The streak badge: a little Diet Coke can (silver can, red script, black band).

export default function DietCoke({ height = 26 }: { height?: number }) {
  return (
    <svg width={(height * 16) / 30} height={height} viewBox="0 0 16 30" aria-label="Diet Coke" role="img" style={{ flex: 'none', display: 'block' }}>
      <defs>
        <linearGradient id="dc-alu" x1="0" x2="1">
          <stop offset="0" stopColor="#8d9096" />
          <stop offset="0.35" stopColor="#f4f5f7" />
          <stop offset="0.6" stopColor="#c9ccd1" />
          <stop offset="1" stopColor="#7c7f85" />
        </linearGradient>
      </defs>
      {/* lid and rim */}
      <path d="M3 1.2h10l1.2 2H1.8z" fill="#b8bbc0" />
      <rect x="1.5" y="3" width="13" height="1.4" rx="0.5" fill="#9a9da3" />
      {/* body */}
      <rect x="1.5" y="4.2" width="13" height="23" rx="1.2" fill="url(#dc-alu)" />
      {/* bottom */}
      <path d="M1.5 27.2h13l-1.2 1.6H2.7z" fill="#9a9da3" />
      {/* black band */}
      <rect x="1.5" y="22.5" width="13" height="2.2" fill="#1a1a1a" />
      {/* red script, running up the can like the real one */}
      <text
        x="0"
        y="0"
        transform="translate(10 22) rotate(-90)"
        fontFamily="'Brush Script MT', 'Snell Roundhand', cursive"
        fontStyle="italic"
        fontWeight={700}
        fontSize="5.2"
        fill="#e41e2b"
      >
        Diet Coke
      </text>
    </svg>
  )
}
