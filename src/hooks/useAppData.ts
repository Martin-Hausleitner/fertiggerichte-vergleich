import { dedupeGtin } from '@/app/meal'
import { findNearestStore, mergeLinzStores, type WalkStore } from '@/app/shops'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Data, Stores, Shop } from '@/lib'

function useJson<T>(url: string, optional = false): T | null {
  const [v, setV] = useState<T | null>(null)
  useEffect(() => {
    let alive = true
    fetch(`${url}?v=${__BUILD__}`)
      .then(r => (r.ok ? r.json() : optional ? null : Promise.reject(new Error(`${url}: ${r.status}`))))
      .then(j => { if (alive) setV(j) })
      .catch(e => { if (!optional) console.warn(e) })
    return () => { alive = false }
  }, [url, optional])
  return v
}

/** Loads the product dataset and the merged Linz store list; exposes a nearest-branch lookup across all Linz chains. */
export function useAppData() {
  const raw = useJson<Data>('./data.json')
  const data = useMemo(() => raw ? { ...raw, rows: dedupeGtin(raw.rows) as typeof raw.rows } : raw, [raw])
  const baseStores = useJson<Stores>('./stores.json', true)
  const walkFile = useJson<{ home: { addr: string; lat: number; lon: number }; stores: WalkStore[] }>('./stores_linz_walk.json', true)
  const provFile = useJson<{ stores: any[] }>('./stores_linz_providers.json', true)
  const osmFile = useJson<{ stores: any[] }>('./stores_linz_2026-10-13.json', true)
  const stores = useMemo(() => mergeLinzStores(baseStores, walkFile, provFile, osmFile), [baseStores, walkFile, provFile, osmFile])
  useEffect(() => { const t = setTimeout(() => sessionStorage.removeItem('fg-reloaded'), 10000); return () => clearTimeout(t) }, [])
  const nearest = useCallback((chain: string): Shop | null => findNearestStore(stores, chain), [stores])
  return { data, stores, nearest }
}
