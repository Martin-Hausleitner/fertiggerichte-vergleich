import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { StoreLogo } from '@/components/product'
import { makePred, GANG, type F } from '@/components/FilterPanel'
import { cn, fmt, type Row } from '@/lib'

type Ctx = { konzOf: (r: Row) => string | null; dist: (r: Row) => number | null }
type Facet = { k: keyof F & string; l: string; vals: (r: Row) => (string | null | undefined)[]; label?: (v: string) => React.ReactNode; open?: boolean; order?: string[] }
const vegOf = (r: Row) => [r.bio ? 'bio' : null, r.vegan || r.cprot?.includes('vegan') ? 'vegan' : null, r.vegan || r.cprot?.includes('vegan') || r.cprot?.includes('vegetarisch') ? 'vegetarisch' : null]
export const FACETS: Facet[] = [
  { k: 'chain', l: 'Anbieter / Shop', vals: r => [r.store], label: v => <span className="inline-flex items-center gap-1.5"><StoreLogo store={v} size={14} />{v}</span>, open: true },
  { k: 'cat', l: 'Kategorie', vals: r => [...(r.cprot || []), ...(r.cdish || [])], open: true },
  { k: 'gang', l: 'Gang', vals: r => [(r as any).gang], label: v => GANG.find(g => g[0] === v)?.slice(1).join(' ') ?? v },
  { k: 'diet', l: 'Ernährung', vals: vegOf, label: v => v === 'bio' ? 'Bio' : v, open: true },
  { k: 'ns', l: 'Nutri-Score', vals: r => [r.ns && r.ns !== 'unknown' ? r.ns.toUpperCase() : null], order: ['A', 'B', 'C', 'D', 'E'] },
  { k: 'nova', l: 'NOVA-Gruppe', vals: r => [(r as any).nova == null ? null : String((r as any).nova)], order: ['1', '2', '3', '4'], label: v => `NOVA ${v}` },
  { k: 'brand', l: 'Marke', vals: r => [r.noBrand ? null : r.brandN] },
  { k: 'pack', l: 'Verpackung', vals: r => [r.pack] },
]
export const RANGES: [string, string, string, number, number][] = [['price', 'Preis', '€', 0.5, 0], ['pPor', 'Preis / Portion', '€', 0.25, 2], ['p100g', 'Preis / 100 g', '€', 0.1, 2], ['kcal', 'kcal / 100 g', 'kcal', 10, 0], ['p100', 'Protein / 100 g', 'g', 1, 0], ['score', 'Health-Score', '', 1, 0], ['sugar', 'Zucker / 100 g', 'g', 0.5, 1], ['salt', 'Salz / 100 g', 'g', 0.1, 1]]

function Group({ title, n, open: o0 = false, children }: { title: string; n?: number; open?: boolean; children: React.ReactNode }) {
  const [o, setO] = useState(o0)
  return <div className="border-b py-2"><button onClick={() => setO(!o)} aria-expanded={o} className="flex w-full items-center justify-between text-left text-sm font-semibold">
    <span>{title}{n ? <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{n}</span> : null}</span><ChevronDown className={cn('size-4 transition', o && 'rotate-180')} /></button>
    {o && <div className="mt-2">{children}</div>}</div>
}

function RangeSlider({ k, l, u, step, d, base, f, set }: { k: string; l: string; u: string; step: number; d: number; base: Row[]; f: F; set: (f: F) => void }) {
  const [lo0, hi0] = useMemo(() => { const v = base.map(r => (r as any)[k]).filter((x: any) => typeof x === 'number').sort((a: number, b: number) => a - b); if (!v.length) return [0, 0]; return [Math.floor(v[0] / step) * step, Math.ceil(v[Math.floor((v.length - 1) * 0.99)] / step) * step] }, [base, k, step])
  const cur = f.r?.[k]; const [v, setV] = useState<number[]>([cur?.[0] ?? lo0, cur?.[1] ?? hi0])
  useEffect(() => setV([cur?.[0] ?? lo0, cur?.[1] ?? hi0]), [cur?.[0], cur?.[1], lo0, hi0])
  if (hi0 <= lo0) return null
  const commit = (x: number[]) => { const r = { ...(f.r || {}) }; r[k] = [x[0] <= lo0 ? null : x[0], x[1] >= hi0 ? null : x[1]]; set({ ...f, r }) }
  return <div className="py-2"><div className="mb-2 flex justify-between text-xs"><span className="font-medium">{l}</span><span className="text-muted-foreground">{fmt(v[0], d)}–{fmt(v[1], d)}{v[1] >= hi0 ? '+' : ''} {u}</span></div>
    <Slider min={lo0} max={hi0} step={step} value={v} onValueChange={setV} onValueCommit={commit} aria-label={l} /></div>
}

function FacetList({ vals, c, sel, on, label }: { vals: string[]; c: Record<string, number>; sel: string[]; on: (v: string) => void; label?: (v: string) => React.ReactNode }) {
  const [all, setAll] = useState(false); const shown = all ? vals : vals.slice(0, 8)
  return <div className="space-y-0.5">{shown.map(v => { const n = c[v] ?? 0; const act = sel.includes(v)
    return <label key={v} className={cn('flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted', !n && !act && 'opacity-40')}>
      <input type="checkbox" className="accent-emerald-700" checked={act} onChange={() => on(v)} disabled={!n && !act} /><span className="min-w-0 flex-1 truncate">{label ? label(v) : v}</span><span className="text-xs tabular-nums text-muted-foreground">({n})</span></label> })}
    {vals.length > 8 && <button onClick={() => setAll(!all)} className="px-1 text-xs text-primary underline">{all ? 'weniger' : `alle ${vals.length} anzeigen`}</button>}</div>
}

const WALK = [5, 10, 15, 20] // Minuten; 80 m/min Gehgeschwindigkeit × 1,3 Umwegfaktor
export const walkMin = (m: number | null) => m == null ? null : Math.round(m * 1.3 / 80)

/** Geizhals-artige Facetten-Sidebar: Live-Trefferzahlen je Wert (bei allen übrigen aktiven Filtern), sofort wirksam, Zustand in der URL. */
export function FacetSidebar({ base, f, set, ctx }: { base: Row[]; f: F; set: (f: F) => void; ctx: Ctx }) {
  const counts = useMemo(() => Object.fromEntries(FACETS.map(fc => {
    const p = makePred({ ...f, [fc.k]: undefined }, ctx); const c: Record<string, number> = {}
    base.forEach(r => { if (!p(r)) return; new Set(fc.vals(r)).forEach(v => { if (v) c[v] = (c[v] ?? 0) + 1 }) })
    return [fc.k, c]
  })), [base, f, ctx])
  const distN = (m: number) => { const p = makePred({ ...f, dist: m }, ctx); return base.filter(p).length }
  return <div className="text-sm">
    <Group title="Gehzeit zur nächsten Filiale" n={f.dist != null ? 1 : 0} open>
      <div className="space-y-0.5">{[null, ...WALK].map(w => { const m = w == null ? null : Math.round(w * 80 / 1.3); const act = (f.dist ?? null) === m
        return <label key={w ?? 0} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted"><input type="radio" name="walk" className="accent-emerald-700" checked={act} onChange={() => set({ ...f, dist: m })} /><span className="flex-1">{w == null ? 'egal' : `≤ ${w} min zu Fuß`}</span>{m != null && <span className="text-xs text-muted-foreground">({distN(m)})</span>}</label> })}</div>
      <p className="mt-1 text-[11px] text-muted-foreground">Geschätzt aus Luftlinie ab deiner Adresse (×1,3, 4,8 km/h). Lieferdienste ohne Filiale fallen dabei heraus.</p></Group>
    {FACETS.map(fc => { const sel = (f[fc.k] as string[] | undefined) ?? []; const c = counts[fc.k] as Record<string, number>
      const all = new Set([...Object.keys(c), ...sel]); const vals = fc.order ? fc.order.filter(x => all.has(x)) : [...all].sort((a, b) => (c[b] ?? 0) - (c[a] ?? 0))
      if (!vals.length) return null
      return <Group key={fc.k} title={fc.l} n={sel.length} open={fc.open || sel.length > 0}><FacetList vals={vals} c={c} sel={sel} label={fc.label} on={v => set({ ...f, [fc.k]: sel.includes(v) ? sel.filter(x => x !== v) : [...sel, v] })} /></Group> })}
    <Group title="Preis & Nährwerte" open n={Object.values(f.r || {}).filter(x => x[0] != null || x[1] != null).length}>
      {RANGES.map(([k, l, u, st, d]) => <RangeSlider key={k} k={k} l={l} u={u} step={st} d={d} base={base} f={f} set={set} />)}</Group>
  </div>
}

/** Aktive Filter als entfernbare Chips. */
export function ActiveChips({ f, set }: { f: F; set: (f: F) => void }) {
  const chips: [string, () => void][] = []
  FACETS.forEach(fc => ((f[fc.k] as string[] | undefined) ?? []).forEach(v => chips.push([`${fc.l}: ${fc.k === 'gang' ? GANG.find(g => g[0] === v)?.[2] ?? v : v}`, () => set({ ...f, [fc.k]: (f[fc.k] as string[]).filter(x => x !== v) })])))
  ;(['stage', 'herst', 'konz', 'land', 'bl'] as const).forEach(k => (f[k] ?? []).forEach(v => chips.push([v, () => set({ ...f, [k]: f[k]!.filter(x => x !== v) })])))
  Object.entries(f.r || {}).forEach(([k, [lo, hi]]) => { if (lo != null || hi != null) { const L = RANGES.find(x => x[0] === k); chips.push([`${L?.[1] ?? k}: ${lo ?? '…'}–${hi ?? '…'} ${L?.[2] ?? ''}`, () => { const r = { ...f.r }; delete r[k]; set({ ...f, r }) }]) } })
  if (f.dist != null) chips.push([`≤ ${walkMin(f.dist)} min zu Fuß`, () => set({ ...f, dist: null })])
  if (!chips.length) return null
  return <div className="flex flex-wrap items-center gap-1.5">{chips.map(([l, rm], i) => <span key={i} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs">{l}<button onClick={rm} aria-label={`${l} entfernen`}><X className="size-3" /></button></span>)}
    <button onClick={() => set({})} className="text-xs text-muted-foreground underline">alle entfernen</button></div>
}
