import { useMemo, useState } from 'react'
import { Trophy, Beef, Euro, Flame, Store as StoreIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Progress } from '@/components/ui/progress'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BrandLogo, StoreLogo, ZoomImage } from '@/components/product'
import { StackedBars, median, nums } from '@/components/x/charts'
import { STAGES } from '@/components/info'
import { fmt, useApp, type Row } from '@/lib'

/** Protein-Effizienz: Bestenliste nach g Protein/€, € je 10 g Protein oder g Protein je 100 kcal – filterbar nach Fertigstufe & Laden. */
const METRICS = [
  { key: 'ppe', label: 'g Protein / €', short: 'g/€', icon: Euro, get: (r: Row) => r.ppe, better: 'high' as const, d: 1 },
  { key: 'eur10p', label: '€ je 10 g Protein', short: '€/10 g', icon: Beef, get: (r: Row) => r.eur10p, better: 'low' as const, d: 2 },
  { key: 'p100k', label: 'g Protein / 100 kcal', short: 'g/100 kcal', icon: Flame, get: (r: Row) => r.p100k, better: 'high' as const, d: 1 },
]
const STAGE_KEYS = ['meal', 'stew', 'prot', 'side']

export function ProteinValuePanel() {
  const { R, open } = useApp()
  const [stage, setStage] = useState('meal')
  const [store, setStore] = useState('alle')
  const [mk, setMk] = useState('ppe')
  const m = METRICS.find(x => x.key === mk)!
  const base = useMemo(() => R.filter(r => r.rankable && !r.nonfood && !r.store.startsWith('unbekannt') && r.price != null), [R])
  const stores = useMemo(() => [...new Set(base.map(r => r.store))].sort((a, b) => a.localeCompare(b, 'de')), [base])
  const pool = useMemo(() => base.filter(r => (stage === 'alle' || r.stage === stage) && (store === 'alle' || r.store === store) && m.get(r) != null && m.get(r)! > 0), [base, stage, store, m])
  const top = useMemo(() => [...pool].sort((a, b) => m.better === 'high' ? m.get(b)! - m.get(a)! : m.get(a)! - m.get(b)!).slice(0, 12), [pool, m])
  const med = median(nums(pool, m.get))
  const best = top.length ? m.get(top[0])! : 0
  const worst = top.length ? m.get(top[top.length - 1])! : 0
  const pct = (v: number) => m.better === 'high' ? (best ? v / best * 100 : 0) : (v ? Math.max(8, best / v * 100) : 0)
  return <Card className="min-w-0 overflow-hidden shadow-none">
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-base"><Trophy className="size-4 text-amber-500" />Protein-Effizienz – Bestenliste</CardTitle>
      <CardDescription>Top 12 nach {m.label} · {pool.length} vergleichbare Gerichte · Median {fmt(med, m.d)} {m.short}{worst ? ` · Platz 12: ${fmt(worst, m.d)}` : ''}</CardDescription>
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <ToggleGroup type="single" variant="outline" size="sm" value={stage} onValueChange={v => v && setStage(v)} className="flex-wrap justify-start" aria-label="Fertigstufe">
          <ToggleGroupItem value="alle" aria-label="Alle Fertigstufen">Alle</ToggleGroupItem>
          {STAGES.filter(s => STAGE_KEYS.includes(s[0])).map(([k, e, l]) => <ToggleGroupItem key={k} value={k} aria-label={l} className="gap-1"><span aria-hidden>{e}</span><span className="hidden sm:inline">{l}</span></ToggleGroupItem>)}
        </ToggleGroup>
        <Select value={mk} onValueChange={setMk}>
          <SelectTrigger className="h-8 w-[190px]" aria-label="Kennzahl"><SelectValue /></SelectTrigger>
          <SelectContent>{METRICS.map(x => <SelectItem key={x.key} value={x.key}><span className="flex items-center gap-2"><x.icon className="size-3.5" />{x.label}</span></SelectItem>)}</SelectContent>
        </Select>
        <Select value={store} onValueChange={setStore}>
          <SelectTrigger className="h-8 w-[160px]" aria-label="Laden"><StoreIcon className="mr-1 size-3.5 shrink-0" /><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="alle">Alle Läden</SelectItem>{stores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </CardHeader>
    <CardContent>
      {!top.length ? <p className="py-6 text-center text-sm text-muted-foreground">Keine vergleichbaren Gerichte für diese Auswahl.</p> :
        <ol className="divide-y">
          {top.map((r, i) => <li key={r.id} className="flex items-center gap-3 py-2">
            <span className={'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ' + (i < 3 ? 'bg-amber-500 text-white' : 'bg-muted text-foreground')}>{i + 1}</span>
            <ZoomImage src={r.img} className="size-11 shrink-0" />
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => open(r.id)} className="block w-full truncate text-left text-sm font-semibold hover:underline" title={r.name}>{r.name}</button>
              <div className="mt-0.5 flex items-center gap-1.5 overflow-hidden"><BrandLogo r={r} size={16} /><StoreLogo store={r.store} size={16} /><span className="truncate text-xs text-muted-foreground">{fmt(r.price, 2)} € · {fmt(r.protpack, 0)} g Protein</span></div>
              <Progress value={pct(m.get(r)!)} className="mt-1.5 h-1.5" aria-label={`${m.label} relativ zu Platz 1`} />
            </div>
            <Badge className="shrink-0 border-emerald-600/40 bg-emerald-50 text-emerald-800 tabular-nums dark:bg-emerald-950 dark:text-emerald-200">{fmt(m.get(r), m.d)} {m.short}</Badge>
          </li>)}
        </ol>}
    </CardContent>
  </Card>
}

/** Makro-Mix: mittlerer Energieanteil aus Protein / Kohlenhydraten / Fett je Fertigstufe (Atwater 4/4/9 kcal/g). */
export function MacroMixPanel() {
  const { R } = useApp()
  const KEYS = ['Protein', 'Kohlenhydrate', 'Fett']
  const SHORT: Record<string, string> = { meal: 'Komplett', stew: 'Suppe', prot: 'Protein', side: 'Beilage', veg: 'Gemüse' }
  const data = useMemo(() => STAGES.filter(s => s[0] !== 'base').map(([k, e, l]) => {
    const rs = R.filter(r => r.stage === k && !r.nonfood && r.p100 != null && r.carbs != null && r.fat != null)
    const sh = rs.map(r => { const p = r.p100! * 4, c = r.carbs! * 4, f = r.fat! * 9, t = p + c + f; return t > 0 ? [p / t, c / t, f / t] : null }).filter((x): x is number[] => !!x)
    const avg = (i: number) => sh.length ? Math.round(sh.reduce((a, x) => a + x[i], 0) / sh.length * 100) : 0
    return { name: `${e} ${SHORT[k] ?? l}`, n: sh.length, Protein: avg(0), Kohlenhydrate: avg(1), Fett: avg(2) }
  }).filter(x => x.Protein + x.Kohlenhydrate + x.Fett > 0), [R])
  const counts = data.map(x => `${x.name}: ${x.n}`).join(' · ')
  return <Card className="min-w-0 overflow-hidden shadow-none">
    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Flame className="size-4" />Makro-Mix je Fertigstufe</CardTitle>
      <CardDescription>Durchschnittlicher Energieanteil in % aus Protein, Kohlenhydraten und Fett (4/4/9 kcal je g) · Gerichte mit Nährwerten – {counts}</CardDescription></CardHeader>
    <CardContent><StackedBars data={data.map(({ n: _n, ...x }) => x)} keys={KEYS} height={300} /></CardContent>
  </Card>
}
