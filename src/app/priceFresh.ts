/** Sensecheck 33 (4): ONE rule for "is this price current?" – used by the '✓ aktuell' badge (components/product.tsx) and
 *  the 'Preis von 2024' hint (components/PriceAge.tsx). pstat 'live 2026' alone is not enough: heisse-preise 'latest-canonical'
 *  keeps a product listed while its price date is 2023/2024, and the export marks old prices 'Preis veraltet / evtl. ausgelistet'. */
import { isStalePrice } from './meal'
type P = { pstat?: string | null; price?: number | null; price_date?: string | null; rank_excluded_reason?: string | null; variant_note?: string | null }
export const isLive = (p?: string | null) => !!p && /live|aktuell/i.test(p)
export const priceYear = (r: P): string | null => r.price_date?.slice(0, 4) ?? (r.pstat?.match(/20\d\d/)?.[0] ?? null)
/** Preisdatum vor 2026 oder Status „Preis 2025“. */
export const isOldPrice = (r: P) => { const y = priceYear(r); return r.price != null && y != null && +y < 2026 }
/** '✓ aktuell' = live status AND price date 2026 AND not marked stale by the export. */
export const isPriceCurrent = (r: P) => isLive(r.pstat) && !isOldPrice(r) && !isStalePrice(r as any)
