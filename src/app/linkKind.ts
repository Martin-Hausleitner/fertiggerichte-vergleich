// UI follow-up Sensecheck 28: shop links that are not a product page (search result, category/offer page, PDF).
// Only classifies the existing url; never constructs or guesses a product URL.
export type LinkKind = 'product' | 'search' | 'category' | 'pdf' | null
export function linkKind(url?: string | null): LinkKind {
  if (!url) return null
  let u: URL; try { u = new URL(url) } catch { return null }
  const p = u.pathname, h = u.host
  if (u.searchParams.has('q') || /\/(search|suche|suchergebnisse)(\/|$)/i.test(p)) return 'search'
  if (/\.pdf$/i.test(p)) return 'pdf'
  if (/\/angebote(\/|$)|angebote-der-woche/i.test(p)) return 'category'
  if (/(^|\.)wokostswas\.at$/.test(h) && /^\/k\d+\//.test(p)) return 'category'
  if (/(^|\.)bofrost\.at$/.test(h) && p.startsWith('/shop/') && !p.endsWith('.html')) return 'category'
  return 'product'
}
export const isGenericLink = (url?: string | null) => { const k = linkKind(url); return k === 'search' || k === 'category' || k === 'pdf' }
export function linkLabel(url?: string | null): string | null {
  const k = linkKind(url)
  return k === 'search' || k === 'category' ? 'Shop-Suche, keine Produktseite' : k === 'pdf' ? 'Nährwert-PDF, keine Produktseite' : null
}
