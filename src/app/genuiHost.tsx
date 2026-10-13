import { useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { installGenUI, GenUIHost, useCustomSpec, type Action, type ProductQuery } from './genui'
import { toValueCfg } from './scoring'
import type { F } from '@/components/FilterPanel'
import type { Row } from '@/lib'

/** ProductQuery (GenUI) → Filter-/Hash-State der Produkttabelle. */
export function queryToHash(q: ProductQuery): Record<string, string> {
  const f: F = {}; const r: Record<string, [number | null, number | null]> = {}
  if (q.stores?.length) f.chain = q.stores
  if (q.stage?.length) f.stage = q.stage
  const diet = [q.vegan && 'vegan', q.vegetarian && 'vegetarisch', q.bio && 'bio'].filter(Boolean) as string[]; if (diet.length) f.diet = diet
  if (q.minScore != null) r.score = [q.minScore, null]
  if (q.maxPrice != null) r.price = [null, q.maxPrice]
  if (q.maxPricePerPortion != null) r.pPor = [null, q.maxPricePerPortion]
  if (q.minProtein100 != null) r.p100 = [q.minProtein100, null]
  if (q.maxKcal100 != null) r.kcal = [null, q.maxKcal100]
  if (q.maxSugar100 != null) r.sugar = [null, q.maxSugar100]
  if (q.maxSalt100 != null) r.salt = [null, q.maxSalt100]
  if (Object.keys(r).length) f.r = r
  const h: Record<string, string> = { tab: 'tabelle' }
  if (Object.keys(f).length) h.fx = encodeURIComponent(JSON.stringify(f))
  if (q.q) h.q = q.q
  const so: Record<string, string> = { value: 'value', score: 'score', pricePerPortion: 'pPor', price: 'price', ppk: 'p100g' }
  if (q.sort && so[q.sort]) h.so = so[q.sort]
  if (q.readyMealsOnly === false) h.lm = '1'
  return h
}
const setHash = (h: Record<string, string>) => { location.hash = new URLSearchParams(h).toString() }

/** Whitelist-Aktionen aus GenUI-Specs. Kein eval, nur https/relative URLs (Schema prüft). */
export function onGenUIAction(a: Action) {
  switch (a.type) {
    case 'setView': return window.goodChoice?.setView(a.view, a.params)
    case 'applyFilter': return setHash(queryToHash(a.query))
    case 'openProduct': { const h = Object.fromEntries(new URLSearchParams(location.hash.slice(1))); return setHash({ ...h, p: String(a.id) }) }
    case 'compare': return setHash({ tab: 'vergleich', cmp: a.ids.slice(0, 4).join('.') })
    case 'openUrl': { window.open(a.url, '_blank', 'noopener,noreferrer'); return }
  }
}

/** Installiert GenUI nach window.goodChoice; schaltet bei neuem Spec auf Tab „ki“. Standort wird NICHT übergeben. */
export function GenUIBridge({ getRows, tab, setTab }: { getRows: () => Row[]; tab: string; setTab: (t: string) => void }) {
  const spec = useCustomSpec()
  useEffect(() => {
    let stop: (() => void) | undefined
    const go = () => { if (!stop && window.goodChoice) stop = installGenUI({ getRows, onAction: onGenUIAction, getValueCfg: () => toValueCfg() }) }
    go(); addEventListener('goodchoice:ready', go)
    return () => { removeEventListener('goodchoice:ready', go); stop?.() }
  }, [])
  useEffect(() => { if (spec != null && tab !== 'ki') setTab('ki') }, [spec])
  return null
}

export default function KiAnsicht() {
  const spec = useCustomSpec()
  return <div className="space-y-3">
    <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight"><Sparkles className="size-5" />KI-Ansicht</h1>
    <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:bg-amber-950/30"><b>Datenschutz:</b> Wenn du einem KI-Assistenten (z. B. über den MCP-Server) Ernährungsziele oder Planwerte nennst, werden sie zu Tool-Argumenten und können an den Cloud-KI-Anbieter gelangen – das sind Gesundheitsdaten (Art. 9 DSGVO). Das ist deine Entscheidung; diese Seite sendet standardmäßig nichts.</p>
    {spec == null ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Noch keine KI-Ansicht. Ein Assistent kann über <code>window.goodChoice.renderCustomUI(spec)</code> oder den lokalen MCP-Server eine Ansicht senden.</p> : <GenUIHost />}
  </div>
}
