import { useMemo } from 'react'
import { useApp, type Shop, type Row } from '@/lib'
import { haversine, useLoc, useMyShops } from './location'

export const shopId = (s: Shop) => `${s.chain}|${s.addr ?? s.name}|${s.lat.toFixed(5)}`
/** Reine Online-/Lieferanbieter ohne Filialkoordinaten in stores.json. */
export const ONLINE = ['Gurkerl', 'PrepMyMeal', 'Fit to Go', 'LiveFresh', 'FitTaste']
export const onlineId = (p: string) => `online|${p}`
export type NearShop = Shop & { id: string; d: number }

export function useNearShops() {
  const { stores } = useApp(); const loc = useLoc(); const my = useMyShops()
  return useMemo(() => {
    const all: NearShop[] = (stores?.shops ?? []).map(s => ({ ...s, id: shopId(s), d: haversine(loc, s) })).sort((a, b) => a.d - b.d)
    const inR = all.filter(s => s.d <= loc.radius)
    const mine = all.filter(s => my.includes(s.id))
    const myChains = new Set([...mine.map(s => s.chain), ...ONLINE.filter(p => my.includes(onlineId(p)))])
    const nearestByChain: Record<string, number> = {}
    all.forEach(s => { if (nearestByChain[s.chain] == null) nearestByChain[s.chain] = s.d })
    return { all, inR, mine, my, myChains, loc, distOf: (r: Row) => nearestByChain[r.store] ?? null }
  }, [stores, loc, my])
}
