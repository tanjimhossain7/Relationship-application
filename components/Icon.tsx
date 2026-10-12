// Thin line icons used for navigation and tiles, so the chrome stays calm and
// emoji are saved for the fun bits.

const PATHS = {
  home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
  calendar: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10.5h16M8.5 3.5v4M15.5 3.5v4',
  thought: 'M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16h-8l-4.5 3.5V16H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 5zM8 9.5h8M8 12.5h5',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1.5A3 3 0 0 0 8 10.5M16 6h3.5v1.5a3 3 0 0 1-3.5 3M12 13v3.5M8.5 20h7M10 16.5h4l.5 3.5h-5z',
  burger: 'M4.5 10.5C4.5 6.8 7.9 4.5 12 4.5s7.5 2.3 7.5 6zM3.5 13.5c1.4 0 1.4 1 2.8 1s1.4-1 2.8-1 1.4 1 2.9 1 1.4-1 2.8-1 1.4 1 2.8 1 1.4-1 2.9-1M4.5 17h15v1a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z',
  music: 'M9 18V6.5l10-2V16M9 18a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 9 18zM19 16a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 19 16zM9 10l10-2',
  camera: 'M4 8a1 1 0 0 1 1-1h3l1.5-2h5L16 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-2.1 1.2L14.7 21h-4l-.3-2.4a7 7 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-2.6L4.4 9.7l2-3.4 1.9.7a7 7 0 0 1 2.1-1.2L10.7 3h4l.3 2.4a7 7 0 0 1 2.1 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 2.6z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  flame: 'M12 21c3.6 0 6-2.4 6-5.8 0-4.2-3.5-6-4.2-10.2C11 6.6 9.5 9 9.7 11.5 8.6 11 8 9.8 8 8.6 6.6 10 6 12 6 14.6 6 18.4 8.4 21 12 21z',
  photo: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 16l4.5-4.5 4 4 2.5-2.5L20 18M15.5 9.5h.01',
  heart: 'M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z',
  send: 'M20 4 10.5 13.5M20 4l-6 16-3.5-6.5L4 10z',
} as const

export type IconName = keyof typeof PATHS

export default function Icon({ name, size = 22, stroke = 1.6, style }: { name: IconName; size?: number; stroke?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: 'none', ...style }}>
      <path d={PATHS[name]} />
    </svg>
  )
}
