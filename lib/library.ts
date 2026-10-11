// Picture library used by streak popups and the occasional surprise animations.
// Tanzim uploads pictures per slot in More -> Picture library; until then each
// slot falls back to its placeholder emoji.

export type Slot =
  | 'badtzmaru'
  | 'underpant'
  | 'petticoat'
  | 'stupid'
  | 'bambarbola'
  | 'peace_bridge'
  | 'moto'

export const SLOTS: { slot: Slot; label: string; emoji: string; hint: string }[] = [
  { slot: 'badtzmaru', label: 'Badtzmaru', emoji: '🐧', hint: '7 day streak and the running surprise' },
  { slot: 'underpant', label: 'Underpant', emoji: '🩲', hint: '10 day streak and the underpant shower' },
  { slot: 'petticoat', label: 'Petticoat', emoji: '👗', hint: '15 day streak' },
  { slot: 'stupid', label: 'Stupid ass people', emoji: '🤪', hint: '20 day streak' },
  { slot: 'bambarbola', label: 'Bambarbola Dagmagdola', emoji: '🪩', hint: '25 day streak' },
  { slot: 'peace_bridge', label: 'Peace Bridge', emoji: '🌉', hint: '1 month streaks' },
  { slot: 'moto', label: 'Badtzmaru on a motorcycle', emoji: '🏍️', hint: 'Motorcycle across Peace Bridge surprise (transparent PNG looks best)' },
]

export const slotEmoji = (s: Slot) => SLOTS.find((x) => x.slot === s)?.emoji ?? '✨'

export type LibraryImage = { id: string; slot: Slot; image_path: string; created_at?: string }
