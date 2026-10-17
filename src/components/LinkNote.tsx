import { linkLabel, linkPackLabel, type LinkPackLike } from '../app/linkKind'
// Small hint next to a shop link that only leads to a search/category page or PDF (no invented product URL),
// or (sensecheck 36) whose product page may show another pack size (row.linkPack).
const AMBER = 'inline-flex items-center rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 '
export function LinkNote({ url, pack, className = '' }: { url?: string | null; pack?: LinkPackLike; className?: string }) {
  const l = linkLabel(url)
  if (l) return <span data-linknote className={AMBER + className} title="Der Link führt nur zu einer Shop-Suche bzw. Übersichtsseite, nicht direkt zum Produkt.">{l}</span>
  const p = url ? linkPackLabel(pack) : null; if (!p) return null
  return <span data-linknote data-testid="linkpack-note" className={AMBER + className} title={pack?.detail || p}>{p}</span>
}
/** Sensecheck 36: the evidence line under the shop link in the product details. */
export function LinkPackDetail({ url, pack }: { url?: string | null; pack?: LinkPackLike }) {
  if (!url || !linkPackLabel(pack) || !pack?.detail) return null
  return <div data-testid="linkpack-detail" className="text-[11px] text-amber-800 dark:text-amber-300">{pack.detail}</div>
}
