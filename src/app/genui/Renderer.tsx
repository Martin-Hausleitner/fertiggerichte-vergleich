/** GenUI renderer: validated JSON spec → existing shadcn components. Never renders raw HTML. */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { Bar, BarChart as RBarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Table as T, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs as UTabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { validateSpec, type Action, type GenNode, type GenSpec, type ProductQuery, type ValidationIssue } from './schema'
import { runQuery, pricePerPortion, type RowLike, type ValueCfg } from './query'

export type GenUIEnv = { rows: RowLike[]; onAction?: (a: Action) => void; valueCfg?: ValueCfg }
const Env = createContext<GenUIEnv>({ rows: [] })

const eur = (v: number | null | undefined) => v == null ? '–' : v.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
const num = (v: number | null | undefined, d = 1) => v == null ? '–' : v.toLocaleString('de-AT', { maximumFractionDigits: d })
const gap = { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' } as const
const cols = ['', 'grid-cols-1', 'grid-cols-1 sm:grid-cols-2', 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4']
const badgeVar = (t?: string) => (t === 'success' || t === 'warning' ? 'secondary' : t ?? 'default') as 'default' | 'secondary' | 'outline' | 'destructive'
const toneCls: Record<string, string> = { success: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300', warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' }
const isHttps = (u?: string | null) => !!u && /^https:\/\//i.test(u)

function fmtCell(v: unknown, f?: string): ReactNode {
  if (v == null) return '–'
  if (typeof v === 'number') return f === 'eur' ? eur(v) : f === 'g' ? `${num(v)} g` : f === 'kcal' ? `${num(v, 0)} kcal` : f === 'score' ? num(v, 0) : num(v, 2)
  if (typeof v === 'boolean') return v ? 'ja' : 'nein'
  return f === 'badge' ? <Badge variant="outline">{String(v)}</Badge> : String(v)
}

function ProductCardView({ r, note }: { r: RowLike; note?: string }) {
  const { onAction } = useContext(Env)
  return (
    <Card className="overflow-hidden">
      {isHttps(r.img) && <img src={r.img!} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-32 w-full object-contain bg-muted" />}
      <CardHeader className="p-3 pb-1"><CardTitle className="text-sm leading-tight">{r.name}</CardTitle><CardDescription>{r.brandN ?? r.brand} · {r.store}</CardDescription></CardHeader>
      <CardContent className="p-3 pt-0 flex flex-wrap gap-1 text-xs">
        {r.score != null && <Badge>Score {num(r.score, 0)}</Badge>}
        <Badge variant="outline">{eur(r.price)}</Badge>
        {pricePerPortion(r) != null && <Badge variant="secondary">{eur(pricePerPortion(r))}/Portion</Badge>}
        {r.p100 != null && <Badge variant="outline">{num(r.p100)} g Protein/100 g</Badge>}
        {note && <p className="w-full text-muted-foreground mt-1">{note}</p>}
      </CardContent>
      {onAction && <CardFooter className="p-3 pt-0 gap-2"><Button size="sm" variant="outline" onClick={() => onAction({ type: 'openProduct', id: r.id })}>Details</Button><Button size="sm" variant="ghost" onClick={() => onAction({ type: 'compare', ids: [r.id] })}>Vergleichen</Button></CardFooter>}
    </Card>
  )
}

const PCOL: Record<string, [string, (r: RowLike) => ReactNode]> = {
  name: ['Produkt', r => r.name], store: ['Shop', r => r.store], brand: ['Marke', r => r.brandN ?? r.brand ?? ''], price: ['Preis', r => eur(r.price)],
  pricePerPortion: ['€/Portion', r => eur(pricePerPortion(r))], kcal: ['kcal/100 g', r => num(r.kcal, 0)], protein: ['Protein/100 g', r => num(r.p100)],
  sugar: ['Zucker/100 g', r => num(r.sugar)], salt: ['Salz/100 g', r => num(r.salt, 2)], score: ['Score', r => num(r.score, 0)], ns: ['Nutri-Score', r => r.ns ?? '–'],
}
function ProductListView({ query, display, columns, title }: { query: ProductQuery; display?: string; columns?: string[]; title?: string }) {
  const { rows, valueCfg } = useContext(Env)
  const list = useMemo(() => runQuery(rows, query, valueCfg), [rows, query, valueCfg])
  const body = !list.length ? <p className="text-sm text-muted-foreground">Keine Produkte gefunden.</p>
    : display === 'table' ? (() => { const c = columns?.length ? columns : ['name', 'store', 'price', 'pricePerPortion', 'score']; return (
      <T><TableHeader><TableRow>{c.map(k => <TableHead key={k}>{PCOL[k][0]}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{list.map(r => <TableRow key={r.id}>{c.map(k => <TableCell key={k}>{PCOL[k][1](r)}</TableCell>)}</TableRow>)}</TableBody></T>) })()
    : <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">{list.map(r => <ProductCardView key={r.id} r={r} />)}</div>
  return <div className="space-y-2">{title && <h3 className="font-semibold">{title}</h3>}{body}</div>
}

function queryChips(q: ProductQuery): string[] {
  const c: string[] = []
  if (q.q) c.push(`„${q.q}“`); q.stores?.forEach(s => c.push(s)); if (q.vegan) c.push('vegan'); if (q.vegetarian) c.push('vegetarisch'); if (q.bio) c.push('bio')
  if (q.minScore != null) c.push(`Score ≥ ${q.minScore}`); if (q.maxPrice != null) c.push(`≤ ${eur(q.maxPrice)}`); if (q.maxPricePerPortion != null) c.push(`≤ ${eur(q.maxPricePerPortion)}/Portion`)
  if (q.minProtein100 != null) c.push(`Protein ≥ ${q.minProtein100} g`); if (q.maxSugar100 != null) c.push(`Zucker ≤ ${q.maxSugar100} g`); if (q.maxSalt100 != null) c.push(`Salz ≤ ${q.maxSalt100} g`)
  if (q.sort) c.push(`sortiert: ${q.sort}`); return c
}

function Node({ n }: { n: GenNode }): ReactNode {
  const { rows, onAction } = useContext(Env)
  const p = n.props as any
  const kids = n.children?.map((c, i) => <Node key={c.key ?? i} n={c} />)
  switch (n.type) {
    case 'Stack': return <div className={`flex ${p.direction === 'horizontal' ? 'flex-row items-center' : 'flex-col'} ${p.wrap ? 'flex-wrap' : ''} ${gap[(p.gap ?? 'md') as 'md']}`}>{kids}</div>
    case 'Grid': return <div className={`grid gap-4 ${cols[p.columns ?? 2]}`}>{kids}</div>
    case 'Card': return <Card>{(p.title || p.description) && <CardHeader>{p.title && <CardTitle>{p.title}</CardTitle>}{p.description && <CardDescription>{p.description}</CardDescription>}</CardHeader>}<CardContent className={p.title || p.description ? '' : 'pt-6'}><div className="flex flex-col gap-3">{kids}</div></CardContent>{p.footer && <CardFooter className="text-sm text-muted-foreground">{p.footer}</CardFooter>}</Card>
    case 'Tabs': { const tabs = (n.children ?? []).filter(c => c.type === 'Tab'); if (!tabs.length) return null; return (
      <UTabs defaultValue={p.defaultTab ?? (tabs[0].props as any).id}><TabsList>{tabs.map(t => <TabsTrigger key={(t.props as any).id} value={(t.props as any).id}>{(t.props as any).label}</TabsTrigger>)}</TabsList>
        {tabs.map(t => <TabsContent key={(t.props as any).id} value={(t.props as any).id}><div className="flex flex-col gap-3">{t.children?.map((c, i) => <Node key={c.key ?? i} n={c} />)}</div></TabsContent>)}</UTabs>) }
    case 'Tab': return <div className="flex flex-col gap-3">{kids}</div>
    case 'Separator': return <Separator />
    case 'Heading': { const L = (['h2', 'h2', 'h3', 'h4', 'h5'] as const)[p.level ?? 2]; const sz = ['', 'text-2xl', 'text-xl', 'text-lg', 'text-base'][p.level ?? 2]; return <L className={`${sz} font-semibold tracking-tight`}>{p.text}</L> }
    case 'Text': return <p className={`${p.size === 'sm' ? 'text-sm' : ''} ${p.muted ? 'text-muted-foreground' : ''} whitespace-pre-line`}>{p.text}</p>
    case 'Badge': return <Badge variant={badgeVar(p.tone)} className={toneCls[p.tone] ?? ''}>{p.text}</Badge>
    case 'Alert': return <div role="note" className={`rounded-md border p-3 text-sm ${p.tone === 'destructive' ? 'border-destructive/50 text-destructive' : p.tone === 'warning' ? 'border-amber-500/50 bg-amber-500/10' : 'bg-muted/50'}`}>{p.title && <div className="font-medium mb-1">{p.title}</div>}{p.text}</div>
    case 'Stat': return <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{p.label}</div><div className="text-2xl font-semibold">{typeof p.value === 'number' ? num(p.value, 2) : p.value}{p.unit && <span className="text-sm font-normal ml-1">{p.unit}</span>}</div>{p.hint && <div className="text-xs text-muted-foreground">{p.hint}</div>}</div>
    case 'Image': return <img src={p.src} alt={p.alt} referrerPolicy="no-referrer" loading="lazy" style={{ height: p.height ?? 160 }} className="object-contain max-w-full" />
    case 'Button': return <Button variant={p.variant ?? 'default'} disabled={!onAction} onClick={() => onAction?.(p.action)}>{p.label}</Button>
    case 'Table': return <T>{p.caption && <TableCaption>{p.caption}</TableCaption>}<TableHeader><TableRow>{p.columns.map((c: any) => <TableHead key={c.key}>{c.label}</TableHead>)}</TableRow></TableHeader><TableBody>{p.rows.map((r: any, i: number) => <TableRow key={i}>{p.columns.map((c: any) => <TableCell key={c.key}>{fmtCell(r[c.key], c.format)}</TableCell>)}</TableRow>)}</TableBody></T>
    case 'BarChart': { const cfg: ChartConfig = Object.fromEntries(p.bars.map((b: any, i: number) => [b.key, { label: b.label, color: `hsl(var(--chart-${i + 1}))` }])); return (
      <ChartContainer config={cfg} className="w-full" style={{ height: p.height ?? 260 }}><RBarChart data={p.data}><CartesianGrid vertical={false} /><XAxis dataKey={p.x} tickLine={false} axisLine={false} /><YAxis width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />{p.bars.map((b: any) => <Bar key={b.key} dataKey={b.key} fill={`var(--color-${b.key})`} radius={4} />)}</RBarChart></ChartContainer>) }
    case 'ProductCard': { const r = rows.find(x => x.id === p.id); return r ? <ProductCardView r={r} note={p.note} /> : <p className="text-sm text-muted-foreground">Produkt #{p.id} nicht gefunden.</p> }
    case 'ProductList': return <ProductListView {...p} />
    case 'FilterBar': return <div className="flex flex-wrap items-center gap-2">{p.label && <span className="text-sm font-medium">{p.label}</span>}{queryChips(p.query).map(c => <Badge key={c} variant="secondary">{c}</Badge>)}{onAction && <Button size="sm" variant="outline" onClick={() => onAction({ type: 'applyFilter', query: p.query })}>In der App anwenden</Button>}</div>
    default: return null
  }
}

export type GenUIProps = { spec: unknown; env: GenUIEnv; showErrors?: boolean; onValidated?: (errors: ValidationIssue[]) => void }
/** Validates (lenient, drops invalid nodes) and renders. */
export function GenUIRenderer({ spec, env, showErrors = true }: GenUIProps) {
  const res = useMemo(() => validateSpec(spec), [spec])
  return (
    <Env.Provider value={env}>
      <section className="flex flex-col gap-3" data-genui="v1">
        {res.spec?.title && <h2 className="text-xl font-semibold">{res.spec.title}</h2>}
        {res.spec && <Node n={res.spec.root} />}
        {showErrors && res.errors.length > 0 && <details className="text-xs text-muted-foreground"><summary>{res.errors.length} Hinweis(e) zur KI-Ansicht{res.dropped ? `, ${res.dropped} Element(e) verworfen` : ''}</summary><ul className="list-disc pl-4">{res.errors.slice(0, 30).map((e, i) => <li key={i}><code>{e.path}</code>: {e.message}</li>)}</ul></details>}
      </section>
    </Env.Provider>
  )
}
export type { GenSpec }
