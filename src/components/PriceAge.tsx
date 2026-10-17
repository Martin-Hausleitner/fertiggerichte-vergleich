import { cn } from '@/lib'
import { priceYear, isOldPrice } from '@/app/priceFresh'
type P = { price_date?: string | null; pstat?: string | null; price?: number | null }
/** Preisalter: alt = Preisdatum vor 2026 oder Status „Preis 2025“ (Regel in app/priceFresh.ts). */
export function priceAge(r: P): { old: boolean; year: string | null; date: string | null } {
  return { old: isOldPrice(r), year: priceYear(r), date: r.price_date ?? null }
}
/** Sichtbarer Hinweis „Preis von 2025 (TT.MM.JJJJ)“ bei Preisen vor 2026. */
export function OldPriceBadge({ r, className }: { r: P; className?: string }) {
  const a = priceAge(r); if (!a.old) return null
  return <span title="Preis nicht aktuell – im Shop prüfen" className={cn('inline-flex items-center whitespace-nowrap rounded border border-amber-300 bg-amber-50 px-1 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300', className)}>Preis von {a.year}{a.date && a.date.length >= 10 ? ` (${new Date(a.date).toLocaleDateString('de-AT')})` : ''}</span>
}
