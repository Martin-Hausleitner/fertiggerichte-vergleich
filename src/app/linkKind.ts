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
// Sensecheck 36 (2): the shop link may open ANOTHER pack size (data.json row.linkPack, fertig export_app linkPack check):
// 'Shopseite evtl. andere Packungsgröße' or, for weight-priced SPAR articles, 'Shopseite zeigt Kilopreis (Gewichtsware)'.
export type LinkPackLike = { kind?: string; note?: string | null; detail?: string | null; shopPack?: string | null } | null | undefined
export const LINKPACK_NOTE = 'Shopseite evtl. andere Packungsgröße'
export function linkPackLabel(p: LinkPackLike): string | null {
  if (!p || !p.kind) return null
  return p.note || (p.kind === 'weight' ? 'Shopseite zeigt Kilopreis (Gewichtsware)' : LINKPACK_NOTE)
}
/** One label for the shop-link icon/tooltip: generic link first (search/category/PDF), else the pack-size notice. */
export function rowLinkLabel(r: { url?: string | null; linkPack?: LinkPackLike }): string | null {
  return linkLabel(r.url) ?? (r.url ? linkPackLabel(r.linkPack) : null)
}
