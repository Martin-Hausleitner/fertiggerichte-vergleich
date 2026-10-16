import { cn } from '@/lib'
type R = { variant_note?: string | null; price_condition?: string | null; score?: number | null }
/** Hinweis auf Varianten (z. B. „auch als Einzelportion“) – klein unter dem Produktnamen. */
export const VariantNote = ({ r, className }: { r: R; className?: string }) => r.variant_note
  ? <div data-testid="variant-note" className={cn('text-[11px] leading-tight text-muted-foreground', className)}>{r.variant_note}</div> : null
type PCI = { text?: string | null; source_url?: string | null; checked?: string | null }
/** Nur https-Links mit gültiger URL werden verlinkt. */
export const safeHttps = (u?: string | null) => { if (!u) return null; try { const x = new URL(u); return x.protocol === 'https:' ? x : null } catch { return null } }
/** Preisbedingung (Aktion/Club/App, z. B. „NUR MIT APP“) – Text 1:1 aus den Daten; Quelle als Tooltip, https-Quelle zusätzlich als Link. */
export const PriceCondition = ({ r, className }: { r: R & { price_condition_info?: PCI | null }; className?: string }) => {
  const i = r.price_condition_info, text = r.price_condition ?? i?.text; if (!text) return null
  const u = safeHttps(i?.source_url), tip = `Preis gilt nur unter dieser Bedingung${u ? ` · Quelle: ${u.host}` : ''}${i?.checked ? ` · geprüft ${new Date(i.checked).toLocaleDateString('de-AT')}` : ''}`
  const cls = cn('inline-flex items-center gap-0.5 whitespace-nowrap rounded border border-violet-300 bg-violet-50 px-1 text-[10px] font-medium text-violet-800 dark:bg-violet-950/40 dark:text-violet-300', u && 'hover:underline', className)
  return u ? <a data-testid="price-condition" href={u.href} target="_blank" rel="noopener noreferrer nofollow" title={tip} className={cls} onClick={e => e.stopPropagation()}>{text}<span aria-hidden>↗</span></a>
    : <span data-testid="price-condition" title={tip} className={cls}>{text}</span>
}
/** Mittlere Gesundheit = Health-Score 30–44 (gelbes Band in scoreColor). */
export const isMediumHealth = (r: R) => r.score != null && r.score >= 30 && r.score < 45
export const PRICE_WINNER_MEDIUM = 'Preis-Sieger, Gesundheit mittel'
/** Label für Preis-Sieger (Preis-/Protein-pro-€-Listen), deren Health-Score nur mittel ist. */
export const PriceWinnerBadge = ({ r, className }: { r: R; className?: string }) => isMediumHealth(r)
  ? <span data-testid="price-winner-medium" title="Weit vorne beim Preis, Health-Score aber nur mittel (30–44)" className={cn('inline-flex items-center whitespace-nowrap rounded border border-amber-300 bg-amber-50 px-1.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300', className)}>{PRICE_WINNER_MEDIUM}</span> : null
