import { useEffect, useMemo, useState } from 'react'
import type { Row, Shop } from '@/lib'
import { haversine, useLoc, useMyShops } from './location'

/** Eintrag aus public/stores_linz_walk.json (HCB, OSM/ODbL). */
export type WalkStore = { osm: string; name: string; brand: string | null; chain: string | null; type: string | null; addr: string; lat: number; lon: number; hours?: string; dist_m: number; walk_m: number; walk_min: number; walk_band: string; walk_method: string; availability_level: string; source: string }
export type Delivery = { name: string; type: string; delivers_4020: boolean; checked: string; source: string }
type WalkFile = { home: { addr: string; lat: number; lon: number }; generated: string; stores: WalkStore[]; delivery: Delivery[]; notes: Record<string, any> }
let cache: Promise<WalkFile | null> | null = null
const loadWalk = () => cache ??= fetch(`${import.meta.env.BASE_URL}stores_linz_walk.json`).then(r => r.ok ? r.json() : null).catch(() => null)
export function useWalkFile() { const [f, setF] = useState<WalkFile | null>(null); useEffect(() => { loadWalk().then(setF) }, []); return f }

export const shopId = (s: { osm?: string; chain: string | null; name: string; lat: number }) => s.osm ?? `${s.chain}|${s.name}|${s.lat.toFixed(5)}`
/** Online-/Lieferanbieter ohne Filialen. Lieferbarkeit nach 4020 kommt aus stores_linz_walk.json → delivery. */
export const ONLINE = ['Gurkerl', 'PrepMyMeal', 'Fit to Go', 'LiveFresh', 'FitTaste']
export const onlineId = (p: string) => `online|${p}`
export type NearShop = Shop & { id: string; d: number; walkMin: number; type: string | null; hasProducts: boolean; osm?: string }
const TYPE_DE: Record<string, string> = { chain: 'Supermarkt', 'ethnic/local': 'Nahversorger', bakery: 'Bäckerei', deli: 'Feinkost', butcher: 'Fleischerei', kiosk: 'Kiosk', greengrocer: 'Obst & Gemüse', chemist: 'Drogerie' }
export const typeLabel = (t: string | null) => t ? TYPE_DE[t] ?? t : 'Geschäft'
/** Gehzeit geschätzt: Luftlinie × 1,3 bei 4,8 km/h → immer mit „~“ anzeigen. */
export const estWalkMin = (m: number) => Math.max(1, Math.round(m * 1.3 / 80))

export function useNearShops() {
  const wf = useWalkFile(); const loc = useLoc(); const my = useMyShops()
  return useMemo(() => {
    const atHome = wf && haversine(loc, wf.home) < 30
    const all: NearShop[] = (wf?.stores ?? []).map(s => { const d = atHome ? s.dist_m : haversine(loc, s); return { chain: s.chain ?? s.brand ?? s.name, name: s.name, addr: s.addr || null, lat: s.lat, lon: s.lon, dist: d, hours: s.hours, gmaps: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}&travelmode=walking`, id: shopId(s), d, walkMin: atHome ? s.walk_min : estWalkMin(d), type: s.type, hasProducts: s.availability_level === 'chain', osm: s.osm } }).sort((a, b) => a.d - b.d)
    const inR = all.filter(s => s.d <= loc.radius)
    const mine = all.filter(s => my.includes(s.id))
    const delivery = wf?.delivery ?? []
    const deliversHere = (p: string) => { const x = delivery.find(d => d.name === p); return x ? x.delivers_4020 : null }
    const myChains = new Set([...mine.filter(s => s.hasProducts).map(s => s.chain), ...ONLINE.filter(p => my.includes(onlineId(p)) && deliversHere(p) !== false)])
    const nearestByChain: Record<string, number> = {}
    all.forEach(s => { if (s.hasProducts && nearestByChain[s.chain] == null) nearestByChain[s.chain] = s.d })
    return { all, inR, mine, my, myChains, loc, delivery, deliversHere, generated: wf?.generated ?? null, loaded: !!wf, distOf: (r: Row) => nearestByChain[r.store] ?? null }
  }, [wf, loc, my])
}
