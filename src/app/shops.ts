import { useEffect, useMemo, useState } from 'react'
import { useApp, type Row, type Shop } from '@/lib'
import { haversine, useLoc, useMyShops } from './location'

/** Eintrag aus public/stores_linz_walk.json (HCB, OSM/ODbL). */
export type WalkStore = { osm: string; name: string; brand: string | null; chain: string | null; type: string | null; addr: string; lat: number; lon: number; hours?: string; dist_m: number; walk_m: number; walk_min: number; walk_band: string; walk_method: string; availability_level: string; source: string }
export type Delivery = { name: string; type: string; delivers_4020: boolean; checked: string; source: string }
type WalkFile = { home: { addr: string; lat: number; lon: number }; generated: string; stores: WalkStore[]; delivery: Delivery[]; notes: Record<string, any> }
let cache: Promise<WalkFile | null> | null = null
const loadWalk = () => cache ??= fetch(`${import.meta.env.BASE_URL}stores_linz_walk.json`).then(r => r.ok ? r.json() : null).catch(() => null)
type ProvStore = { chain: string; segment: string; provider_type: string; name: string; address: string | null; lat: number; lon: number; distance_km: number; opening_hours?: string; osm_id?: string }
let pcache: Promise<ProvStore[]> | null = null
const loadProv = () => pcache ??= fetch(`${import.meta.env.BASE_URL}stores_linz_providers.json`).then(r => r.ok ? r.json() : { stores: [] }).then(j => j.stores ?? []).catch(() => [])
export function useProviderStores() { const [f, setF] = useState<ProvStore[]>([]); useEffect(() => { loadProv().then(setF) }, []); return f }
type OsmStore = { osm_type: string; osm_id: number; chain: string; name: string; street?: string; housenumber?: string; postcode?: string; city?: string; lat: number; lon: number; opening_hours?: string }
let ocache: Promise<OsmStore[]> | null = null
const loadOsm = () => ocache ??= fetch(`${import.meta.env.BASE_URL}stores_linz_2026-10-13.json`).then(r => r.ok ? r.json() : { stores: [] }).then(j => j.stores ?? []).catch(() => [])
export function useOsmStores() { const [f, setF] = useState<OsmStore[]>([]); useEffect(() => { loadOsm().then(setF) }, []); return f }
export function useWalkFile() { const [f, setF] = useState<WalkFile | null>(null); useEffect(() => { loadWalk().then(setF) }, []); return f }

export const shopId = (s: { osm?: string; chain: string | null; name: string; lat: number }) => s.osm ?? `${s.chain}|${s.name}|${s.lat.toFixed(5)}`
/** Online-/Lieferanbieter ohne Filialen. Lieferbarkeit nach 4020 kommt aus stores_linz_walk.json → delivery. */
export const ONLINE = ['Gurkerl', 'PrepMyMeal', 'Fit to Go', 'LiveFresh', 'FitTaste']
export const onlineId = (p: string) => `online|${p}`
export type NearShop = Shop & { id: string; d: number; walkMin: number; type: string | null; hasProducts: boolean; osm?: string }
const TYPE_DE: Record<string, string> = { chain: 'Supermarkt', 'ethnic/local': 'Nahversorger', bakery: 'Bäckerei', deli: 'Feinkost', butcher: 'Fleischerei', kiosk: 'Kiosk', greengrocer: 'Obst & Gemüse', chemist: 'Drogerie', 'petrol-station shop': 'Tankstellenshop', 'to-go chain': 'To-go-Kette', 'meal-prep': 'Meal-Prep', shop: 'Geschäft' }
export const typeLabel = (t: string | null) => t ? TYPE_DE[t] ?? t : 'Geschäft'
/** Gehzeit geschätzt: Luftlinie × 1,3 bei 4,8 km/h → immer mit „~“ anzeigen. */
export const estWalkMin = (m: number) => Math.max(1, Math.round(m * 1.3 / 80))

export function useNearShops() {
  const wf = useWalkFile(); const prov = useProviderStores(); const osm = useOsmStores(); const loc = useLoc(); const my = useMyShops(); const { R } = useApp()
  const rowStores = useMemo(() => new Set(R.map(r => r.store)), [R])
  return useMemo(() => {
    const atHome = wf && haversine(loc, wf.home) < 30
    const all: NearShop[] = (wf?.stores ?? []).map((s): NearShop => { const d = atHome ? s.dist_m : haversine(loc, s); return { chain: s.chain ?? s.brand ?? s.name, name: s.name, addr: s.addr || null, lat: s.lat, lon: s.lon, dist: d, hours: s.hours, gmaps: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}&travelmode=walking`, id: shopId(s), d, walkMin: atHome ? s.walk_min : estWalkMin(d), type: s.type, hasProducts: s.availability_level === 'chain', osm: s.osm } }).concat((() => { const seen = new Set((wf?.stores ?? []).map(s => s.osm)); return prov.filter(p => !p.osm_id || !seen.has(p.osm_id)).map(p => { const d = haversine(loc, p); return { chain: p.chain, name: p.name, addr: p.address, lat: p.lat, lon: p.lon, dist: d, hours: p.opening_hours, gmaps: `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=walking`, id: p.osm_id ?? `prov|${p.chain}|${p.lat.toFixed(5)}`, d, walkMin: estWalkMin(d), type: p.provider_type, hasProducts: rowStores.has(p.chain), osm: p.osm_id } }) })())
      .concat((() => { const seen = new Set([...(wf?.stores ?? []).map(s => s.osm), ...prov.map(p => p.osm_id)]); return osm.filter(o => !seen.has(`${o.osm_type}/${o.osm_id}`)).map((o): NearShop => { const d = haversine(loc, o); const addr = [o.street && `${o.street} ${o.housenumber ?? ''}`.trim(), [o.postcode, o.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null; return { chain: o.chain || o.name, name: o.name, addr, lat: o.lat, lon: o.lon, dist: d, hours: o.opening_hours, gmaps: `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lon}&travelmode=walking`, id: `${o.osm_type}/${o.osm_id}`, d, walkMin: estWalkMin(d), type: rowStores.has(o.chain) ? 'chain' : 'shop', hasProducts: rowStores.has(o.chain), osm: `${o.osm_type}/${o.osm_id}` } }) })())
      .sort((a, b) => a.d - b.d)
    const inR = all.filter(s => s.d <= loc.radius)
    const mine = all.filter(s => my.includes(s.id))
    const delivery = wf?.delivery ?? []
    const deliversHere = (p: string) => { const x = delivery.find(d => d.name === p); return x ? x.delivers_4020 : null }
    const myChains = new Set([...mine.filter(s => s.hasProducts).map(s => s.chain), ...ONLINE.filter(p => my.includes(onlineId(p)) && deliversHere(p) !== false)])
    const nearestByChain: Record<string, number> = {}
    all.forEach(s => { if (s.hasProducts && nearestByChain[s.chain] == null) nearestByChain[s.chain] = s.d })
    return { all, inR, mine, my, myChains, loc, delivery, deliversHere, generated: wf?.generated ?? null, loaded: !!wf, distOf: (r: Row) => nearestByChain[r.store] ?? null }
  }, [wf, prov, osm, loc, my, rowStores])
}
