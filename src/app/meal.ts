import type { Row } from '@/lib'
// Client-seitige Schutzregeln (Sense-Check 2026-10-13). Ersetzt nicht die Korrektur in score.py (HCB).
const NONMEAL = /^\S+ lasagne$|lasagne (hartweizen)?$|lasagneblätter|lasagne ?teig|suppe-(abc|gerstl|sternderl|hörnchen)|suppennudeln|suppeneinlage|backerbsen|suppenpulver|pesto|\bsugo\b|topfencreme|mousse|pudding|cheesecake|strudel|dessert|kaiserschmarrn|milchreis|götterspeise|jogurella|joghurt|grie(ß|ss)brei|panna cotta|tiramisu|kompott|\bcreme\b/i
const isFrozen = (r: Row) => /tiefk|\bTK\b/i.test(r.pack ?? '')
/** Trockenware: Server-Flag ODER ≥ 300 kcal/100 g, wenig Fett und nicht tiefgekühlt. */
export const isDryish = (r: Row) => r.dry || (r.kcal != null && r.kcal >= 300 && (r.fat == null || r.fat < 10) && !isFrozen(r))
export const isNonMeal = (r: Row) => (r as any).gang === 'dessert' || NONMEAL.test(r.name)
/** Fertiggericht = Stufe meal/stew, nicht Trockenware, keine Nicht-Mahlzeit, kein Nonfood. */
export const isReadyMeal = (r: Row) => !r.nonfood && (r.stage === 'meal' || r.stage === 'stew') && !isDryish(r) && !isNonMeal(r)

/** Portionsgröße in g; Platzhalter 100 g = unbekannt; Mehrportionen-Packungen aus Name („2 Portionen“, „4er“). */
export function portionG(r: Row): number | null {
  const m = r.name.match(/(\d)\s*(portionen|port\.|er\b|x\b)/i)
  if (m && r.size) return r.size / +m[1]
  if (r.portion != null && r.portion !== 100 && r.portion > 0) return r.size ? Math.min(r.portion, r.size) : r.portion
  return null
}
/** eur_meal = price × portion_g / size */
export const pricePerPortion = (r: Row) => { const p = portionG(r); return r.price != null && r.size && p ? r.price * p / r.size : null }
export const kcalPerPortion = (r: Row) => { const p = portionG(r); return r.kcal != null && p ? r.kcal * p / 100 : null }
export const protPerPortion = (r: Row) => { const p = portionG(r); return r.p100 != null && p ? r.p100 * p / 100 : null }
/** Für Rankings: echter Preis + Laden + vollständiger Score + bekannte Portion mit ≥ 250 kcal. */
export const isRankable = (r: Row) => r.score != null && !r.incomplete && r.price != null && r.price > 0 && !!r.store && !r.store.startsWith('unbekannt') && pricePerPortion(r) != null && (kcalPerPortion(r) ?? 0) >= 250
export const lastPriceDate = (rows: Row[]) => { let d = ''; rows.forEach(r => { const m = r.psrc?.match(/\d{4}-\d{2}-\d{2}/); if (m && m[0] > d) d = m[0] }); return d || null }
