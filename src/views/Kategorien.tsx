import { useMemo, useState } from 'react'
import { Soup, CookingPot, Salad, Beef, Leaf, CakeSlice, Utensils, Dumbbell, Snowflake, Fish, Pizza, Search, ChevronRight, Euro, Trophy, LayoutGrid, Drumstick, Wheat, type LucideIcon } from 'lucide-react'
import { Card, Input, Button } from '@/components/ui'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Img, StoreLogo, BrandLogo } from '@/components/product'
import { useFacets } from '@/components/x/Facets'
import { NutrientRow } from '@/components/x/Nutrients'
import { median, nums } from '@/components/x/charts'
import { colorOf } from '@/components/x/palette'
import { cn, fmt, healthyCheap, useApp, useHashState, type Row } from '@/lib'

type Sub = { key: string; label: string; test: (r: Row) => boolean }
type Cat = { key: string; label: string; icon: LucideIcon; test: (r: Row) => boolean; subs: Sub[] }
const txt = (r: Row) => `${r.name} ${(r.cdish ?? []).join(' ')}`
const re = (x: RegExp) => (r: Row) => x.test(txt(r))
const dish = (d: string) => (r: Row) => !!r.cdish?.includes(d)
const prot = (p: string) => (r: Row) => !!r.cprot?.includes(p)
const sub = (label: string, test: (r: Row) => boolean): Sub => ({ key: label.toLowerCase().replace(/\W+/g, '-'), label, test })
const MEALPREP = ['PrepMyMeal', 'Fit to Go', 'LiveFresh', 'FitTaste']

export const CATS: Cat[] = [
  { key: 'suppen', label: 'Suppen & Eintöpfe', icon: Soup, test: r => dish('Suppe')(r) || dish('Eintopf')(r) || dish('Gulasch')(r), subs: [sub('Suppe', dish('Suppe')), sub('Eintopf', dish('Eintopf')), sub('Gulasch', dish('Gulasch')), sub('Suppentopf', re(/suppentopf/i)), sub('Linsen & Bohnen', prot('Hülsenfrüchte'))] },
  { key: 'pasta', label: 'Pasta', icon: Wheat, test: r => dish('Pasta')(r) || dish('Lasagne')(r), subs: [sub('Lasagne', dish('Lasagne')), sub('Bolognese', re(/bolognese/i)), sub('Carbonara', re(/carbonara/i)), sub('Gefüllte Pasta', re(/tortell|ravioli|gnocchi|cappelletti/i)), sub('Käse-Sauce', prot('Käse/Milch'))] },
  { key: 'asia', label: 'Asiatisch', icon: CookingPot, test: r => dish('Asia')(r) || dish('Curry')(r), subs: [sub('Curry', dish('Curry')), sub('Nudeln', re(/nudel|noodle|ramen|udon|mie/i)), sub('Reis', re(/reis|rice/i)), sub('Gyoza & Dim Sum', re(/gyoza|dim sum|frühlingsrolle/i))] },
  { key: 'fleisch', label: 'Fleisch', icon: Beef, test: r => ['Rind', 'Schwein', 'Huhn', 'Pute', 'Wild', 'Lamm', 'Ripperl/Spareribs'].some(p => r.cprot?.includes(p)), subs: [sub('Huhn', prot('Huhn')), sub('Rind', prot('Rind')), sub('Schwein', prot('Schwein')), sub('Pute', prot('Pute')), sub('Wild & Lamm', r => prot('Wild')(r) || prot('Lamm')(r)), sub('Paniert', dish('Paniert'))] },
  { key: 'fisch', label: 'Fisch & Meer', icon: Fish, test: r => prot('Fisch')(r) || prot('Meeresfrüchte')(r), subs: [sub('Fisch', prot('Fisch')), sub('Meeresfrüchte', prot('Meeresfrüchte'))] },
  { key: 'veggie', label: 'Vegetarisch & Vegan', icon: Leaf, test: r => prot('vegetarisch')(r) || prot('vegan')(r), subs: [sub('Vegan', prot('vegan')), sub('Vegetarisch', prot('vegetarisch')), sub('Tofu/Soja', prot('Tofu/Soja')), sub('Fleischersatz', prot('Seitan/Fleischersatz')), sub('Hülsenfrüchte', prot('Hülsenfrüchte'))] },
  { key: 'oesterreich', label: 'Hausmannskost', icon: Drumstick, test: r => dish('Österreichisch')(r) || dish('Knödel')(r), subs: [sub('Knödel', dish('Knödel')), sub('Österreichisch', dish('Österreichisch')), sub('Grill/mariniert', dish('Grill/mariniert'))] },
  { key: 'pizza', label: 'Pizza & Snacks', icon: Pizza, test: dish('Pizza/Snack'), subs: [sub('Pizza', re(/pizza/i)), sub('Mexikanisch', dish('Mexikanisch'))] },
  { key: 'vorspeisen', label: 'Vorspeisen & Salate', icon: Salad, test: r => r.stage === 'side' || r.stage === 'veg' || re(/salat|antipast|bruschett|vorspeise/i)(r), subs: [sub('Salat', re(/salat/i)), sub('Beilage', r => r.stage === 'side'), sub('Gemüse', r => r.stage === 'veg')] },
  { key: 'desserts', label: 'Desserts', icon: CakeSlice, test: re(/dessert|pudding|mousse|kaiserschmarr|milchreis|grießbrei|strudel|tiramisu|schoko|panna cotta|germknödel|marillenknödel|topfen/i), subs: [sub('Pudding & Creme', re(/pudding|mousse|creme|panna/i)), sub('Mehlspeisen', re(/schmarr|strudel|knödel|topfen/i)), sub('Reis & Grieß', re(/milchreis|grieß/i))] },
  { key: 'mealprep', label: 'Meal-Prep & Bowls', icon: Dumbbell, test: r => MEALPREP.includes(r.store) || dish('Bowl')(r), subs: MEALPREP.map(s => sub(s, r => r.store === s)).concat([sub('Bowl', dish('Bowl'))]) },
  { key: 'tk', label: 'Tiefkühl', icon: Snowflake, test: r => /tiefkühl|tk/i.test(r.pack), subs: [sub('Pizza', re(/pizza/i)), sub('Pasta', dish('Pasta')), sub('Asia', dish('Asia'))] },
]

function CatTile({ c, rows, active, onClick }: { c: Cat; rows: Row[]; active: boolean; onClick: () => void }) {
  const top = healthyCheap(rows, 40)[0] ?? rows.find(r => r.img)
  return <button onClick={onClick} className={cn('group flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors', active ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-muted')}>
    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-white">{top?.img && <Img src={top.img} className="h-full w-full" />}<span className="absolute bottom-0 right-0 rounded-tl-md bg-background p-0.5 text-foreground"><c.icon className="size-3.5" /></span></div>
    <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{c.label}</div>
      <div className={cn('flex gap-2 text-[11px] tabular-nums', active ? 'text-background/80' : 'text-muted-foreground')}><span>{rows.length}</span><span>Ø {fmt(median(nums(rows, r => r.price)), 2)} €</span><span>{fmt(median(nums(rows, r => r.eur10p)), 2)} €/10 g</span></div></div>
    <ChevronRight className="size-4 opacity-60" />
  </button>
}

/** Category explorer: tree with icons and stats, subcategories, in-category search, facets and a top strip. */
export default function Kategorien() {
  const { R, open } = useApp()
  const base = useMemo(() => R.filter(r => !r.nonfood && !r.store.startsWith('unbekannt')), [R])
  const byCat = useMemo(() => Object.fromEntries(CATS.map(c => [c.key, base.filter(c.test)])), [base])
  const [ck, setCk] = useHashState<string>('kat', 'suppen'), [sk, setSk] = useHashState<string>('sub', ''), [q, setQ] = useState('')
  const cat = CATS.find(c => c.key === ck) ?? CATS[0]
  const inCat = byCat[cat.key]
  const subRows = useMemo(() => { const s = cat.subs.find(x => x.key === sk); return s ? inCat.filter(s.test) : inCat }, [inCat, sk, cat])
  const { filtered, ui } = useFacets(subRows, 'kat')
  const shown = useMemo(() => { const qq = q.trim().toLowerCase(); return (qq ? filtered.filter(r => `${r.name} ${r.brandN} ${r.herst}`.toLowerCase().includes(qq)) : filtered).sort((a, b) => (a.eur10p ?? 99) - (b.eur10p ?? 99)) }, [filtered, q])
  const [n, setN] = useState(24)
  const top = healthyCheap(subRows, 40).slice(0, 10)
  return <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
    <aside className="hidden lg:block"><div className="sticky top-32 space-y-1.5"><div className="flex items-center gap-2 px-1 pb-1 text-sm font-semibold"><LayoutGrid className="size-4" />Kategorien</div>
      {CATS.map(c => <div key={c.key}><CatTile c={c} rows={byCat[c.key]} active={c.key === cat.key} onClick={() => { setCk(c.key); setSk('') }} />
        {c.key === cat.key && <div className="ml-6 mt-1 space-y-0.5 border-l pl-2">{c.subs.map(s => { const cnt = byCat[c.key].filter(s.test).length; return cnt ? <button key={s.key} onClick={() => setSk(sk === s.key ? '' : s.key)} className={cn('flex w-full justify-between rounded-md px-2 py-1 text-sm', sk === s.key ? 'bg-muted font-semibold' : 'hover:bg-muted/60')}><span>{s.label}</span><span className="tabular-nums text-muted-foreground">{cnt}</span></button> : null })}</div>}
      </div>)}</div></aside>
    <div className="min-w-0 space-y-3">
      <ScrollArea className="lg:hidden"><div className="flex gap-2 pb-2">{CATS.map(c => <Button key={c.key} size="sm" variant={c.key === cat.key ? 'default' : 'outline'} onClick={() => { setCk(c.key); setSk('') }}><c.icon />{c.label}<span className="tabular-nums opacity-70">{byCat[c.key].length}</span></Button>)}</div><ScrollBar orientation="horizontal" /></ScrollArea>
      <Card className="overflow-hidden shadow-none"><div className="flex items-center gap-3 p-4"><div className="flex size-12 items-center justify-center rounded-full bg-foreground text-background"><cat.icon className="size-6" /></div>
        <div className="min-w-0 flex-1"><h2 className="text-xl font-bold">{cat.label}</h2><div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><Utensils className="size-3.5" />{inCat.length} Gerichte</span><span className="inline-flex items-center gap-1"><Euro className="size-3.5" />Median {fmt(median(nums(inCat, r => r.price)), 2)} €</span><span className="inline-flex items-center gap-1"><Beef className="size-3.5" />{fmt(median(nums(inCat, r => r.eur10p)), 2)} €/10 g Protein</span></div></div></div>
        <ScrollArea><div className="flex gap-1.5 px-4 pb-3"><Button size="sm" variant={!sk ? 'default' : 'outline'} className="h-7 rounded-full" onClick={() => setSk('')}>Alle</Button>{cat.subs.map(s => { const cnt = inCat.filter(s.test).length; return cnt ? <Button key={s.key} size="sm" variant={sk === s.key ? 'default' : 'outline'} className="h-7 rounded-full" onClick={() => setSk(sk === s.key ? '' : s.key)}>{s.label}<span className="tabular-nums opacity-70">{cnt}</span></Button> : null })}</div><ScrollBar orientation="horizontal" /></ScrollArea>
      </Card>
      {top.length > 0 && <div><h3 className="mb-2 flex items-center gap-2 font-semibold"><Trophy className="size-4 text-amber-600" />Top in {cat.subs.find(s => s.key === sk)?.label ?? cat.label}</h3>
        <ScrollArea><div className="flex gap-3 pb-3">{top.map((r, i) => <Card key={r.id} onClick={() => open(r.id)} className="w-40 shrink-0 cursor-pointer overflow-hidden shadow-none" style={{ borderTop: `3px solid ${colorOf(r.store)}` }}>
          <div className="relative aspect-square bg-white p-2"><Img src={r.img} className="h-full w-full" /><span className="absolute left-1.5 top-1.5 rounded-full bg-foreground px-1.5 text-[11px] font-bold text-background">#{i + 1}</span></div>
          <div className="space-y-1 p-2"><div className="line-clamp-2 text-xs font-medium">{r.name}</div><div className="flex justify-between text-xs"><b className="tabular-nums">{fmt(r.price, 2)} €</b><span className="tabular-nums text-muted-foreground">{fmt(r.eur10p, 2)}/10 g</span></div></div></Card>)}</div><ScrollBar orientation="horizontal" /></ScrollArea></div>}
      <div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder={`In ${cat.label} suchen…`} className="pl-9" /></div>
      {ui}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{shown.slice(0, n).map(r => <Card key={r.id} onClick={() => open(r.id)} className="flex cursor-pointer gap-3 p-2.5 shadow-none hover:bg-muted/40">
        <div className="size-20 shrink-0 rounded-lg bg-white p-1"><Img src={r.img} className="h-full w-full" /></div>
        <div className="min-w-0 flex-1 space-y-1"><div className="line-clamp-2 text-sm font-medium leading-snug">{r.name}</div><div className="flex items-center gap-2"><BrandLogo r={r} size={16} /><StoreLogo store={r.store} size={16} /><b className="ml-auto text-sm tabular-nums">{fmt(r.price, 2)} €</b></div><NutrientRow r={r} className="text-[11px]" /></div></Card>)}</div>
      {shown.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Keine Treffer – Filter lockern.</p>}
      {n < shown.length && <Button variant="outline" className="w-full" onClick={() => setN(n + 24)}>Mehr anzeigen ({shown.length - n})</Button>}
    </div>
  </div>
}
