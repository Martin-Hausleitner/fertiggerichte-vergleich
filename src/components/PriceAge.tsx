import { cn } from '@/lib'
type P = { price_date?: string | null; pstat?: string | null; price?: number | null }
/** Preisalter: alt = Preisdatum vor 2026 oder Status „Preis 2025“. */
export function priceAge(r: P): { old: boolean; year: string | null; date: string | null } {
  const d = r.price_date ?? null; const y = d?.slice(0, 4) ?? (r.pstat?.match(/20\d\d/)?.[0] ?? null)
  return { old: r.price != null && y != null && +y < 2026, year: y, date: d }
}
/** Sichtbarer Hinweis „Preis von 2025 (TT.MM.JJJJ)“ bei Preisen vor 2026. */
export function OldPriceBadge({ r, className }: { r: P; className?: string }) {
  const a = priceAge(r); if (!a.old) return null
  return <span title="Preis nicht aktuell – im Shop prüfen" className={cn('inline-flex items-center whitespace-nowrap rounded border border-amber-300 bg-amber-50 px-1 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300', className)}>Preis von {a.year}{a.date && a.date.length >= 10 ? ` (${new Date(a.date).toLocaleDateString('de-AT')})` : ''}</span>
}
