import { useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, SortModelItem } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { Columns3, Search, Save, X, GitCompare, SlidersHorizontal } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useFilter, makePred, type F } from '@/components/FilterPanel'
import { FacetSidebar, ActiveChips, walkMin } from '@/components/FacetSidebar'
import { Sheet } from '@/components/ui'
import { isReadyMeal, pricePerPortion, lastPriceDate } from '@/app/meal'
import { valueScore, useCfg } from '@/app/scoring'
import { ONLINE } from '@/app/shops'
import { StoreLogo } from '@/components/product'
import { useApp, useLocal, useHashState, fmt, fmtDist, scoreColor, type Row } from '@/lib'
import { useNearShops } from '@/app/shops'

type C = { k: string; h: string; w?: number; d?: number; def?: boolean; num?: boolean }
const COLS: C[] = [
  { k: 'name', h: 'Produkt', w: 260, def: true }, { k: 'store', h: 'Anbieter', w: 120, def: true }, { k: 'brandN', h: 'Marke', w: 130, def: true },
  { k: 'cat', h: 'Kategorie', w: 150, def: true }, { k: 'score', h: 'Health-Score', w: 110, d: 0, def: true, num: true },
  { k: 'price', h: 'Preis €', w: 90, d: 2, def: true, num: true }, { k: 'pPor', h: '€/Portion', w: 95, d: 2, def: true, num: true }, { k: 'value', h: 'Preis-Leistung', w: 100, d: 1, def: true, num: true }, { k: 'avail', h: 'Verfügbarkeit', w: 150, def: true }, { k: 'p100g', h: '€/100 g', w: 90, d: 2, num: true },
  { k: 'kcal', h: 'kcal/100 g', w: 100, d: 0, def: true, num: true }, { k: 'p100', h: 'Protein/100 g', w: 110, d: 1, def: true, num: true },
  { k: 'sugar', h: 'Zucker/100 g', w: 110, d: 1, num: true }, { k: 'salt', h: 'Salz/100 g', w: 100, d: 2, def: true, num: true },
  { k: 'sat', h: 'Ges. Fett/100 g', w: 120, d: 1, num: true }, { k: 'fib', h: 'Ballastst./100 g', w: 120, d: 1, num: true },
  { k: 'ns', h: 'Nutri-Score', w: 100, def: true }, { k: 'nova', h: 'NOVA', w: 80, num: true }, { k: 'diet', h: 'Veg.', w: 90 },
  { k: 'dist', h: 'Gehzeit', w: 95, def: true, num: true }, { k: 'size', h: 'Größe g', w: 90, d: 0, num: true },
  { k: 'eur10p', h: '€/10 g Protein', w: 120, d: 2, num: true }, { k: 'pack', h: 'Verpackung', w: 150 }, { k: 'herst', h: 'Hersteller', w: 180 }, { k: 'pstat', h: 'Preisstand', w: 110 },
]
type SavedView = { f: F; cols: string[]; sort: SortModelItem[]; so?: string }
const SORTS: [string, string, (r: any) => number | null, 1 | -1][] = [['value', 'Preis-Leistung (je Portion)', r => r.value, -1], ['score', 'Health-Score', r => r.score, -1], ['pPor', 'Preis pro Portion', r => r.pPor, 1], ['price', 'Preis', r => r.price, 1], ['p100g', 'Preis pro 100 g', r => r.p100g, 1]]
export const availOf = (store: string) => store === 'Gurkerl' ? 'nicht lieferbar nach Linz' : ONLINE.includes(store) ? 'Online / Lieferung' : 'Kette führt es'
const veg = (r: Row) => r.vegan || r.cprot?.includes('vegan') ? 'vegan' : r.cprot?.includes('vegetarisch') ? 'vegetarisch' : ''

export default function Tabelle() {
  const { R, D, open, dark, compare, setCompare } = useApp()
  const { distOf } = useNearShops()
  const cfg = useCfg(); const [f, setF] = useFilter(); const [q, setQ] = useHashState<string>('q', ''); const [so, setSo] = useHashState<string>('so', 'value'); const [allFood, setAllFood] = useHashState<string>('lm', ''); const [side, setSide] = useState(false)
  const [cols, setCols] = useLocal<string[]>('fg-tab-cols', COLS.filter(c => c.def).map(c => c.k))
  const [views, setViews] = useLocal<Record<string, SavedView>>('fg-tab-views', {}); const [vn, setVn] = useState('')
  const grid = useRef<AgGridReact<any>>(null)
  const konzOf = useMemo(() => { const m: Record<string, string> = {}; (D.producers || []).forEach((p: any) => { if (p.group && !/unverified/i.test(p.group)) m[p.slug] = String(p.group).replace(/\(.*?\)/g, '').trim() }); return (r: Row) => r.prodSlug ? m[r.prodSlug] ?? null : null }, [D])
  const pred = useMemo(() => makePred(f, { konzOf, dist: distOf }), [f, konzOf, distOf])
  const base = useMemo(() => R.filter(r => !r.nonfood && !r.store.startsWith('unbekannt') && (allFood ? true : isReadyMeal(r))).map(r => { const pp = pricePerPortion(r); return { ...r, pPor: pp } }), [R, allFood])
  const rows = useMemo(() => { const qq = q.toLowerCase(); const sd = SORTS.find(x => x[0] === so) ?? SORTS[0]; return base.filter(r => pred(r) && (!qq || `${r.name} ${r.brandN} ${r.herst}`.toLowerCase().includes(qq)))
    .map(r => ({ ...r, cat: [...(r.cprot || []), ...(r.cdish || [])].join(', '), diet: veg(r), dist: distOf(r), ns: r.ns && r.ns !== 'unknown' ? r.ns.toUpperCase() : null, value: valueScore(r), avail: availOf(r.store) }))
    .sort((a, b) => { const x = sd[2](a), y = sd[2](b); return x == null ? (y == null ? 0 : 1) : y == null ? -1 : (x - y) * sd[3] }) }, [base, pred, q, distOf, so, cfg])
  const updated = useMemo(() => lastPriceDate(R), [R])
  const ctx = useMemo(() => ({ konzOf, dist: distOf }), [konzOf, distOf])
  const colDefs = useMemo<ColDef[]>(() => [
    { headerName: '', width: 44, pinned: 'left', sortable: false, cellRenderer: (p: any) => <input type="checkbox" aria-label="vergleichen" checked={compare.includes(p.data.id)} onChange={() => setCompare(compare.includes(p.data.id) ? compare.filter(x => x !== p.data.id) : [...compare, p.data.id])} /> },
    ...COLS.map(c => ({ field: c.k, headerName: c.h, width: c.w, hide: !cols.includes(c.k), pinned: c.k === 'name' && innerWidth > 640 ? 'left' as const : undefined, type: c.num ? 'numericColumn' : undefined,
      valueFormatter: c.k === 'dist' ? (p: any) => p.value == null ? '–' : `~${walkMin(p.value)} min · ${fmtDist(p.value)}` : c.d != null ? (p: any) => fmt(p.value, c.d) : undefined,
      cellRenderer: c.k === 'store' ? (p: any) => <span className="flex items-center gap-1.5"><StoreLogo store={p.value} size={16} />{p.value}</span>
        : c.k === 'score' ? (p: any) => p.value == null ? '–' : <b style={{ color: scoreColor(p.value) }}>{fmt(p.value, 0)}</b>
        : c.k === 'name' ? (p: any) => <button className="truncate text-left hover:underline" onClick={() => open(p.data.id)}>{p.value}</button> : undefined,
      comparator: c.num ? (a: any, b: any, _x: any, _y: any, desc: boolean) => a == null && b == null ? 0 : a == null ? (desc ? -1 : 1) : b == null ? (desc ? 1 : -1) : a - b : undefined })),
  ], [cols, compare, setCompare, open])
  const saveView = () => { if (!vn.trim()) return; setViews({ ...views, [vn.trim()]: { f, cols, sort: (grid.current?.api.getColumnState() ?? []).filter(s => s.sort).map(s => ({ colId: s.colId, sort: s.sort! })), so } }); setVn('') }
  const loadView = (v: SavedView) => { setF(v.f); if (v.so) setSo(v.so); setCols(v.cols); setTimeout(() => grid.current?.api.applyColumnState({ state: v.sort, defaultState: { sort: null } }), 50) }
  const sidebar = <FacetSidebar base={base} f={f} set={setF} ctx={ctx} />
  return <div className="space-y-3">
    <div><h1 className="text-xl font-bold tracking-tight">Fertiggerichte finden & vergleichen</h1><p className="text-sm text-muted-foreground">Filter wirken sofort und lassen sich kombinieren · Zahlen = Treffer bei den übrigen Filtern · Link teilen übernimmt Filter & Sortierung{updated && <> · Preise zuletzt aktualisiert: <b>{new Date(updated).toLocaleDateString('de-AT')}</b></>}</p></div>
    <div className="grid gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="hidden lg:block"><div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">{sidebar}</div></aside>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="lg:hidden" onClick={() => setSide(true)}><SlidersHorizontal className="size-4" />Filter</Button>
          <div className="relative min-w-[160px] flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Suche: Name, Marke, Hersteller…" className="w-full pl-8" /></div>
          <label className="flex items-center gap-1.5 text-xs"><span className="text-muted-foreground">Sortieren:</span><select value={so} onChange={e => setSo(e.target.value)} className="h-9 rounded-md border bg-transparent px-2 text-sm">{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <Popover><PopoverTrigger asChild><Button size="sm"><Columns3 className="size-4" />Spalten ({cols.length})</Button></PopoverTrigger>
            <PopoverContent align="end" className="max-h-[60vh] w-64 overflow-y-auto"><div className="mb-2 flex justify-between text-xs"><button className="underline" onClick={() => setCols(COLS.map(c => c.k))}>alle</button><button className="underline" onClick={() => setCols(COLS.filter(c => c.def).map(c => c.k))}>Standard</button></div>
              {COLS.map(c => <label key={c.k} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={cols.includes(c.k)} onChange={() => setCols(cols.includes(c.k) ? cols.filter(x => x !== c.k) : [...cols, c.k])} />{c.h}</label>)}</PopoverContent></Popover>
          <Popover><PopoverTrigger asChild><Button size="sm"><Save className="size-4" />Ansichten ({Object.keys(views).length})</Button></PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-2"><div className="flex gap-2"><Input value={vn} onChange={e => setVn(e.target.value)} placeholder="Name der Ansicht" /><Button size="sm" className="h-9" onClick={saveView} disabled={!vn.trim()}>Speichern</Button></div>
              <p className="text-[11px] text-muted-foreground">Speichert Filter, Spalten und Sortierung lokal in diesem Browser.</p>
              {Object.entries(views).map(([k, v]) => <div key={k} className="flex items-center justify-between rounded border px-2 py-1 text-sm"><button className="hover:underline" onClick={() => loadView(v)}>{k}</button><button aria-label="löschen" onClick={() => { const c = { ...views }; delete c[k]; setViews(c) }}><X className="size-3.5" /></button></div>)}</PopoverContent></Popover>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs"><span className="font-semibold">{rows.length} Fertiggerichte{allFood && ' & Lebensmittel'}</span>
          <label className="flex items-center gap-1.5 text-muted-foreground"><input type="checkbox" checked={!!allFood} onChange={e => setAllFood(e.target.checked ? '1' : '')} />auch normale Lebensmittel zeigen</label></div>
        <ActiveChips f={f} set={setF} />
        <div className={dark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz'} style={{ height: 'min(72vh, 900px)', width: '100%' }}>
          <AgGridReact ref={grid} rowData={rows} columnDefs={colDefs} getRowId={p => String(p.data.id)} rowHeight={36} animateRows={false} defaultColDef={{ sortable: true, resizable: true }} rowBuffer={20} />
        </div>
      </div>
    </div>
    {compare.length > 0 && <div className="fixed bottom-16 left-1/2 z-40 -translate-x-1/2"><Button className="h-11 rounded-full px-5 shadow-lg" onClick={() => { location.hash = `tab=vergleich&cmp=${compare.join('.')}` }}><GitCompare className="size-4" />Vergleichstabelle öffnen ({compare.length}/4)</Button></div>}
    <Sheet open={side} onClose={() => setSide(false)} side="bottom" title={`Filter · ${rows.length} Treffer`}>{sidebar}</Sheet>
  </div>
}
