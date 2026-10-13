import { Beef, Flame, Droplets, Candy, Wheat, Euro, HeartPulse, type LucideIcon } from 'lucide-react'
import { fmt, type Row } from '@/lib'
import { cn } from '@/lib'

type Item = { icon: LucideIcon; label: string; value: string; tone?: 'good' | 'bad' }
export function nutrientItems(r: Row): Item[] {
  const it: Item[] = []
  if (r.protPor != null || r.p100 != null) it.push({ icon: Beef, label: 'Protein', value: r.protPor != null ? `${fmt(r.protPor, 0)} g` : `${fmt(r.p100)} g/100`, tone: (r.p100 ?? 0) >= 8 ? 'good' : undefined })
  if (r.kcalPor != null || r.kcal != null) it.push({ icon: Flame, label: 'Energie', value: r.kcalPor != null ? `${fmt(r.kcalPor, 0)} kcal` : `${fmt(r.kcal, 0)} kcal/100` })
  if (r.salt != null) it.push({ icon: Droplets, label: 'Salz', value: `${fmt(r.salt, 2)} g/100`, tone: r.salt > 1.25 ? 'bad' : r.salt < 0.6 ? 'good' : undefined })
  if (r.sugar != null) it.push({ icon: Candy, label: 'Zucker', value: `${fmt(r.sugar)} g/100`, tone: r.sugar > 5 ? 'bad' : undefined })
  if (r.fib != null) it.push({ icon: Wheat, label: 'Ballaststoffe', value: `${fmt(r.fib)} g/100`, tone: r.fib >= 3 ? 'good' : undefined })
  return it
}
/** Row of lucide-icon nutrient values; colour only signals good/bad. */
export function NutrientRow({ r, className }: { r: Row; className?: string }) {
  return <div className={cn('flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-foreground', className)}>
    {nutrientItems(r).map(({ icon: I, label, value, tone }) => <span key={label} title={label} className={cn('inline-flex items-center gap-1 tabular-nums', tone === 'good' && 'text-emerald-800 dark:text-emerald-300', tone === 'bad' && 'text-red-700 dark:text-red-400')}><I className="size-3.5" aria-hidden />{value}</span>)}
  </div>
}
export function PriceLine({ r }: { r: Row }) {
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
    <span className="inline-flex items-center gap-1 text-base font-semibold tabular-nums"><Euro className="size-4" />{fmt(r.price, 2)}</span>
    {r.eur10p != null && <span className="inline-flex items-center gap-1 tabular-nums"><Beef className="size-3.5" />{fmt(r.eur10p, 2)} €/10 g</span>}
    {r.score != null && <span className="inline-flex items-center gap-1 tabular-nums"><HeartPulse className="size-3.5" />{fmt(r.score, 0)}</span>}
  </div>
}
