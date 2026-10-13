import { useEffect, useState, useSyncExternalStore } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button, Input, Select } from '@/components/ui'

export const DEFAULT_LOC = { addr: 'Gruberstraße 19, 4020 Linz', lat: 48.3102805, lon: 14.2992021 }
export type Loc = { addr: string; lat: number; lon: number; radius: number; approx?: boolean }
export const RADII = [500, 1000, 2000, 5000, 10000, 25000]
const KEY = 'fg-loc', MYKEY = 'fg-myshops', GEO = 'fg-geocache'

const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())
const sub = (f: () => void) => { subs.add(f); const h = (e: StorageEvent) => { if (e.key === KEY || e.key === MYKEY) f() }; addEventListener('storage', h); return () => { subs.delete(f); removeEventListener('storage', h) } }
let locSnap: Loc = read(KEY, { ...DEFAULT_LOC, radius: 2000 })
let mySnap: string[] = read(MYKEY, [])
export const setLoc = (l: Loc) => { locSnap = l; localStorage.setItem(KEY, JSON.stringify(l)); emit() }
export const setMyShops = (v: string[]) => { mySnap = v; localStorage.setItem(MYKEY, JSON.stringify(v)); emit() }
export const useLoc = () => useSyncExternalStore(sub, () => locSnap)
export const useMyShops = () => useSyncExternalStore(sub, () => mySnap)
export const toggleMyShop = (id: string) => setMyShops(mySnap.includes(id) ? mySnap.filter(x => x !== id) : [...mySnap, id])

export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

let lastReq = 0
/** Nominatim (OSM): gecacht in localStorage, max. 1 Anfrage/s, Fallback auf Standard-Koordinaten. */
export async function geocode(q: string): Promise<{ lat: number; lon: number; approx: boolean }> {
  const k = q.trim().toLowerCase(), cache = read<Record<string, { lat: number; lon: number }>>(GEO, {})
  if (k === DEFAULT_LOC.addr.toLowerCase()) return { lat: DEFAULT_LOC.lat, lon: DEFAULT_LOC.lon, approx: false }
  if (cache[k]) return { ...cache[k], approx: false }
  const wait = 1100 - (Date.now() - lastReq); if (wait > 0) await new Promise(r => setTimeout(r, wait)); lastReq = Date.now()
  try {
    const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=at,de&accept-language=de&q=${encodeURIComponent(q)}`
    const res = await fetch(u, { headers: { Accept: 'application/json' } }); const j = await res.json()
    if (!Array.isArray(j) || !j[0]) throw new Error('not found')
    const v = { lat: +j[0].lat, lon: +j[0].lon }; cache[k] = v; localStorage.setItem(GEO, JSON.stringify(cache)); return { ...v, approx: false }
  } catch { return { lat: DEFAULT_LOC.lat, lon: DEFAULT_LOC.lon, approx: true } }
}

export const fmtR = (m: number) => m < 1000 ? `${m} m` : `${m / 1000} km`

export function LocationControl({ onOpenMap }: { onOpenMap?: () => void }) {
  const loc = useLoc(); const [q, setQ] = useState(loc.addr); const [busy, setBusy] = useState(false); const [open, setOpen] = useState(false)
  useEffect(() => setQ(loc.addr), [loc.addr])
  const submit = async (e?: React.FormEvent) => { e?.preventDefault(); if (!q.trim()) return; setBusy(true); const g = await geocode(q); setBusy(false); setLoc({ ...loc, addr: q.trim(), ...g }); setOpen(false) }
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-9 max-w-[11rem] gap-1.5 px-2 sm:max-w-[16rem]" aria-label="Standort ändern">
      <MapPin className="size-4 shrink-0 text-emerald-600" /><span className="hidden truncate text-xs sm:inline">{loc.addr.split(',')[0]}</span><span className="text-xs text-muted-foreground">{fmtR(loc.radius)}</span>
    </Button></PopoverTrigger>
    <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] space-y-3">
      <form onSubmit={submit} className="space-y-2">
        <label className="text-xs font-medium" htmlFor="fg-addr">Adresse</label>
        <div className="flex gap-2"><Input id="fg-addr" value={q} onChange={e => setQ(e.target.value)} placeholder="Straße Nr, PLZ Ort" /><Button type="submit" size="sm" className="h-9" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : 'OK'}</Button></div>
        {loc.approx && <p className="text-xs text-amber-600">Adresse nicht gefunden – Standard-Standort wird verwendet.</p>}
      </form>
      <div className="space-y-1"><label className="text-xs font-medium" htmlFor="fg-rad">Umkreis</label>
        <Select id="fg-rad" value={loc.radius} onChange={e => setLoc({ ...loc, radius: +e.target.value })} className="w-full">{RADII.map(r => <option key={r} value={r}>{fmtR(r)}</option>)}</Select></div>
      <div className="flex justify-between gap-2"><Button variant="ghost" size="sm" onClick={() => { setQ(DEFAULT_LOC.addr); setLoc({ ...DEFAULT_LOC, radius: loc.radius }) }}>Zurücksetzen</Button>
        {onOpenMap && <Button size="sm" onClick={() => { setOpen(false); onOpenMap() }}>Karte & Meine Shops</Button>}</div>
      <p className="text-[10px] text-muted-foreground">Geokodierung: © OpenStreetMap / Nominatim. Nur lokal gespeichert.</p>
    </PopoverContent>
  </Popover>
}
