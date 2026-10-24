/** Sensecheck 33 (4): ONE rule for "is this price current?" – used by the '✓ aktuell' badge (components/product.tsx) and
 *  the 'Preis von 2024' hint (components/PriceAge.tsx). pstat 'live 2026' alone is not enough: heisse-preise 'latest-canonical'
 *  keeps a product listed while its price date is 2023/2024, and the export marks old prices 'Preis veraltet / evtl. ausgelistet'. */
import { isStalePrice, isDelisted } from './meal'
type P = { pstat?: string | null; price?: number | null; price_date?: string | null; price_stale?: boolean | null; rank_excluded_reason?: string | null; variant_note?: string | null; price_status?: string | null; price_unconfirmed?: boolean | null; sold_out?: boolean | null; availability_checked?: string | null }
export const isLive = (p?: string | null) => !!p && /live|aktuell/i.test(p)
export const priceYear = (r: P): string | null => r.price_date?.slice(0, 4) ?? (r.pstat?.match(/20\d\d/)?.[0] ?? null)
/** Sensecheck 41 (2): 'old' = the price is stale by its DATE (export: supermarkets > 90 days, online shops > 6 months → price_stale),
 *  replacing the calendar-year rule (year < 2026), which called #1183 (7.11.2025, Hofer, delisted) old only because of the year and missed
 *  #7 BILLA Lasagne (19.7.2026, 91 days) → that showed 'Preis veraltet' without a date. */
export const isOldPrice = (r: P) => r.price != null && isStalePrice(r as any)
/** Sensecheck 39 (5): supermarket price older than 30 days (export: price_status 'unbestätigt' / price_unconfirmed) – 'unbestätigt' wins over
 *  the source status pstat 'live 2026' (#334/#349/#766 showed '✓ aktuell' + Preisstatus 'live 2026' next to price_status 'unbestätigt'). */
export const isPriceUnconfirmed = (r: P) => r.price != null && (r.price_status === 'unbestätigt' || !!r.price_unconfirmed) && !isStalePrice(r as any)
/** '✓ aktuell' = live status AND price date 2026 AND not marked stale AND not unconfirmed by the export. */
export const isPriceCurrent = (r: P) => isLive(r.pstat) && !isOldPrice(r) && !isStalePrice(r as any) && !isPriceUnconfirmed(r) && !isDelisted(r as any) && !r.sold_out   // sensecheck 54 P3: sold-out rows (#2851) get no '✓ aktuell'
const _d = (d?: string | null) => d && /^\d{4}-\d{2}-\d{2}/.test(d) ? new Date(d.slice(0, 10)).toLocaleDateString('de-AT') : null
/** Text for 'Preisstatus' / 'Preisstand' fields: 'Preis unbestätigt (Stand …)' wins over pstat; otherwise pstat.
 *  Sensecheck 40 (2): pstat is a source bucket ('Preis 2025' = any heisse-preise Altpreis, 'live 2026' = still listed by the source) and
 *  contradicted the price date – #1182 Primana Tortelloni Käse-Sahne showed 'Preis von 2023 (31.12.2023)' next to 'Preis 2025'. A price
 *  dated before 2026 is labelled by its own date: 'Preis veraltet (Stand …)' when the export marks it stale (veraltet / ausgelistet),
 *  else 'Preis von <Jahr> (Stand …)'. */
/** pstat names a year that is not the year of the price date */
const pstatYearClash = (r: P) => { const py = r.pstat?.match(/20\d\d/)?.[0]; return !!py && !!r.price_date && py !== r.price_date.slice(0, 4) }
export const priceStatusLabel = (r: P): string | null => {
  // sensecheck 54 P3: sold out wins over pstat 'live 2026'
  if (r.sold_out) return `ausverkauft${_d(r.availability_checked) ? ` (geprüft am ${_d(r.availability_checked)})` : ''}`
  if (isPriceUnconfirmed(r)) return `Preis unbestätigt${_d(r.price_date) ? ` (Stand ${_d(r.price_date)})` : ''}`
  if (isOldPrice(r)) return `Preis veraltet${_d(r.price_date) ? ` (Stand ${_d(r.price_date)})` : ''}`
  // sensecheck 41 (2): delisted, price itself within the window (e.g. #1216 Hofer Cevapcici, shelf price 12.10.2026, not on hofer.at)
  if (isDelisted(r as any) && _d(r.price_date)) return `Preis vom ${_d(r.price_date)} · evtl. ausgelistet`
  if (pstatYearClash(r) && _d(r.price_date)) return `Preis vom ${_d(r.price_date)}`   // e.g. #465 FAIRHOF Spare Ribs: pstat 'Preis 2025', hofer.at 2026-10-17
  if (r.pstat === 'Preis veraltet') return null   // stale bucket without a stale flag (cannot happen with the SC41 export) – never a bare label
  return r.pstat ?? null
}
/** Sensecheck 40 (2): the source bucket pstat as a badge only when it does not contradict the price date (old prices show OldPriceBadge). */
export const showPstatBadge = (r: P) => !!r.pstat && !r.sold_out && !isOldPrice(r) && !pstatYearClash(r) && r.pstat !== 'Preis veraltet' && !isDelisted(r as any)
export const UNCONFIRMED_TIP = 'Supermarktpreis älter als 30 Tage und seitdem nicht neu bestätigt – im Shop prüfen'
