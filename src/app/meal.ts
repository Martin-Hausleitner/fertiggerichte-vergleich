/** EINE Quelle für Fertiggericht-Regeln, Portionen und die Preis-Leistungs-Formel.
 *  Genutzt von App-Rankings, Hofer Top 30, Ernährungsplan, window.goodChoice und GenUI (src/app/genui/query.ts).
 *  Strukturell typisiert, damit sowohl Row als auch genui RowLike passen. Keine Imports → auch im MCP-Server nutzbar. */
export type MealRow = {
  name: string; store: string; stage: string; price: number | null; size: number | null; score: number | null; kcal: number | null; p100: number | null
  portion?: number | null; fat?: number | null; pack?: string; gang?: string | null; dry?: boolean; nonfood?: boolean; incomplete?: boolean; psrc?: string | null
  portion_g?: number | null; kcal_meal?: number | null; meal_class?: string | null; price_status?: string | null; shop_status?: string | null
  segment?: string | null; component?: string | boolean | null; allergens?: string[] | null; cprot?: string[]; cdish?: string[]; sugar?: number | null; score_parts?: Record<string, number> | null
}
type Row = MealRow

/** Harte Mahlzeit-Prüfung (spiegelt die Datenregel von HCB): pro Portion 400–900 kcal und ≥ 20 g Protein. */
export const MEAL_RULES = { kcalMin: 400, kcalMax: 900, proteinMin: 20, multiPortionMinG: 800, splitPortionG: 400 } as const

// Client-seitige Schutzregeln (Sense-Check 1+2, 2026-10-13). Ersetzt nicht die Korrektur in score.py (HCB).
const NONMEAL = /^\S+ lasagne$|lasagne (hartweizen)?$|lasagneblätter|lasagne ?teig|suppe-(abc|gerstl|sternderl|hörnchen)|suppennudeln|suppeneinlage|backerbsen|suppenpulver|pesto|\bsugo\b|topfencreme|mousse|pudding|cheesecake|strudel|dessert|kaiserschmarrn|milchreis|götterspeise|jogurella|joghurt|grie(ß|ss)brei|panna cotta|tiramisu|kompott|\bcreme\b|cr[eè]me br[uû]l[eé]e|lavakuchen|schokokuchen|brownie|muffin|tarte au/i
/** Snacks/Beilagen: nur ausgeschlossen, wenn HCB nicht explizit light_meal/snack_side gesetzt hat. */
const SNACK = /toastk[äa]se|toast ?scheiben|toastbrot|wurstsalat|burger|baguette|sandwich|\bsub\b|wrap\b|(protein|vollkorn|) ?brote?\b|br[öo]tchen|semmel|weckerl|ramyun|ramen|noodle ?cup|cup ?noodle|nudelsnack|instant ?nudel|chapagetti|\bbistro\b|aufschnitt|k[äa]sescheiben/i
/** Reine Protein-Komponenten ohne Beilage (TK-Fisch, Nuggets, Schnitzel) – nur wenn kein „mit …“ im Namen. */
const COMPONENT = /fischst[äa]bchen|nuggets|knusperfilet|schlemmerfilet|backfisch|filetschnitzel|cordon bleu|chicken wings|\bwings\b|frikadellen|fleischlaberl|cevapcici|leberk[äa]se/i
export const isComponentOnly = (r: Row) => r.component != null && r.component !== '' ? r.component !== false && r.component !== 'none' : !hasDataClass(r) && COMPONENT.test(r.name) && !/\bmit\b|\bund\b.*(reis|p[üu]ree|kartoffel|gem[üu]se|nudel|pommes)/i.test(r.name)
const isFrozen = (r: Row) => /tiefk|\bTK\b/i.test(r.pack ?? '')
/** Trockenware: Server-Flag ODER ≥ 300 kcal/100 g, wenig Fett und nicht tiefgekühlt. */
export const isDryish = (r: Row) => !!r.dry || r.meal_class === 'dry' || (r.kcal != null && r.kcal >= 300 && (r.fat == null || r.fat < 10) && !isFrozen(r))
export const isNonMeal = (r: Row) => r.gang === 'dessert' || NONMEAL.test(r.name)
/** Datenseitige Klassifikation (HCB) hat Vorrang; Namens-Guard nur, wenn meal_class fehlt/unknown. */
const hasDataClass = (r: Row) => !!r.meal_class && r.meal_class !== 'unknown'
export const isSnackLike = (r: Row) => !hasDataClass(r) && SNACK.test(r.name)
/** Fertiggericht = meal/stew bzw. meal_class meal/light_meal/multi_portion; kein Dessert, Snack, Trockenprodukt, Meal-Kit. */
export const isReadyMeal = (r: Row) => {
  if (r.nonfood || r.segment === 'meal_kit' || isNonMeal(r) || isSnackLike(r) || isComponentOnly(r)) return false
  if (r.meal_class && r.meal_class !== 'unknown') return ['meal', 'light_meal', 'multi_portion'].includes(r.meal_class) && !isDryish(r)
  return (r.stage === 'meal' || r.stage === 'stew') && !isDryish(r)
}

/** Ist die Portion geschätzt (Großpackung ≥ 800 g ohne echte Portionsangabe → ~400 g)? */
export const portionEstimated = (r: Row) => { const p = r.portion_g ?? r.portion; return !!r.size && r.size >= MEAL_RULES.multiPortionMinG && (p == null || p === 100 || p >= r.size) && !/(\d)\s*(portionen|port\.|er\b|x\b)/i.test(r.name) }
/** Portionsgröße in g; Platzhalter 100 g = unbekannt; Mehrportionen aus Name („2 Portionen“, „4er“); Großpackungen geteilt. */
export function portionG(r: Row): number | null {
  const m = r.name.match(/(\d)\s*(portionen|port\.|er\b|x\b)/i)
  if (m && r.size && +m[1] > 1) return r.size / +m[1]
  if (portionEstimated(r)) return r.size! / Math.max(1, Math.round(r.size! / MEAL_RULES.splitPortionG))
  if (r.portion_g != null && r.portion_g > 0 && r.portion_g !== 100) return r.portion_g
  if (r.portion != null && r.portion !== 100 && r.portion > 0) return r.size ? Math.min(r.portion, r.size) : r.portion
  return null
}
/** eur_meal = price × portion_g / size */
export const pricePerPortion = (r: Row) => { const p = portionG(r); return r.price != null && r.size && p ? r.price * p / r.size : null }
export const kcalPerPortion = (r: Row) => { const p = portionG(r); if (r.kcal_meal != null && !portionEstimated(r) && (r.portion_g == null || p === r.portion_g)) return r.kcal_meal; return r.kcal != null && p ? r.kcal * p / 100 : null }
export const protPerPortion = (r: Row) => { const p = portionG(r); return r.p100 != null && p ? r.p100 * p / 100 : null }
/** Vollwertige Mahlzeit: 400–900 kcal und ≥ 20 g Protein pro Portion. */
export const isFullMeal = (r: Row) => { const k = kcalPerPortion(r), p = protPerPortion(r); return k != null && p != null && k >= MEAL_RULES.kcalMin && k <= MEAL_RULES.kcalMax && p >= MEAL_RULES.proteinMin }
/** Für Rankings: Fertiggericht + echter Preis/Laden + vollständiger Score + harte Mahlzeit-Prüfung. */
export const isRankable = (r: Row) => isReadyMeal(r) && r.price_status !== 'unknown' && r.shop_status !== 'unknown' && r.score != null && !r.incomplete && r.price != null && r.price > 0 && !!r.store && !r.store.startsWith('unbekannt') && pricePerPortion(r) != null && isFullMeal(r)
export const lastPriceDate = (rows: Row[]) => { let d = ''; rows.forEach(r => { const m = r.psrc?.match(/\d{4}-\d{2}-\d{2}/); if (m && m[0] > d) d = m[0] }); return d || null }

/** ---- Preis-Leistung: EINE Formel für alle Ansichten ----
 *  wert = w · Score + (1 − w) · min(Protein pro € / Deckel, 1) · 100
 *  Protein pro € = Protein je Portion ÷ Preis je Portion. Score = Health Score v2, Zucker-Teil mit sugarW skaliert.
 *  Defaults = bisher (w 0,5, Deckel 20 g/€). Mindestwerte für Rankings: Score ≥ 30, ≥ 400 kcal/Portion. */
export type ValueCfg = { healthWeight?: number; protPerEurCap?: number; sugarW?: number; minScore?: number; minKcal?: number }
export const VALUE_DEFAULTS = { healthWeight: 0.5, protPerEurCap: 20, sugarW: 1, minScore: 30, minKcal: 400 } as const
export const scoreOf = (r: Row, c: ValueCfg = {}) => r.score == null ? null : Math.max(0, Math.min(100, r.score + (r.score_parts?.sugar ?? 0) * ((c.sugarW ?? 1) - 1)))
export const protPerEuro = (r: Row) => { const pp = pricePerPortion(r), pr = protPerPortion(r); return pp && pr != null ? pr / pp : null }
export function valueOf(r: Row, c: ValueCfg = {}) {
  const s = scoreOf(r, c), ppe = protPerEuro(r); if (s == null || ppe == null) return null
  const w = c.healthWeight ?? VALUE_DEFAULTS.healthWeight, cap = c.protPerEurCap ?? VALUE_DEFAULTS.protPerEurCap
  return w * s + (1 - w) * Math.min(ppe / cap, 1) * 100
}
/** Gilt für Preis-Leistungs- und €/Protein-Rankings: rankable + Mindest-Score + Mindest-kcal. */
export const passesRankMin = (r: Row, c: ValueCfg = {}) => isRankable(r) && (scoreOf(r, c) ?? 0) >= (c.minScore ?? VALUE_DEFAULTS.minScore) && (kcalPerPortion(r) ?? 0) >= Math.max(MEAL_RULES.kcalMin, c.minKcal ?? VALUE_DEFAULTS.minKcal)
