import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Database, ImageIcon, Flame, Fingerprint, Package, Euro, Award } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useApp, type Row } from '@/lib'

/** Datenabdeckung: wie vollständig sind Foto, Nährwerte, Identitätskennzeichen, Verpackung, Preis und Nutri-Score je Händler. */
const METRICS = [
  { key: 'img', label: 'Foto', icon: ImageIcon, ok: (r: Row) => !!r.img },
  { key: 'kcal', label: 'Nährwerte', icon: Flame, ok: (r: Row) => r.kcal != null },
  { key: 'price', label: 'Preis', icon: Euro, ok: (r: Row) => r.price != null },
  { key: 'pack', label: 'Verpackung', icon: Package, ok: (r: Row) => !!r.pack && !r.pack.startsWith('Unklar') },
  { key: 'pid', label: 'Ident.-Kennz.', icon: Fingerprint, ok: (r: Row) => !!r.pid },
  { key: 'ns', label: 'Nutri-Score', icon: Award, ok: (r: Row) => !!r.ns },
] as const
type MKey = typeof METRICS[number]['key']
const chartConfig = {
  img: { label: 'Foto', color: '#2563eb' },
  kcal: { label: 'Nährwerte', color: '#16a34a' },
  price: { label: 'Preis', color: '#d97706' },
  pack: { label: 'Verpackung', color: '#9333ea' },
  pid: { label: 'Ident.-Kennz.', color: '#dc2626' },
  ns: { label: 'Nutri-Score', color: '#64748b' },
} satisfies ChartConfig
const pct = (a: number, n: number) => n ? Math.round(a / n * 100) : 0
const tone = (p: number) => p >= 90 ? 'text-emerald-700 dark:text-emerald-400' : p >= 60 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'

export default function Abdeckung() {
  const { D } = useApp()
  const [show, setShow] = useState<MKey[]>(['img', 'kcal', 'pid'])
  const rows = useMemo(() => D.rows.filter(r => !r.nonfood), [D])
  const stores = useMemo(() => {
    const m = new Map<string, Row[]>()
    rows.forEach(r => m.set(r.store, [...(m.get(r.store) ?? []), r]))
    return [...m.entries()].map(([store, L]) => ({ store, n: L.length, ...Object.fromEntries(METRICS.map(x => [x.key, pct(L.filter(x.ok).length, L.length)])) }) as { store: string; n: number } & Record<MKey, number>)
      .sort((a, b) => b.n - a.n)
  }, [rows])
  const total = useMemo(() => Object.fromEntries(METRICS.map(x => [x.key, pct(rows.filter(x.ok).length, rows.length)])) as Record<MKey, number>, [rows])
  return <div className="space-y-4">
    <div>
      <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><Database className="size-6" />Datenabdeckung</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Wie vollständig die Daten je Händler sind – live aus dem aktuellen Datensatz ({rows.length.toLocaleString('de-AT')} Lebensmittel). Fehlende Werte werden nie geschätzt, sondern bleiben leer, bis eine echte Quelle (Shop-API, Open Food Facts, Hersteller) sie liefert.</p>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {METRICS.map(x => <Card key={x.key}><CardHeader className="p-4 pb-1"><CardDescription className="flex items-center gap-1.5"><x.icon className="size-4" />{x.label}</CardDescription>
        <CardTitle className={'text-3xl tabular-nums ' + tone(total[x.key])}>{total[x.key]} %</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0 text-xs text-muted-foreground">{rows.filter(x.ok).length.toLocaleString('de-AT')} von {rows.length.toLocaleString('de-AT')}</CardContent></Card>)}
    </div>
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><CardTitle>Abdeckung je Händler</CardTitle><CardDescription>Anteil der Produkte mit dem jeweiligen Feld (in %)</CardDescription></div>
        <ToggleGroup type="multiple" variant="outline" size="sm" value={show} onValueChange={v => v.length && setShow(v as MKey[])} className="flex-wrap justify-start">
          {METRICS.map(x => <ToggleGroupItem key={x.key} value={x.key} aria-label={x.label} className="gap-1"><x.icon className="size-3.5" />{x.label}</ToggleGroupItem>)}
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[340px] w-full">
          <BarChart data={stores} margin={{ left: -16, right: 8 }} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="store" tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} unit=" %" tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" formatter={(v, name) => <><span className="text-muted-foreground">{chartConfig[name as MKey]?.label}</span><span className="ml-auto font-mono font-medium tabular-nums">{v as number} %</span></>} />} />
            <ChartLegend content={<ChartLegendContent />} />
            {show.map(k => <Bar key={k} dataKey={k} fill={`var(--color-${k})`} radius={[4, 4, 0, 0]} />)}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Tabelle</CardTitle><CardDescription>Grün ≥ 90 %, gelb ≥ 60 %, rot darunter</CardDescription></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Händler</TableHead><TableHead className="text-right">Produkte</TableHead>{METRICS.map(x => <TableHead key={x.key} className="text-right whitespace-nowrap">{x.label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{stores.map(s => <TableRow key={s.store}><TableCell className="font-medium whitespace-nowrap">{s.store}</TableCell><TableCell className="text-right tabular-nums">{s.n}</TableCell>
            {METRICS.map(x => <TableCell key={x.key} className={'text-right tabular-nums font-semibold ' + tone(s[x.key])}>{s[x.key]} %</TableCell>)}</TableRow>)}</TableBody>
          <TableFooter><TableRow><TableCell>Gesamt</TableCell><TableCell className="text-right tabular-nums">{rows.length}</TableCell>{METRICS.map(x => <TableCell key={x.key} className="text-right tabular-nums">{total[x.key]} %</TableCell>)}</TableRow></TableFooter>
        </Table>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="secondary">Ident.-Kennz. = EU-Identitätskennzeichen (z. B. AT 40047 EG) des Herstellerbetriebs</Badge><Badge variant="secondary">Nutri-Score nur, wenn offiziell (Open Food Facts) oder aus vollständigen Nährwerten berechnet</Badge></div>
      </CardContent>
    </Card>
  </div>
}
