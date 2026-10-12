'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// One tiny data layer. With Supabase env vars set, everything is shared between
// both phones. Without them the app runs in "demo mode" and saves to this browser
// only, so it can be tried out before Supabase is set up.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const BUCKET = 'photos'

export const isDemo = !url || !key

let client: SupabaseClient | null = null
function sb(): SupabaseClient {
  if (!client) client = createClient(url!, key!, { auth: { persistSession: false } })
  return client
}

export type Row = { id: string; created_at?: string; [k: string]: unknown }

export type ListOpts = {
  eq?: Record<string, string | number | boolean | null>
  order?: { column: string; ascending?: boolean }
  limit?: number
}

// ---------- demo backend ----------
const lsKey = (table: string) => `us:table:${table}`
function lsRead<T>(table: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(lsKey(table)) || '[]') as T[]
  } catch {
    return []
  }
}
function lsWrite(table: string, rows: unknown[]) {
  localStorage.setItem(lsKey(table), JSON.stringify(rows))
}
function uuid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ---------- public API ----------
export async function list<T extends Row>(table: string, opts: ListOpts = {}): Promise<T[]> {
  if (isDemo) {
    let rows = lsRead<T>(table)
    if (opts.eq) {
      rows = rows.filter((r) => Object.entries(opts.eq!).every(([k, v]) => (r[k] ?? null) === v))
    }
    if (opts.order) {
      const { column, ascending = true } = opts.order
      rows = [...rows].sort((a, b) => {
        const av = String(a[column] ?? '')
        const bv = String(b[column] ?? '')
        return ascending ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    if (opts.limit) rows = rows.slice(0, opts.limit)
    return rows
  }
  let q = sb().from(table).select('*')
  if (opts.eq) {
    for (const [k, v] of Object.entries(opts.eq)) q = v === null ? q.is(k, null) : q.eq(k, v)
  }
  if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? true })
  if (opts.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as T[]
}

export async function insert<T extends Row>(table: string, row: Record<string, unknown>): Promise<T> {
  if (isDemo) {
    const full = { id: uuid(), created_at: new Date().toISOString(), ...row } as T
    lsWrite(table, [...lsRead(table), full])
    return full
  }
  const { data, error } = await sb().from(table).insert(row).select().single()
  if (error) throw error
  return data as T
}

export async function upsert<T extends Row>(
  table: string,
  row: Record<string, unknown>,
  onConflict: string,
): Promise<T> {
  if (isDemo) {
    const keys = onConflict.split(',').map((s) => s.trim())
    const rows = lsRead<T>(table)
    const idx = rows.findIndex((r) => keys.every((k) => r[k] === row[k]))
    if (idx >= 0) {
      rows[idx] = { ...rows[idx], ...row }
      lsWrite(table, rows)
      return rows[idx]
    }
    return insert<T>(table, row)
  }
  const { data, error } = await sb().from(table).upsert(row, { onConflict }).select().single()
  if (error) throw error
  return data as T
}

export async function update(table: string, id: string, patch: Record<string, unknown>) {
  if (isDemo) {
    lsWrite(
      table,
      lsRead<Row>(table).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
    return
  }
  const { error } = await sb().from(table).update(patch).eq('id', id)
  if (error) throw error
}

export async function remove(table: string, id: string) {
  if (isDemo) {
    lsWrite(
      table,
      lsRead<Row>(table).filter((r) => r.id !== id),
    )
    return
  }
  const { error } = await sb().from(table).delete().eq('id', id)
  if (error) throw error
}

// ---------- photos ----------

/** Shrinks a photo in the browser (iPhone photos are huge) and returns a JPEG blob. */
export async function shrinkImage(file: File, maxSide = isDemo ? 900 : 1800, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b || file), 'image/jpeg', quality))
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  const blob = await shrinkImage(file)
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  if (isDemo) {
    const dataUrl: string = await new Promise((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.readAsDataURL(blob)
    })
    try {
      localStorage.setItem(`us:img:${path}`, dataUrl)
    } catch {
      throw new Error('Demo storage is full. Connect Supabase to store more photos.')
    }
    return path
  }
  const { error } = await sb().storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
  })
  if (error) throw error
  return path
}

export function imageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (/^(https?:|data:|\/)/.test(path)) return path
  if (isDemo) return typeof window === 'undefined' ? undefined : localStorage.getItem(`us:img:${path}`) || undefined
  return sb().storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function removeImage(path: string | null | undefined) {
  if (!path || /^(https?:|data:|\/)/.test(path)) return
  if (isDemo) {
    localStorage.removeItem(`us:img:${path}`)
    return
  }
  await sb().storage.from(BUCKET).remove([path])
}
