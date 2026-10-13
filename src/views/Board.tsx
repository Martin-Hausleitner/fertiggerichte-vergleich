import { Columns3, Plus, X, Trophy, Euro, Beef, Flame, Droplets, HeartPulse, Candy, Wheat } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { Img, StoreLogo, BrandLogo } from '@/components/product'
import { ProducerLogo } from '@/components/x/Logos'
import { colorOf } from '@/components/x/palette'
import { fmt, healthyCheap, useApp, type Row } from '@/lib'

const METRICS: [keyof Row, string, typeof Euro, boolean, number][] = [
  ['price', 'Preis €', Euro, true, 2], ['eur10p', '€ / 10 g Protein', Beef, true, 2], ['protPor', 'Protein / Portion g', Beef, false, 0], ['kcalPor', 'kcal / Portion', Flame, true, 0],
  ['salt', 'Salz g/100 g', Droplets, true, 2], ['sugar', 'Zucker g/100 g', Candy, true, 1], ['fib', 'Ballaststoffe g/100 g', Wheat, false, 1], ['score', 'Health-Score', HeartPulse, false, 0]]

/** Side-by-side compare board; best value per metric gets a trophy and a full bar. */
export default function Board() {
  const { R, compare, setCompare, toggleCompare, open } = useApp()
  const items = (compare.length ? compare : healthyCheap(R).slice(0, 4).map(r => r.id)).map(id => R.find(r => r.id === id)).filter((r): r is Row => !!r)
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-xl font-bold"><Columns3 className="size-5" />Vergleichs-Board</h2>
      <div className="flex gap-2">{!compare.length && <Button size="sm" onClick={() => setCompare(items.map(r => r.id))}><Plus />Diese übernehmen</Button>}{compare.length > 0 && <Button size="sm" variant="outline" onClick={() => setCompare([])}><X />Leeren</Button>}</div></div>
    {!compare.length && <p className="text-sm text-muted-foreground">Noch nichts ausgewählt – Vorschlag: die 4 besten Protein-Deals. Füge Produkte über das Vergleichs-Symbol hinzu.</p>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{items.map(r => <Card key={r.id} className="overflow-hidden shadow-none" style={{ borderTop: `4px solid ${colorOf(r.store)}` }}>
      <div className="relative aspect-[4/3] cursor-pointer bg-white p-2" onClick={() => open(r.id)}><Img src={r.img} className="h-full w-full" />{compare.includes(r.id) && <button aria-label="Entfernen" onClick={e => { e.stopPropagation(); toggleCompare(r.id) }} className="absolute right-2 top-2 rounded-full bg-background p-1 shadow"><X className="size-3.5" /></button>}</div>
      <div className="space-y-2 p-3"><div className="line-clamp-2 min-h-[2.4rem] text-sm font-medium">{r.name}</div>
        <div className="flex items-center justify-between gap-1"><BrandLogo r={r} size={18} /><StoreLogo store={r.store} size={18} /></div><ProducerLogo r={r} size={18} />
        <div className="space-y-2 pt-1">{METRICS.map(([k, l, I, low, dg]) => { const v = r[k] as number | null; const vs = items.map(x => x[k] as number | null).filter((x): x is number => x != null); const best = v != null && vs.length > 1 && v === (low ? Math.min(...vs) : Math.max(...vs)); const mx = Math.max(...vs, 0.0001)
          const pct = v == null ? 0 : low ? (Math.min(...vs) / Math.max(v, 0.0001)) * 100 : (v / mx) * 100
          return <div key={String(k)} className="space-y-0.5"><div className="flex items-center justify-between text-[11px]"><span className="inline-flex items-center gap-1 text-muted-foreground"><I className="size-3" />{l}</span><span className="inline-flex items-center gap-1 font-semibold tabular-nums">{best && <Trophy className="size-3 text-amber-600" />}{fmt(v, dg)}</span></div>
            <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: best ? colorOf(r.store) : 'hsl(var(--muted-foreground))' }} /></div></div> })}</div>
      </div></Card>)}</div>
  </div>
}
