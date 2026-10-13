import { useCallback, useEffect, useState } from 'react'
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

/** Loads the product dataset and the store list; exposes a nearest-branch lookup. */
export function useAppData() {
  const data = useJson<Data>('./data.json')
  const stores = useJson<Stores>('./stores.json', true)
  useEffect(() => { const t = setTimeout(() => sessionStorage.removeItem('fg-reloaded'), 10000); return () => clearTimeout(t) }, [])
  const nearest = useCallback((chain: string): Shop | null => {
    if (!stores) return null
    let best: Shop | null = null
    for (const s of stores.shops) if (s.chain === chain && (!best || (s.walk_m ?? s.dist) < (best.walk_m ?? best.dist))) best = s
    return best
  }, [stores])
  return { data, stores, nearest }
}
