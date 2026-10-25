import { useMemo, useState } from 'react'
import { Scale, Search, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Input } from '@/components/ui'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { BrandLogo, StoreLogo, ZoomImage } from '@/components/product'
import { fmt, useApp, type Row } from '@/lib'
import { isReadyMeal, isStalePrice } from '@/app/meal'

/** Gleiches Produkt in mehreren Läden: gruppiert nach Marke + Namens-Tokens + Packungsgröße (±10 g), zeigt günstigsten Laden und Ersparnis. */
const STOP = new Set('tiefgekühlt tk bio der die das mit und in im nach art pizza g kg stk stück 1er'.split(' '))
const tokens = (s: string) => s.toLowerCase().replace(/[^a-zäöüß0-9 ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w) && !/^\d+g?$/.test(w)).sort()
type Group = { key: string; rows: Row[]; min: number; max: number; save: number; pct: number }

export function PriceComparePanel() {
  const { R, open } = useApp()
  const [sort, setSort] = useState('pct')
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const m = new Map<string, Row[]>()
    for (const r of R) {
      if (r.price == null || r.price <= 0 || !r.size || r.nonfood || r.store.startsWith('unbekannt') || r.delivers_4020 === false || r.pstat === 'Preis veraltet' || isStalePrice(r as any) || !isReadyMeal(r as any)) continue
      const k = `${(r.brandN || r.brand || '').toLowerCase()}|${[...new Set(tokens(r.name))].join(' ')}|${Math.round(r.size / 10)}`
      const a = m.get(k); if (a) a.push(r); else m.set(k, [r])
    }
    const out: Group[] = []
    for (const [key, rs] of m) {
      // je Laden nur das günstigste Angebot
      const best = new Map<string, Row>()
      for (const r of rs) { const b = best.get(r.store); if (!b || r.price! < b.price!) best.set(r.store, r) }
      if (best.size < 2) continue
      const rows = [...best.values()].sort((a, b) => a.price! - b.price!)
      const min = rows[0].price!, max = rows[rows.length - 1].price!
      out.push({ key, rows, min, max, save: max - min, pct: max ? (max - min) / max * 100 : 0 })
    }
    return out
  }, [R])
  const shown = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return groups.filter(g => !ql || g.rows.some(r => (r.name + ' ' + r.brand).toLowerCase().includes(ql)))
      .sort((a, b) => sort === 'pct' ? b.pct - a.pct : sort === 'eur' ? b.save - a.save : b.rows.length - a.rows.length).slice(0, 12)
  }, [groups, q, sort])
  const wins = useMemo(() => { const c = new Map<string, number>(); for (const g of groups) if (g.save > 0) c.set(g.rows[0].store, (c.get(g.rows[0].store) ?? 0) + 1); return [...c].sort((a, b) => b[1] - a[1]) }, [groups])
  return <Card className="min-w-0 overflow-hidden shadow-none" data-testid="price-compare">
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-base"><Scale className="size-4 text-sky-600" />Gleiches Produkt – wo am günstigsten?</CardTitle>
      <CardDescription>{groups.length} Produkte in mehreren Läden (gleiche Marke, gleicher Name, gleiche Packungsgröße) · am öftesten am günstigsten: {wins.slice(0, 4).map(([s, n]) => `${s} ${n}×`).join(' · ') || '–'}</CardDescription>
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <ToggleGroup type="single" variant="outline" size="sm" value={sort} onValueChange={v => v && setSort(v)} aria-label="Sortierung">
          <ToggleGroupItem value="pct" aria-label="Nach Ersparnis in Prozent">Ersparnis %</ToggleGroupItem>
          <ToggleGroupItem value="eur" aria-label="Nach Ersparnis in Euro">Ersparnis €</ToggleGroupItem>
          <ToggleGroupItem value="n" aria-label="Nach Anzahl Läden">Läden</ToggleGroupItem>
        </ToggleGroup>
        <div className="relative w-full min-w-0 sm:w-56"><Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Produkt suchen…" className="h-8 pl-7" aria-label="Produkt suchen" /></div>
      </div>
    </CardHeader>
    <CardContent>
      {!shown.length ? <p className="py-6 text-center text-sm text-muted-foreground">Kein Produkt in mehreren Läden für diese Suche.</p> :
        <ul className="divide-y">
          {shown.map(g => { const c = g.rows[0]; return <li key={g.key} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <ZoomImage src={c.img} className="size-11 shrink-0" />
              <div className="min-w-0">
                <button type="button" onClick={() => open(c.id)} className="block w-full truncate text-left text-sm font-semibold hover:underline" title={c.name}>{c.name}</button>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><BrandLogo r={c} size={16} /><span className="truncate">{fmt(c.size, 0)} g · {g.rows.length} Läden</span></div>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {g.rows.map((r, i) => <button key={r.id} type="button" onClick={() => open(r.id)} title={`${r.store}: ${fmt(r.price, 2)} €${r.pstat ? ' · ' + r.pstat : ''}`}
                className={'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs tabular-nums ' + (i === 0 ? 'border-emerald-600/50 bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'text-muted-foreground hover:bg-muted')}>
                <StoreLogo store={r.store} size={14} />{fmt(r.price, 2)} €</button>)}
              {g.save > 0 && <Badge variant="outline" className="gap-1 border-sky-600/40 tabular-nums text-sky-700 dark:text-sky-300"><TrendingDown className="size-3" />−{fmt(g.save, 2)} € ({fmt(g.pct, 0)} %)</Badge>}
            </div>
          </li> })}
        </ul>}
    </CardContent>
  </Card>
}
