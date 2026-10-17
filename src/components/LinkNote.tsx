import { linkLabel } from '../app/linkKind'
// Small hint next to a shop link that only leads to a search/category page or PDF (no invented product URL).
export function LinkNote({ url, className = '' }: { url?: string | null; className?: string }) {
  const l = linkLabel(url); if (!l) return null
  return <span data-linknote className={'inline-flex items-center rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 ' + className} title="Der Link führt nur zu einer Shop-Suche bzw. Übersichtsseite, nicht direkt zum Produkt.">{l}</span>
}
