import { cn } from '@/lib'
type R = { variant_note?: string | null; price_condition?: string | null; score?: number | null }
/** Hinweis auf Varianten (z. B. „auch als Einzelportion“) – klein unter dem Produktnamen. */
export const VariantNote = ({ r, className }: { r: R; className?: string }) => r.variant_note
  ? <div data-testid="variant-note" className={cn('text-[11px] leading-tight text-muted-foreground', className)}>{r.variant_note}</div> : null
/** Preisbedingung (Aktion/Club/App, z. B. „NUR MIT APP“) – Text 1:1 aus den Daten. */
export const PriceCondition = ({ r, className }: { r: R; className?: string }) => r.price_condition
  ? <span data-testid="price-condition" title="Dieser Preis gilt nur unter dieser Bedingung" className={cn('inline-flex items-center whitespace-nowrap rounded border border-violet-300 bg-violet-50 px-1 text-[10px] font-medium text-violet-800 dark:bg-violet-950/40 dark:text-violet-300', className)}>{r.price_condition}</span> : null
/** Mittlere Gesundheit = Health-Score 30–44 (gelbes Band in scoreColor). */
export const isMediumHealth = (r: R) => r.score != null && r.score >= 30 && r.score < 45
export const PRICE_WINNER_MEDIUM = 'Preis-Sieger, Gesundheit mittel'
/** Label für Preis-Sieger (Preis-/Protein-pro-€-Listen), deren Health-Score nur mittel ist. */
export const PriceWinnerBadge = ({ r, className }: { r: R; className?: string }) => isMediumHealth(r)
  ? <span data-testid="price-winner-medium" title="Weit vorne beim Preis, Health-Score aber nur mittel (30–44)" className={cn('inline-flex items-center whitespace-nowrap rounded border border-amber-300 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300', className)}>{PRICE_WINNER_MEDIUM}</span> : null
