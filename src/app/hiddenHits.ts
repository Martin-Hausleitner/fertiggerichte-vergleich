/** Sensecheck 39 (4) / 40 (6): search hits that exist but are hidden by the Explorer's default hiding filters – the stage selection
 *  (StageBar default Komplettmahlzeit + Eintopf/Suppe, so Beilagen, Zutaten/Rohware, Protein-/Sauce-Komponenten are off), 'Trockenprodukte'
 *  and '„nur Preis“'. A search with 0 or few (≤ FEW_HITS) visible hits whose other matches are only hidden that way gets a hint
 *  'X Treffer in ausgeblendeten Beilagen/… – anzeigen'; the button lifts exactly those hiding filters (user filters stay).
 *  Pure functions so the gate can test them (scripts/test_sc33_ui.mjs). */
type R = { name: string; brand?: string | null; herst?: string | null; store: string; stage: string; dry?: boolean; priceOnly?: boolean; nonfood?: boolean; nonMeal?: unknown }
export const STAGE_PLURAL: Record<string, string> = { meal: 'Komplettmahlzeiten', stew: 'Eintöpfen/Suppen', prot: 'Protein-Komponenten', sauce: 'Saucen', side: 'Beilagen', veg: 'Gemüse-Beilagen', base: 'Zutaten/Rohware' }
/** show the hint while the visible result list has at most this many rows */
export const FEW_HITS = 5
export type Hidden = { n: number; visible: number; stages: string[]; needDry: boolean; needPo: boolean; nonMeal: number }
export const matchesQuery = (r: R, qq: string) => (r.name + ' ' + (r.brand ?? '') + ' ' + (r.herst ?? '')).toLowerCase().includes(qq)
export function hiddenHits<T extends R>(rows: T[], q: string, o: { keep: (r: T) => boolean; stageSel: string[]; stageFixed: boolean; dry: boolean; po: boolean; visible?: number }): Hidden | null {
  const qq = q.trim().toLowerCase(); if (!qq) return null
  const visible = o.visible ?? 0; if (visible > FEW_HITS) return null
  const m = rows.filter(r => !r.nonfood && !r.store.startsWith('unbekannt') && matchesQuery(r, qq) && o.keep(r))
  const offStage = (r: T) => !o.stageFixed && !o.stageSel.includes(r.stage)
  const h = m.filter(r => offStage(r) || (!o.dry && r.dry) || (!o.po && r.priceOnly))
  if (!h.length) return null
  return { n: h.length, visible, stages: [...new Set(h.filter(offStage).map(r => r.stage))], needDry: !o.dry && h.some(r => r.dry), needPo: !o.po && h.some(r => r.priceOnly), nonMeal: h.filter(r => r.nonMeal).length }
}
export function hiddenHitsText(h: Hidden): string {
  const parts = [...h.stages.map(s => STAGE_PLURAL[s] ?? s), ...(h.needDry ? ['Trockenprodukten'] : []), ...(h.needPo ? ['„nur Preis“-Zeilen'] : [])]
  const nm = h.nonMeal ? ` (${h.nonMeal === h.n ? 'alle' : h.nonMeal} kein Fertiggericht, z. B. Zutat/Beilage)` : ''
  return `${h.visible ? 'Außerdem ' : ''}${h.n} Treffer in ausgeblendeten ${parts.join('/')}${nm} –`
}
/** the selection that reveals the hidden hits: stages added to the StageBar, dry / „nur Preis“ switched on */
export const revealStages = (stageSel: string[], h: Hidden) => [...stageSel, ...h.stages.filter(s => !stageSel.includes(s))]
