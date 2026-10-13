import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Store, Tag, Package, Euro, Beef, Droplets, Flame, Bookmark, BookmarkPlus, X, RotateCcw, Leaf, SlidersHorizontal } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Slider } from '@/components/ui/slider'
import { Button, Badge } from '@/components/ui'
import { cn, useLocal, type Row } from '@/lib'
import { colorOf } from './palette'

export type Facets = { stores: string[]; brands: string[]; packs: string[]; price: [number, number]; prot: [number, number]; salt: [number, number]; kcal: [number, number]; bio: boolean }
export const FACET_DEFAULT: Facets = { stores: [], brands: [], packs: [], price: [0, 20], prot: [0, 80], salt: [0, 5], kcal: [0, 1500], bio: false }
type Saved = { name: string; f: Facets }

const inRange = (v: number | null, [a, b]: [number, number], max: number) => v == null ? a === 0 : v >= a && (b >= max || v <= b)
export function applyFacets(rows: Row[], f: Facets) {
  return rows.filter(r => !r.nonfood && !r.store.startsWith('unbekannt')
    && (!f.stores.length || f.stores.includes(r.store)) && (!f.brands.length || f.brands.includes(r.brandN)) && (!f.packs.length || f.packs.includes(r.pack))
    && inRange(r.price, f.price, 20) && inRange(r.protPor ?? r.protpack, f.prot, 80) && inRange(r.saltPor ?? r.salt, f.salt, 5) && inRange(r.kcalPor ?? r.kcalpack, f.kcal, 1500) && (!f.bio || r.bio))
}

function MultiCombo({ icon: Icon, label, options, value, onChange, colored }: { icon: typeof Store; label: string; options: [string, number][]; value: string[]; onChange: (v: string[]) => void; colored?: boolean }) {
  const [open, setOpen] = useState(false)
  const tog = (o: string) => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o])
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-8 gap-1.5 border-dashed"><Icon />{label}{value.length > 0 && <Badge variant="secondary" className="ml-1">{value.length}</Badge>}<ChevronsUpDown className="opacity-50" /></Button></PopoverTrigger>
    <PopoverContent className="w-64 p-0" align="start">
      <Command><CommandInput placeholder={`${label} suchen…`} /><CommandList><CommandEmpty>Nichts gefunden.</CommandEmpty><CommandGroup>
        {options.map(([o, n]) => <CommandItem key={o} value={o} onSelect={() => tog(o)}>
          <span className={cn('flex size-4 items-center justify-center rounded-sm border border-foreground/60', value.includes(o) && 'bg-foreground text-background')}>{value.includes(o) && <Check className="size-3" />}</span>
          {colored && <span className="size-2 rounded-full" style={{ background: colorOf(o) }} />}
          <span className="flex-1 truncate">{o}</span><span className="text-xs tabular-nums text-muted-foreground">{n}</span>
        </CommandItem>)}
      </CommandGroup></CommandList></Command>
    </PopoverContent>
  </Popover>
}

function Range({ icon: Icon, label, unit, max, step, value, onChange }: { icon: typeof Euro; label: string; unit: string; max: number; step: number; value: [number, number]; onChange: (v: [number, number]) => void }) {
  return <div className="min-w-[150px] flex-1 space-y-2">
    <div className="flex items-center justify-between text-xs"><span className="inline-flex items-center gap-1 font-medium"><Icon className="size-3.5" />{label}</span><span className="tabular-nums text-muted-foreground">{value[0]}–{value[1] >= max ? `${max}+` : value[1]} {unit}</span></div>
    <Slider min={0} max={max} step={step} value={value} onValueChange={v => onChange([v[0], v[1]] as [number, number])} aria-label={label} />
  </div>
}

const count = (rows: Row[], k: (r: Row) => string) => { const m = new Map<string, number>(); rows.forEach(r => m.set(k(r), (m.get(k(r)) ?? 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]) }

/** Faceted filters: multi-select comboboxes, range sliders, chips and saved views (localStorage). */
export function useFacets(rows: Row[], id: string) {
  const [f, setF] = useLocal<Facets>(`fg-facets-${id}`, FACET_DEFAULT)
  const [saved, setSaved] = useLocal<Saved[]>('fg-saved-views', [])
  const ff = { ...FACET_DEFAULT, ...f }
  const filtered = useMemo(() => applyFacets(rows, ff), [rows, JSON.stringify(ff)])
  const opts = useMemo(() => ({ stores: count(rows.filter(r => !r.store.startsWith('unbekannt')), r => r.store), brands: count(rows, r => r.brandN).slice(0, 150), packs: count(rows, r => r.pack) }), [rows])
  const set = <K extends keyof Facets>(k: K, v: Facets[K]) => setF({ ...ff, [k]: v })
  const chips: [string, () => void][] = [
    ...ff.stores.map(s => [s, () => set('stores', ff.stores.filter(x => x !== s))] as [string, () => void]),
    ...ff.brands.map(s => [s, () => set('brands', ff.brands.filter(x => x !== s))] as [string, () => void]),
    ...ff.packs.map(s => [s, () => set('packs', ff.packs.filter(x => x !== s))] as [string, () => void]),
  ]
  const ui = <div className="space-y-3 rounded-xl border bg-card p-3">
    <div className="flex flex-wrap items-center gap-2">
      <SlidersHorizontal className="size-4" aria-hidden />
      <MultiCombo icon={Store} label="Laden" options={opts.stores} value={ff.stores} onChange={v => set('stores', v)} colored />
      <MultiCombo icon={Tag} label="Marke" options={opts.brands} value={ff.brands} onChange={v => set('brands', v)} colored />
      <MultiCombo icon={Package} label="Verpackung" options={opts.packs} value={ff.packs} onChange={v => set('packs', v)} />
      <Button size="sm" variant={ff.bio ? 'default' : 'outline'} className="h-8" onClick={() => set('bio', !ff.bio)}><Leaf />Bio</Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={() => setF(FACET_DEFAULT)}><RotateCcw />Zurücksetzen</Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={() => { const name = `Ansicht ${saved.length + 1}`; setSaved([...saved, { name, f: ff }]) }}><BookmarkPlus />Ansicht speichern</Button>
      <span className="ml-auto text-sm font-medium tabular-nums">{filtered.length.toLocaleString('de-AT')} Treffer</span>
    </div>
    <div className="flex flex-wrap gap-4">
      <Range icon={Euro} label="Preis" unit="€" max={20} step={0.5} value={ff.price} onChange={v => set('price', v)} />
      <Range icon={Beef} label="Protein/Portion" unit="g" max={80} step={1} value={ff.prot} onChange={v => set('prot', v)} />
      <Range icon={Droplets} label="Salz/Portion" unit="g" max={5} step={0.1} value={ff.salt} onChange={v => set('salt', v)} />
      <Range icon={Flame} label="kcal/Portion" unit="" max={1500} step={25} value={ff.kcal} onChange={v => set('kcal', v)} />
    </div>
    {(chips.length > 0 || saved.length > 0) && <div className="flex flex-wrap items-center gap-1.5">
      {chips.map(([l, rm]) => <button key={l} onClick={rm} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium" style={{ color: colorOf(l), borderColor: colorOf(l) + '66' }}>{l}<X className="size-3" /></button>)}
      {saved.map((s, i) => <span key={i} className="inline-flex items-center rounded-full bg-muted text-xs"><button className="inline-flex items-center gap-1 px-2 py-0.5" onClick={() => setF(s.f)}><Bookmark className="size-3" />{s.name}</button><button aria-label="Ansicht löschen" className="pr-1.5" onClick={() => setSaved(saved.filter((_, j) => j !== i))}><X className="size-3" /></button></span>)}
    </div>}
  </div>
  return { filtered, ui }
}
