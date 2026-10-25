import { useMemo, useState, type ReactNode } from 'react'
import { Check, ChevronsUpDown, UtensilsCrossed, Euro, Beef, HeartPulse, Droplets, MapPin, Factory, Package } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Img } from '@/components/product'
import { NutrientRow } from './Nutrients'
import { ProducerLogo } from './Logos'
import { AreaDist, Radial, StackedBars, TreemapChart, histogram, median, nums } from './charts'
import { colorOf } from './palette'
import { fmt, useApp, type Row } from '@/lib'
import { isReadyMeal } from '@/app/meal'
import { isRowRankable } from '@/app/shops'

export function Picker({ options, value, onChange, label }: { options: [string, number][]; value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between sm:w-72">{value || label}<ChevronsUpDown className="opacity-50" /></Button></PopoverTrigger>
    <PopoverContent className="w-72 p-0" align="start"><Command><CommandInput placeholder={`${label} suchen…`} /><CommandList><CommandEmpty>Nichts gefunden.</CommandEmpty><CommandGroup>
      {options.map(([o, n]) => <CommandItem key={o} value={o} onSelect={() => { onChange(o); setOpen(false) }}><Check className={value === o ? 'opacity-100' : 'opacity-0'} /><span className="size-2 rounded-full" style={{ background: colorOf(o) }} /><span className="flex-1 truncate">{o}</span><span className="text-xs text-muted-foreground">{n}</span></CommandItem>)}
    </CommandGroup></CommandList></Command></PopoverContent></Popover>
}

function Kpi({ icon: I, label, value }: { icon: typeof Euro; label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-3"><I className="mb-1 size-4 text-muted-foreground" /><div className="text-xl font-bold tabular-nums">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
}

/** Profile page (X-style banner + avatar + stats + charts + products) for a brand or a store. */
export function Profile({ name, rows, logo, subtitle, extra, groupBy }: { name: string; rows: Row[]; logo: ReactNode; subtitle: ReactNode; extra?: ReactNode; groupBy: (r: Row) => string }) {
  const { open } = useApp(); const c = colorOf(name)
  const st = useMemo(() => {
    const pr = nums(rows, r => r.price), e = nums(rows, r => r.eur10p), sc = nums(rows, r => r.score), sa = nums(rows, r => r.salt)
    const packs = [...new Set(rows.map(r => r.pack))].slice(0, 5)
    const gm = new Map<string, Row[]>(); rows.forEach(r => { const g = groupBy(r); gm.set(g, [...(gm.get(g) ?? []), r]) })
    const stack = [...gm].sort((a, b) => b[1].length - a[1].length).slice(0, 10).map(([g, rs]) => ({ name: g.slice(0, 18), ...Object.fromEntries(packs.map(p => [p, rs.filter(r => r.pack === p).length])) }))
    return { pr, e, sc, sa, packs, stack, tree: [...gm].map(([n, rs]) => ({ name: n, size: rs.length })).sort((a, b) => b.size - a.size).slice(0, 30) }
  }, [rows, groupBy])
  /** SC76 P1.2: „Bestes Protein pro Euro“ nur Fertiggerichte – zuerst gerankte Mahlzeiten, dann mit sonstigen Fertiggerichten auffüllen (keine Rohzutaten/Mehl/Trockenbohnen). */
  const byE = (a: Row, b: Row) => a.eur10p! - b.eur10p!
  const bestRanked = rows.filter(r => r.eur10p != null && !r.nonfood && isRowRankable(r as any)).sort(byE)
  const bestIds = new Set(bestRanked.map(r => r.id))
  const best = [...bestRanked, ...rows.filter(r => r.eur10p != null && !r.nonfood && !bestIds.has(r.id) && r.stage !== 'base' && isReadyMeal(r)).sort(byE)].slice(0, 8)
  return <div className="space-y-4">
    <Card className="overflow-hidden shadow-none">
      <div className="h-28 sm:h-36" style={{ background: `linear-gradient(120deg, ${c}, ${c}cc 45%, ${c}55)` }} />
      <div className="px-4 pb-4"><div className="-mt-10 flex items-end justify-between gap-3"><div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-white p-1.5 shadow">{logo}</div>{extra}</div>
        <h2 className="mt-2 text-2xl font-bold">{name}</h2><div className="text-sm text-muted-foreground">{subtitle}</div></div>
    </Card>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <Kpi icon={UtensilsCrossed} label="Gerichte" value={String(rows.length)} /><Kpi icon={Euro} label="Medianpreis" value={`${fmt(median(st.pr), 2)} €`} />
      <Kpi icon={Beef} label="Median €/10 g Protein" value={`${fmt(median(st.e), 2)} €`} /><Kpi icon={HeartPulse} label="Median Health-Score" value={fmt(median(st.sc), 0)} /><Kpi icon={Droplets} label="Median Salz g/100 g" value={fmt(median(st.sa), 2)} />
    </div>
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_260px]">
      <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Euro className="size-4" />Preisverteilung</CardTitle></CardHeader><CardContent><AreaDist data={histogram(st.pr, 20, 15)} label="Gerichte" unit="€" color={c} /></CardContent></Card>
      <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="size-4" />Verpackung je Gruppe</CardTitle></CardHeader><CardContent><StackedBars data={st.stack} keys={st.packs} height={240} /></CardContent></Card>
      <Card className="flex flex-col items-center justify-center gap-2 p-4 shadow-none"><Radial value={median(st.sc) ?? 0} label="Health-Score" color={c} /><span className="text-xs text-muted-foreground">Median aller Gerichte</span></Card>
    </div>
    <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Factory className="size-4" />Zusammensetzung</CardTitle></CardHeader><CardContent><TreemapChart data={st.tree} height={240} /></CardContent></Card>
    <h3 className="flex items-center gap-2 font-semibold"><Beef className="size-4" />Bestes Protein pro Euro</h3>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{best.map(r => <Card key={r.id} className="cursor-pointer overflow-hidden shadow-none" onClick={() => open(r.id)}>
      <div className="aspect-[4/3] bg-white p-2"><Img src={r.img} className="h-full w-full" /></div>
      <div className="space-y-1.5 p-2.5"><div className="line-clamp-2 text-[13px] font-medium">{r.name}</div><div className="flex items-center justify-between text-sm"><b className="tabular-nums">{fmt(r.price, 2)} €</b><ProducerLogo r={r} size={18} /></div><NutrientRow r={r} className="text-[11px]" /></div></Card>)}</div>
  </div>
}
export { MapPin }
