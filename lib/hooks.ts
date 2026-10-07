'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { list, type ListOpts, type Row } from './db'
import type { Person } from './people'

export const MeContext = createContext<{ me: Person; switchPerson: () => void } | null>(null)

export function useMe() {
  const ctx = useContext(MeContext)
  if (!ctx) throw new Error('useMe outside of the app shell')
  return ctx
}

/** Loads a table and reloads it whenever the app comes back to the foreground. */
export function useRows<T extends Row>(table: string, opts: ListOpts = {}) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const optsKey = JSON.stringify(opts)
  const optsRef = useRef(opts)
  optsRef.current = opts

  const reload = useCallback(async () => {
    try {
      setRows(await list<T>(table, optsRef.current))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, optsKey])

  useEffect(() => {
    reload()
    const onVis = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [reload])

  return { rows, setRows, loading, error, reload }
}
