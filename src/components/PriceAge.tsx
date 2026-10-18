import { cn } from '@/lib'
import { priceYear, isOldPrice, priceStatusLabel } from '@/app/priceFresh'
type P = { price_date?: string | null; pstat?: string | null; price?: number | null; rank_excluded_reason?: string | null; variant_note?: string | null; price_status?: string | null; price_unconfirmed?: boolean | null }
/** Preisalter: alt = Preisdatum vor 2026 oder Status „Preis 2025“ (Regel in app/priceFresh.ts). */
export function priceAge(r: P): { old: boolean; year: string | null; date: string | null } {
  return { old: isOldPrice(r), year: priceYear(r), date: r.price_date ?? null }
}
/** Sichtbarer Hinweis bei Preisen vor 2026. Sensecheck 41 (1): the text comes from priceStatusLabel (app/priceFresh.ts), the same path as
 *  'Preisstatus' / 'Preisstand' – a stale price reads 'Preis veraltet (Stand 31.12.2023)' (#1182, #1183 showed 'Preis von 2023 (31.12.2023)'
 *  in the product-detail price header), a non-stale old price 'Preis von 2025 (Stand 4.2.2025)'. */
export function OldPriceBadge({ r, className }: { r: P; className?: string }) {
  const a = priceAge(r); if (!a.old) return null
  const label = (r.price_date && priceStatusLabel(r)) || `Preis von ${a.year}`
  return <span data-testid="old-price" title="Preis nicht aktuell – im Shop prüfen" className={cn('inline-flex items-center whitespace-nowrap rounded border border-amber-300 bg-amber-50 px-1 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300', className)}>{label}</span>
}
