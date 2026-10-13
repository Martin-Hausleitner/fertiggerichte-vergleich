import { useMemo } from 'react'
import { Euro, Beef, Grid3x3, LayoutDashboard, Layers, Activity, PieChart, Network, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StoreLogo } from '@/components/product'
import { AreaDist, HeatGrid, Radial, Sparkline, StackedBars, TreemapChart, histogram, median, nums } from '@/components/x/charts'
import { colorOf, CHART_COLORS } from '@/components/x/palette'
import { STAGES } from '@/components/info'
import { fmt, useApp, type Row } from '@/lib'

function Panel({ icon: I, title, desc, children, className }: { icon: typeof Euro; title: string; desc?: string; children: React.ReactNode; className?: string }) {
  return <Card className={'shadow-none ' + (className ?? '')}><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><I className="size-4" />{title}</CardTitle>{desc && <CardDescription>{desc}</CardDescription>}</CardHeader><CardContent>{children}</CardContent></Card>
}

export default function Dashboard() {
  const { R } = useApp()
  const rows = useMemo(() => R.filter(r => !r.nonfood && !r.store.startsWith('unbekannt')), [R])
  const d = useMemo(() => {
    const by = new Map<string, Row[]>(); rows.forEach(r => by.set(r.store, [...(by.get(r.store) ?? []), r]))
    const stores = [...by].sort((a, b) => b[1].length - a[1].length).map(x => x[0])
    const stages = STAGES.map(s => s[2])
    const stack = stores.map(s => ({ name: s, ...Object.fromEntries(STAGES.map(([k, , l]) => [l, by.get(s)!.filter(r => r.stage === k).length])) }))
    const cats = (() => { const m = new Map<string, number>(); rows.forEach(r => r.cprot?.forEach(c => m.set(c, (m.get(c) ?? 0) + 1))); return [...m].sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]) })()
    const heat = (s: string, c: string) => median(nums(by.get(s)!.filter(r => r.cprot?.includes(c)), r => r.eur10p))
    const brands = (() => { const m = new Map<string, number>(); rows.forEach(r => m.set(r.brandN, (m.get(r.brandN) ?? 0) + 1)); return [...m].map(([name, size]) => ({ name, size })).sort((a, b) => b.size - a.size).slice(0, 40) })()
    const ns = ['A', 'B', 'C', 'D', 'E'].map(g => rows.filter(r => String(r.ns ?? '').toUpperCase() === g).length)
    const nsTot = ns.reduce((a, b) => a + b, 0)
    // Preis-Aktualität: Datum aus der Preisquelle (psrc), relativ zum jüngsten Datum im Datensatz
    const FRESH = ['≤ 1 Tag', '≤ 7 Tage', '≤ 90 Tage', 'älter', 'ohne Datum']
    const dOf = (r: Row) => { const m = /20\d\d-\d\d-\d\d/.exec(r.psrc ?? ''); return m ? Date.parse(m[0]) : null }
    const ref = Math.max(...rows.map(dOf).filter((x): x is number => x != null))
    const bucket = (r: Row) => { const t = dOf(r); if (t == null) return FRESH[4]; const age = (ref - t) / 864e5; return age <= 1 ? FRESH[0] : age <= 7 ? FRESH[1] : age <= 90 ? FRESH[2] : FRESH[3] }
    const fresh = stores.map(s => { const o: Record<string, string | number> = { name: s }; FRESH.forEach(k => { o[k] = 0 }); by.get(s)!.forEach(r => { const b = bucket(r); o[b] = (o[b] as number) + 1 }); return o })
    const freshTot = FRESH.map(k => rows.filter(r => bucket(r) === k).length)
    const refDate = Number.isFinite(ref) ? new Date(ref).toLocaleDateString('de-AT') : '–'
    return { by, stores, stages, stack, cats, heat, brands, ns, nsTot, FRESH, fresh, freshTot, refDate }
  }, [rows])
  return <div className="space-y-4">
    <h2 className="flex items-center gap-2 text-xl font-bold"><LayoutDashboard className="size-5" />Dashboard</h2>
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel icon={Euro} title="Preisverteilung" desc="Anzahl Gerichte je Preisstufe"><AreaDist data={histogram(nums(rows, r => r.price), 30, 15)} label="Gerichte" unit="€" /></Panel>
      <Panel icon={Beef} title="€ pro 10 g Protein" desc="niedriger = günstigeres Protein"><AreaDist data={histogram(nums(rows, r => r.eur10p), 30, 3)} label="Gerichte" unit="€" color={CHART_COLORS[1]} /></Panel>
    </div>
    <Panel icon={Clock} title="Preis-Aktualität je Laden" desc={`Alter des Preises laut Quelle, Stichtag ${d.refDate} · ${d.FRESH.map((k, i) => `${k}: ${d.freshTot[i]}`).join(' · ')}`}><StackedBars data={d.fresh} keys={d.FRESH} /></Panel>
    <Panel icon={Layers} title="Gänge je Laden" desc="gestapelt nach Fertigstufe"><StackedBars data={d.stack} keys={d.stages} /></Panel>
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Panel icon={Grid3x3} title="Heatmap: Median € / 10 g Protein" desc="Laden × Proteinquelle · dunkler = günstiger"><HeatGrid rows={d.stores} cols={d.cats} get={d.heat} fmtV={v => fmt(v, 2)} lowGood /></Panel>
      <Panel icon={PieChart} title="Nutri-Score-Anteile" desc={`${d.nsTot} Gerichte mit Nutri-Score`}><div className="flex flex-wrap justify-center gap-2">{['A', 'B', 'C', 'D', 'E'].map((g, i) => <div key={g} className="flex flex-col items-center"><Radial value={d.nsTot ? d.ns[i] / d.nsTot * 100 : 0} label={`% ${g}`} size={92} color={['#15803d', '#4d7c0f', '#a16207', '#c2410c', '#b91c1c'][i]} /></div>)}</div></Panel>
    </div>
    <Panel icon={Network} title="Marken nach Anzahl Gerichte" desc="Treemap der 40 größten Marken"><TreemapChart data={d.brands} height={320} /></Panel>
    <Panel icon={Activity} title="Läden im Überblick" desc="Sparkline = Preisverteilung 0–15 €">
      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Laden</TableHead><TableHead className="text-right">Gerichte</TableHead><TableHead className="text-right">Median €</TableHead><TableHead className="text-right">€/10 g P</TableHead><TableHead className="text-right">Health</TableHead><TableHead>Preise</TableHead></TableRow></TableHeader>
        <TableBody>{d.stores.map(s => { const rs = d.by.get(s)!; return <TableRow key={s}><TableCell><div className="flex items-center gap-2"><span className="h-6 w-1 rounded" style={{ background: colorOf(s) }} /><StoreLogo store={s} size={22} /><span className="hidden font-medium sm:inline">{s}</span></div></TableCell>
          <TableCell className="text-right tabular-nums">{rs.length}</TableCell><TableCell className="text-right tabular-nums">{fmt(median(nums(rs, r => r.price)), 2)}</TableCell><TableCell className="text-right tabular-nums">{fmt(median(nums(rs, r => r.eur10p)), 2)}</TableCell><TableCell className="text-right tabular-nums">{fmt(median(nums(rs, r => r.score)), 0)}</TableCell>
          <TableCell><Sparkline data={histogram(nums(rs, r => r.price), 15, 15).map(x => x.n)} color={colorOf(s)} /></TableCell></TableRow> })}</TableBody></Table></div>
    </Panel>
  </div>
}
