import { useEffect, useMemo, useState } from 'react'
import { useApp, type Row, type Shop, type Stores } from '@/lib'
import { haversine, useLoc, useMyShops } from './location'
import { UNCONFIRMED_TEXT, isDeliveryUnconfirmed } from '@/components/DeliveryHint'
import { passesRankMin, passesLightRank, type MealRow } from '@/app/meal'

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
/** SC69 P1.2: Normalisiert Kettennamen aus OSM/Walk/Provider-Dateien auf die kanonischen Store-Keys in data.json & STORE_LOGO. */
export function matchStoreChain(raw?: string | null): string {
  const s = (raw ?? '').trim()
  if (!s) return ''
  if (/\bdenn'?s\b/i.test(s)) return "Denn's"
  if (/^nordsee\b/i.test(s)) return 'NORDSEE'
  if (/nah\s*&\s*frisch/i.test(s)) return 'Nah&Frisch'
  if (/^fit\s*(?:2|to)\s*go\b/i.test(s)) return 'Fit to Go'
  if (/^spar$/i.test(s)) return 'Spar'
  if (/^billa$/i.test(s)) return 'Billa'
  return s
}
const KNOWN_OSM_ADDR: Record<string, string> = { 'node/3150023279': 'Tummelplatz 19, 4020 Linz' }
/** SC72 P1.1: Merges stores.json with stores_linz_walk.json, stores_linz_providers.json, and stores_linz_2026-10-13.json so nearest(chain) covers all Linz chains. */
export function mergeLinzStores(
  base: Stores | null | undefined,
  wf?: { home?: { addr: string; lat: number; lon: number }; stores?: WalkStore[] } | null,
  prov?: ProvStore[] | { stores?: ProvStore[] } | null,
  osm?: OsmStore[] | { stores?: OsmStore[] } | null,
): Stores | null {
  const wStores = wf?.stores ?? []
  const pStores = Array.isArray(prov) ? prov : (prov?.stores ?? [])
  const oStores = Array.isArray(osm) ? osm : (osm?.stores ?? [])
  if (!base && !wStores.length && !pStores.length && !oStores.length) return null
  const home = base?.home ?? wf?.home ?? { addr: 'Gruberstraße 19, 4020 Linz', lat: 48.3102805, lon: 14.2992021 }
  const shops: Shop[] = (base?.shops ?? []).map(x => ({ ...x, chain: matchStoreChain(x.chain) || x.chain, name: x.name || x.chain, addr: x.addr?.trim() || null }))
  const add = (cand: Shop) => {
    if (!cand.chain && !cand.name) return
    const ex = shops.find(e => Math.abs(e.lat - cand.lat) < 0.0003 && Math.abs(e.lon - cand.lon) < 0.0003 && (e.chain === cand.chain || e.name === cand.name))
    if (ex) {
      if (!ex.addr && cand.addr) ex.addr = cand.addr
      if (!ex.hours && cand.hours) ex.hours = cand.hours
      return
    }
    shops.push(cand)
  }
  for (const x of wStores) {
    const chain = matchStoreChain(x.chain ?? x.brand ?? x.name) || x.name || ''
    const dist = x.dist_m ?? Math.round(haversine(home, x))
    const addr = x.addr?.trim() || (x.osm ? KNOWN_OSM_ADDR[x.osm] : null) || null
    const walk_m = x.walk_method?.includes('fallback') ? dist : (x.walk_m ?? dist)
    add({
      chain,
      name: x.name || chain,
      addr,
      lat: x.lat,
      lon: x.lon,
      dist,
      walk_m,
      walk_min: x.walk_min ?? estWalkMin(dist),
      hours: x.hours || undefined,
      gmaps: `https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lon}&travelmode=walking`,
    })
  }
  for (const x of pStores) {
    const chain = matchStoreChain(x.chain || x.name) || x.name || ''
    const dist = x.distance_km != null ? Math.round(x.distance_km * 1000) : Math.round(haversine(home, x))
    add({
      chain,
      name: x.name || chain,
      addr: x.address?.trim() || (x.osm_id ? KNOWN_OSM_ADDR[x.osm_id] : null) || null,
      lat: x.lat,
      lon: x.lon,
      dist,
      walk_m: dist,
      walk_min: estWalkMin(dist),
      hours: x.opening_hours || undefined,
      gmaps: `https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lon}&travelmode=walking`,
    })
  }
  for (const x of oStores) {
    const chain = matchStoreChain(x.chain || x.name) || x.name || ''
    const osmKey = `${x.osm_type}/${x.osm_id}`
    const addr = [x.street && `${x.street} ${x.housenumber ?? ''}`.trim(), [x.postcode, x.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || KNOWN_OSM_ADDR[osmKey] || null
    const dist = Math.round(haversine(home, x))
    add({
      chain,
      name: x.name || chain,
      addr,
      lat: x.lat,
      lon: x.lon,
      dist,
      walk_m: dist,
      walk_min: estWalkMin(dist),
      hours: x.opening_hours || undefined,
      gmaps: `https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lon}&travelmode=walking`,
    })
  }
  return { home, shops }
}
/** SC72 P1.1: Finds nearest branch for a chain/brand/name across merged Linz stores. */
export function findNearestStore(stores: Stores | Shop[] | null | undefined, queryChain: string): Shop | null {
  const list = Array.isArray(stores) ? stores : stores?.shops
  if (!list || !list.length) return null
  const target = matchStoreChain(queryChain) || (queryChain ?? '').trim()
  if (!target) return null
  const tl = target.toLowerCase(), rawL = (queryChain ?? '').trim().toLowerCase()
  let best: Shop | null = null
  for (const sh of list) {
    const sc = (sh.chain ?? '').toLowerCase(), sn = (sh.name ?? '').toLowerCase()
    const match = rawL && (sn === rawL || sn.startsWith(rawL + ' ') || sc === rawL)
      ? true
      : sh.chain === target || sc === tl || sn === tl || sn.startsWith(tl + ' ')
    if (match && (!best || (sh.walk_m ?? sh.dist) < (best.walk_m ?? best.dist))) best = sh
  }
  return best
}
/** Anbieter, deren Preise nur nach Login sichtbar sind → kein Preis, nie in Preis-Rankings. */
export const LOGIN_ONLY_PRICE = ['Juit']
/** sensecheck 17 (3) / 18 (1): Liefer-/Verfügbarkeitstext ausschließlich aus delivers_4020 der Zeilendaten (Pipeline delivery_4020.json,
 *  einzige Quelle der Wahrheit – keine fest codierte Anbieterliste mehr):
 *  false → delivery_note bzw. „Liefert nicht nach 4020 Linz – nicht in Rankings“ (Begründung + Quelle im Tooltip);
 *  true + Beleg Filiale in Linz (OSM) → „Kette führt es“; true sonst (Versand/Lieferung belegt) → „Online / Lieferung“;
 *  null/unbekannt → „Lieferung nach Linz unbestätigt“ (bleibt rankbar, fällt aber aus dem Filter „nur Liefert nach 4020“). */
export type DeliveryRow = { store: string; segment?: string | null; delivers_4020?: boolean | string | null; delivery_note?: string | null; delivery_source?: string | null; delivery_checked?: string | null; rank_excluded_reason?: string | null }
export const NO_4020_TEXT = 'nicht lieferbar nach 4020 Linz'
export const UNCONFIRMED_4020_TEXT = UNCONFIRMED_TEXT
const isOsmSource = (src?: string | null) => /openstreetmap|overpass|\bosm\b/i.test(src ?? '')
const linzStore = (r: DeliveryRow) => r.delivers_4020 === true && isOsmSource(r.delivery_source)
/** delivers_4020 fehlt (null/leer) → unbestätigt (gleiche Regel wie DeliveryHint). */
export const delivery4020Unconfirmed = (r: DeliveryRow) => isDeliveryUnconfirmed(r)
export const NO_4020_RANK_TEXT = 'Liefert nicht nach 4020 Linz – nicht in Rankings'
/** Liefert nach 4020 laut Daten (für den Filter „nur liefert nach 4020“) – unbestätigte Zeilen fallen heraus. */
export const delivers4020 = (r: DeliveryRow) => r.delivers_4020 === true
const checkedTxt = (r: DeliveryRow) => r.delivery_checked ? ` (geprüft ${r.delivery_checked})` : ''
export const deliveryText = (r: DeliveryRow) =>
  r.delivers_4020 === false ? (r.delivery_note?.trim() || NO_4020_RANK_TEXT) : linzStore(r) ? 'Kette führt es' : r.delivers_4020 === true ? 'Online / Lieferung' : delivery4020Unconfirmed(r) ? UNCONFIRMED_4020_TEXT : 'Kette führt es'
/** Tooltip: Begründung + Quelle (z. B. Alfies-FAQ, gurkerl.at/thema/liefergebiet, Versandseite) bzw. Hinweis „Sortiment der Kette“ / „unbestätigt“. */
export const deliveryTitle = (r: DeliveryRow) =>
  r.delivers_4020 === false ? [r.rank_excluded_reason || `${r.store} liefert nicht nach 4020 Linz – nicht in Rankings`, r.delivery_source && `Quelle: ${r.delivery_source}${checkedTxt(r)}`].filter(Boolean).join(' · ')
    : linzStore(r) ? 'Sortiment der Kette (Filialen in Linz laut OpenStreetMap), nicht für die einzelne Filiale bestätigt'
      : r.delivers_4020 === true ? ['Lieferung nach 4020 Linz belegt', r.delivery_source && `Quelle: ${r.delivery_source}${checkedTxt(r)}`].filter(Boolean).join(' · ')
        : !delivery4020Unconfirmed(r) ? `Lieferstatus laut Daten: ${r.delivers_4020}` : `Für ${r.store} ist weder eine Filiale in Linz noch die Lieferung nach 4020 Linz aus einer offiziellen Quelle belegt. Das Produkt bleibt in den Rankings, fällt aber aus dem Filter „nur Liefert nach 4020“.`
/** Lieferstatus je Anbieter aus den Zeilendaten (erste Zeile mit true/false gewinnt; false hat Vorrang; SC69 P1.1: meal_kit ausgeschlossen, delivers_4020 === null mit Online-Quelle wie every. bleibt online). */
export type StoreDelivery = { store: string; delivers_4020: boolean | null; source: string | null; checked: string | null; online: boolean }
export function storeDeliveries(rows: DeliveryRow[], noDelivery: { store: string; kind?: string }[] = []): Record<string, StoreDelivery> {
  const out: Record<string, StoreDelivery> = {}
  const stationary = new Set(noDelivery.filter(n => n.kind === 'stationary').map(n => n.store))
  for (const r of rows) {
    if (!r.store || r.store.startsWith('unbekannt') || r.segment === 'meal_kit') continue
    const o = out[r.store] ??= { store: r.store, delivers_4020: null, source: null, checked: null, online: false }
    if (o.delivers_4020 === false) continue
    const deliv = r.delivers_4020 === true ? true : r.delivers_4020 === false ? false : null
    if (typeof r.delivers_4020 === 'boolean') {
      if (o.delivers_4020 == null || deliv === false) { o.delivers_4020 = deliv; o.source = r.delivery_source ?? null; o.checked = r.delivery_checked ?? null }
      if (deliv ? !isOsmSource(r.delivery_source) : !stationary.has(r.store)) o.online = true
    } else if (r.delivers_4020 == null && r.delivery_source && !isOsmSource(r.delivery_source) && !stationary.has(r.store)) {
      o.delivers_4020 = deliv === true ? true : deliv === null ? null : false
      o.source ??= r.delivery_source
      o.checked ??= r.delivery_checked ?? null
      o.online = true
    }
  }
  for (const o of Object.values(out)) if (o.delivers_4020 === false && stationary.has(o.store)) o.online = false
  return out
}
/** Online-/Lieferanbieter ohne Linzer Filiale: Anbieter mit Versand-/Lieferbeleg (delivers_4020 true/null, Quelle nicht OSM) oder mit belegtem „liefert nicht“ (nicht stationär). Sortiert: liefert zuerst, dann unbestätigt, dann liefert nicht. */
export const onlineProviders = (by: Record<string, StoreDelivery>) => Object.values(by).filter(o => o.online).sort((a, b) => Number(b.delivers_4020 === true) - Number(a.delivers_4020 === true) || Number(b.delivers_4020 !== false) - Number(a.delivers_4020 !== false) || a.store.localeCompare(b.store, 'de')).map(o => o.store)
export const onlineId = (p: string) => `online|${p}`
/** SC63 P1.1: Tankstellenshops (z. B. OMV Viva Billa) führen kein Voll-Supermarktsortiment und zählen nicht als offene Filiale fürs Ranking. */
export const isPetrolShop = (s: { name: string; type?: string | null }) => /petrol|fuel/i.test(s.type ?? '') || /\bviva\b|tankstelle|\bomv\b|\bbp\b|\bshell\b|\bjet\b|\beni\b|turmöl|avanti/i.test(s.name)
export type ShopOption = Shop & { id: string; d: number; walkMin: number; type: string | null; hasProducts: boolean; productCount: number; rankableCount: number; osm?: string }
export type NearShop = ShopOption
export const isRowRankable = (r: MealRow & { rankable?: boolean; rankableLight?: boolean }) => r.dupOf == null && (r.rankable === true || r.rankableLight === true || passesRankMin(r) || passesLightRank(r))
/** SC70 P1.2: Rohzeilen (dupOf == null) je Kette. */
export function storeCounts(rows: (MealRow & { store: string; dupOf?: number })[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    if (!r.store || r.dupOf != null) continue
    const k = matchStoreChain(r.store) || r.store
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}
/** SC70 P1.2: Rankbare Gerichte (Haupt- oder Light-Ranking) je Kette. */
export function storeRankableCounts(rows: (MealRow & { store: string; dupOf?: number; rankable?: boolean; rankableLight?: boolean })[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    if (!r.store || !isRowRankable(r)) continue
    const k = matchStoreChain(r.store) || r.store
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}
const TYPE_DE: Record<string, string> = { chain: 'Supermarkt', 'ethnic/local': 'Nahversorger', bakery: 'Bäckerei', deli: 'Feinkost', butcher: 'Fleischerei', kiosk: 'Kiosk', greengrocer: 'Obst & Gemüse', chemist: 'Drogerie', 'petrol-station shop': 'Tankstellenshop', 'to-go chain': 'To-go-Kette', 'meal-prep': 'Meal-Prep', shop: 'Geschäft' }
export const typeLabel = (t: string | null) => t ? TYPE_DE[t] ?? t : 'Geschäft'
/** Gehzeit geschätzt: Luftlinie × 1,3 bei 4,8 km/h → immer mit „~“ anzeigen. */
export const estWalkMin = (m: number) => Math.max(1, Math.round(m * 1.3 / 80))

export function useNearShops() {
  const wf = useWalkFile(); const prov = useProviderStores(); const osm = useOsmStores(); const loc = useLoc(); const my = useMyShops(); const { R, D } = useApp()
  const countsByChain = useMemo(() => storeCounts(R), [R])
  const rankableByChain = useMemo(() => storeRankableCounts(R), [R])
  const rowStores = useMemo(() => new Set(Object.keys(countsByChain)), [countsByChain])
  const byStore = useMemo(() => storeDeliveries(R, (D as any)?.delivery4020?.noDelivery ?? []), [R, D])
  const online = useMemo(() => onlineProviders(byStore), [byStore])
  return useMemo(() => {
    const atHome = wf && haversine(loc, wf.home) < 30
    const all: NearShop[] = (wf?.stores ?? []).map((s): NearShop => { const d = atHome ? s.dist_m : haversine(loc, s); const chain = matchStoreChain(s.chain ?? s.brand ?? s.name) || s.name; return { chain, name: s.name, addr: s.addr?.trim() || (s.osm ? KNOWN_OSM_ADDR[s.osm] : null) || null, lat: s.lat, lon: s.lon, dist: d, hours: s.hours, gmaps: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}&travelmode=walking`, id: shopId(s), d, walkMin: atHome ? s.walk_min : estWalkMin(d), type: s.type, hasProducts: s.availability_level === 'chain' || rowStores.has(chain), productCount: countsByChain[chain] ?? 0, rankableCount: rankableByChain[chain] ?? 0, osm: s.osm } }).concat((() => { const seen = new Set((wf?.stores ?? []).map(s => s.osm)); return prov.filter(p => !p.osm_id || !seen.has(p.osm_id)).map(p => { const d = haversine(loc, p); const chain = matchStoreChain(p.chain || p.name) || p.name; return { chain, name: p.name, addr: p.address, lat: p.lat, lon: p.lon, dist: d, hours: p.opening_hours, gmaps: `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=walking`, id: p.osm_id ?? `prov|${chain}|${p.lat.toFixed(5)}`, d, walkMin: estWalkMin(d), type: p.provider_type, hasProducts: rowStores.has(chain), productCount: countsByChain[chain] ?? 0, rankableCount: rankableByChain[chain] ?? 0, osm: p.osm_id } }) })())
      .concat((() => { const seen = new Set([...(wf?.stores ?? []).map(s => s.osm), ...prov.map(p => p.osm_id)]); return osm.filter(o => !seen.has(`${o.osm_type}/${o.osm_id}`)).map((o): NearShop => { const d = haversine(loc, o); const chain = matchStoreChain(o.chain || o.name) || o.name; const addr = [o.street && `${o.street} ${o.housenumber ?? ''}`.trim(), [o.postcode, o.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null; return { chain, name: o.name, addr, lat: o.lat, lon: o.lon, dist: d, hours: o.opening_hours, gmaps: `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lon}&travelmode=walking`, id: `${o.osm_type}/${o.osm_id}`, d, walkMin: estWalkMin(d), type: rowStores.has(chain) ? 'chain' : 'shop', hasProducts: rowStores.has(chain), productCount: countsByChain[chain] ?? 0, rankableCount: rankableByChain[chain] ?? 0, osm: `${o.osm_type}/${o.osm_id}` } }) })())
      .sort((a, b) => a.d - b.d)
    const inR = all.filter(s => s.d <= loc.radius)
    const mine = all.filter(s => my.includes(s.id))
    const delivery = wf?.delivery ?? []
    /** sensecheck 18: delivers_4020 aus den Zeilendaten ist die einzige Quelle; stores_linz_walk.json → delivery nur, wenn ein Anbieter dort gar keine Angabe hat. */
    const deliversHere = (p: string): boolean | null => { const x = byStore[p.normalize('NFC')] ?? byStore[p]; if (x) return x.delivers_4020 === true ? true : x.delivers_4020 === null ? null : false; const w = delivery.find(d => d.name.normalize('NFC') === p.normalize('NFC')); return w ? w.delivers_4020 : null }
    const myChains = new Set([...mine.filter(s => s.hasProducts).map(s => s.chain), ...online.filter(p => my.includes(onlineId(p)) && deliversHere(p) !== false)])
    const nearestByChain: Record<string, number> = {}
    all.forEach(s => { if (s.hasProducts && nearestByChain[s.chain] == null) nearestByChain[s.chain] = s.d })
    return { all, inR, mine, my, myChains, loc, delivery, deliversHere, online, byStore, countsByChain, rankableByChain, generated: wf?.generated ?? null, loaded: !!wf, distOf: (r: Row) => nearestByChain[r.store] ?? null }
  }, [wf, prov, osm, loc, my, rowStores, countsByChain, rankableByChain, byStore, online])
}
