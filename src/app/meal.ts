/** EINE Quelle für Fertiggericht-Regeln, Portionen und die Preis-Leistungs-Formel.
 *  Genutzt von App-Rankings, Hofer Top 30, Ernährungsplan, window.goodChoice und GenUI (src/app/genui/query.ts).
 *  Strukturell typisiert, damit sowohl Row als auch genui RowLike passen. Keine Imports → auch im MCP-Server nutzbar. */
export type MealRow = {
  name: string; store: string; stage: string; price: number | null; size: number | null; score: number | null; kcal: number | null; p100: number | null
  portion?: number | null; fat?: number | null; pack?: string; gang?: string | null; dry?: boolean; nonfood?: boolean; incomplete?: boolean; psrc?: string | null
  portion_g?: number | null; kcal_meal?: number | null; meal_class?: string | null; price_status?: string | null; shop_status?: string | null
  segment?: string | null; brand?: string | null; dupOf?: number; component?: string | boolean | null; allergens?: string[] | null; cprot?: string[]; cdish?: string[]; sugar?: number | null; score_parts?: Record<string, number> | null; nonMeal?: { kind: string; reason?: string | null } | null; sauceInPack?: unknown
}
type Row = MealRow

/** Harte Mahlzeit-Prüfung (spiegelt die Datenregel von HCB): pro Portion 400–900 kcal und ≥ 20 g Protein. */
export const MEAL_RULES = { kcalMin: 400, kcalMax: 900, proteinMin: 20, multiPortionMinG: 800, splitPortionG: 400 } as const

// Client-seitige Schutzregeln (Sense-Check 1+2, 2026-10-13; SC63 P1a Sync). Ersetzt nicht die Korrektur in score.py (HCB).
const NONMEAL = /^lasagne (hartweizen)?$|lasagneblätter|lasagne ?teig|suppe-(abc|gerstl|sternderl|hörnchen)|suppennudeln|suppeneinlage|backerbsen|suppenpulver|topfencreme|mousse|pudding|cheesecake|strudel|dessert|kaiserschmarrn|milchreis|götterspeise|jogurella|joghurt(?!-[a-zäöüß-]*huhn)|grie(ß|ss)brei|panna cotta|tiramisu|kompott|\bcreme\b(?! spinaci)|cr[eè]me br[uû]l[eé]e|lavakuchen|schokokuchen|brownie|muffin|tarte au|back[- ]?(camembert|emmentaler|gouda)/i
export const CONDIMENT = /pesto|\bsugo\b|\btahina?\b|sesampaste/i
export const NOT_CONDIMENT = /intermezzo|baguette|bruschetta|gnocchi|tortellini|tortelloni|ravioli|rigatoni|spaghetti|penne|pasta|lasagne|chicken|huhn|h[äa]hnchen|lachsfilet|salat|bowl|wrap|falafel/i
export const PLAIN_VEG = /^(bio )?(gem[üu]se|spinat|rotkraut|blaukraut|sauerkraut|erbsen|bohnen|linsen|mais|karotten|brokkoli|blumenkohl|kohlsprossen)\b/i
export const PLAIN_VEG_MEAL = /lasagne|pizza|risotto|moussaka|cannelloni|flammkuchen|gratin|strudel|bolognese|pfanne|curry|eintopf|suppe|bowl|auflauf|gericht|teller|tascherl|kn[öo]del|nudel|reis|sp[äa]tzle|schupfnudel|gnocchi|tortellini|ravioli/i
/** Snacks/Beilagen: nur ausgeschlossen, wenn HCB nicht explizit light_meal/snack_side gesetzt hat. */
const SNACK = /toastk[äa]se|toast ?scheiben|toastbrot|wurstsalat|burger|baguette|sandwich|\bsub\b|wrap\b|(protein|vollkorn|) ?brote?\b|br[öo]tchen|semmel|weckerl|ramyun|ramen|noodle ?cup|cup ?noodle|nudelsnack|instant ?nudel|chapagetti|\bbistro\b|aufschnitt|k[äa]sescheiben/i
/** Reine Protein-Komponenten ohne Beilage (TK-Fisch, Nuggets, Schnitzel) – nur wenn kein „mit …“ im Namen. */
const COMPONENT = /fischst[äa]bchen|nuggets|knusperfilet|schlemmerfilet|backfisch|filetschnitzel|cordon bleu|chicken wings|\bwings\b|frikadellen|fleischlaberl|cevapcici|leberk[äa]se/i
/** Fleisch-/Ersatzprodukt-Komponenten (Sense-Check 4): Planted, Sous-vide, pures Fleisch – Komponente, solange kein Beilagenwort vorkommt. Gilt auch bei meal_class, nur ein explizites component-Feld hat Vorrang. */
const PROTEIN_ONLY = /\bplanted\b|sous[- ]?vide|pulled (pork|chicken|beef)|h[äa]hn(chen|chen)?brust|h[üu]hnerbrust|putenbrust|hendlbrust|\bsteaks?\b|kotelett|spare ?ribs|\bribs\b|schweinsbraten$|beef jerky/i
const SIDE_WORD = /reis|p[üu]ree|kartoffel|erd[äa]pfel|gem[üu]se|nudel|pasta|spaghetti|penne|pommes|kn[öo]del|sp[äa]tzle|bulgur|couscous|quinoa|polenta|salat|bowl|curry|wok|risotto|gnocchi|tortilla|wrap|pfanne|eintopf|suppe|sauce|so[ßs]e|bohnen|linsen|kraut|rösti|nockerl/i
const SIDE_MIT = /\bmit\b|\bund\b.*(reis|p[üu]ree|kartoffel|gem[üu]se|nudel|pommes)/i
export const isComponentOnly = (r: Row) => r.component != null && r.component !== '' ? r.component !== false && r.component !== 'none'
  : (PROTEIN_ONLY.test(r.name) && !SIDE_WORD.test(r.name)) || (!hasDataClass(r) && COMPONENT.test(r.name) && !SIDE_MIT.test(r.name))
const isFrozen = (r: Row) => /tiefk|\bTK\b/i.test(r.pack ?? '')
/** Trockenware: Server-Flag ODER ≥ 300 kcal/100 g, wenig Fett und nicht tiefgekühlt. */
export const isDryish = (r: Row) => !!r.dry || r.meal_class === 'dry' || (r.kcal != null && r.kcal >= 300 && (r.fat == null || r.fat < 10) && !isFrozen(r))
/** Trockenprodukte/Würzmischungen und Babynahrung – immer raus, unabhängig von meal_class (Sense-Check 3). */
const SEASONING = /\bfix\b|basis[- ]?fix|knorr basis|maggi (fix|idee|basis)|bouillon|w[üu]rfel|suppenw[üu]rze|w[üu]rzmischung|gew[üu]rzmischung|sauce ?(pulver|binder)|so[ßs]enbinder|instant ?suppe|tassen ?suppe|packerlsuppe|fixbeutel/i
const BABY = /\bhipp\b|ab dem \d+\. ?(lebens)?(jahr|monat)|nach dem \d+\. monat|babynahrung|kindermen[üu]|\bbaby\b|beikost|alete|bebivita/i
/** Bistro-Baguettes: Snack, auch wenn die Daten sie als Mahlzeit führen. */
const BAGUETTE = /\bbistro\b|baguette/i
const BABY_BRAND = /\b(hipp|alete|bebivita|beba|aptamil|babylove|freche freunde)\b/i
export const isBabyFood = (r: Row) => r.segment === 'baby' || r.segment === 'baby_food' || r.meal_class === 'baby' || BABY.test(r.name) || BABY_BRAND.test(r.brand ?? '')
export const isNonMeal = (r: Row) =>
  !!r.nonMeal ||
  r.gang === 'dessert' ||
  r.meal_class === 'dessert' ||
  r.meal_class === 'dry' ||
  NONMEAL.test(r.name) ||
  (CONDIMENT.test(r.name) && !NOT_CONDIMENT.test(r.name)) ||
  (PLAIN_VEG.test(r.name) && !PLAIN_VEG_MEAL.test(r.name) && r.stage === 'veg') ||
  SEASONING.test(r.name) ||
  isBabyFood(r) ||
  BAGUETTE.test(r.name)
/** row.nonMeal (sensecheck 37/38, evidence-backed list) is always excluded. Datenseitige Klassifikation (HCB) hat Vorrang; Namens-Guard nur, wenn meal_class fehlt/unknown. */
const hasDataClass = (r: Row) => !!r.meal_class && r.meal_class !== 'unknown'
export const isSnackLike = (r: Row) => !hasDataClass(r) && SNACK.test(r.name)
/** Fertiggericht = meal/stew bzw. meal_class meal/light_meal/multi_portion; kein Dessert, Snack, Trockenprodukt, Meal-Kit. */
export const isReadyMeal = (r: Row) => {
  if (r.dupOf != null || r.nonfood || r.segment === 'meal_kit' || !!r.nonMeal || r.gang === 'dessert' || r.meal_class === 'dessert' || isBabyFood(r)) return false
  /** SC63 P1a: Pipeline-rankable/rankableLight hat Vorrang vor Namens-Regex (#2825, #2200, #2909, #3085). */
  if (!r.incomplete && !(r as any).sold_out && ((r as any).rankable === true || (r as any).rankableLight === true)) return !isDryish(r)
  if (isNonMeal(r) || isSnackLike(r) || isComponentOnly(r)) return false
  if (!(r as any).sauceInPack) {
    if (r.stage && r.stage !== 'meal' && r.stage !== 'stew') return false
    if (r.gang === 'zutat' || r.gang === 'beilage' || r.gang === 'sauce' || r.gang === 'snack' || r.gang === 'drink') return false
  }
  if (r.meal_class && r.meal_class !== 'unknown') return ['meal', 'light_meal', 'multi_portion'].includes(r.meal_class) && !isDryish(r)
  return (r.stage === 'meal' || r.stage === 'stew' || !!(r as any).sauceInPack) && !isDryish(r)
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
const samePortion = (r: Row, p: number | null) =>
  !portionEstimated(r) && (p == null || (r.portion_g != null ? Math.abs(p - r.portion_g) < 1 : (r.portion == null || r.portion === 100 || Math.abs(p - r.portion) < 1)))
/** eur_meal = price × portion_g / size */
export const pricePerPortion = (r: Row) => { const p = portionG(r); return r.price != null && r.size && p ? r.price * p / r.size : null }
export const kcalPerPortion = (r: Row) => {
  const p = portionG(r)
  if (typeof (r as any).kcalPor === 'number' && samePortion(r, p)) return (r as any).kcalPor
  if (typeof r.kcal_meal === 'number' && samePortion(r, p)) return r.kcal_meal
  return r.kcal != null && p ? r.kcal * p / 100 : null
}
/** SC63 P1a: pipeline protPor (gerundet) hat Vorrang, wenn die Portion übereinstimmt (#2938: 19.98 vs 20.0). */
export const protPerPortion = (r: Row) => {
  const p = portionG(r)
  if (typeof (r as any).protPor === 'number' && samePortion(r, p)) return (r as any).protPor
  return r.p100 != null && p ? Math.round(r.p100 * p / 10) / 10 : null
}
/** Vollwertige Mahlzeit: 400–900 kcal und ≥ 20 g Protein pro Portion. */
export const isFullMeal = (r: Row) => { const k = kcalPerPortion(r), p = protPerPortion(r); return k != null && p != null && k >= MEAL_RULES.kcalMin && k <= MEAL_RULES.kcalMax && p >= MEAL_RULES.proteinMin }
/** Für Rankings: Fertiggericht + echter Preis/Laden + vollständiger Score + harte Mahlzeit-Prüfung. */
/** Preis veraltet / evtl. ausgelistet (Pipeline: rank_excluded_reason bzw. variant_note) → nie in Rankings. */
export const STALE_PRICE_TEXT = 'Preis veraltet / evtl. ausgelistet'
/** Sensecheck 41 (2): 'Preis veraltet' comes ONLY from the price date (export price_age_class: supermarkets > 90 days, online shops > 6 months
 *  → price_stale + note 'Preis veraltet / evtl. ausgelistet'). Delisting ('evtl. ausgelistet', e.g. not on hofer.at) is availability: isDelisted. */
const _notes = (r: Row) => [(r as any).rank_excluded_reason, (r as any).variant_note].filter((t: unknown) => typeof t === 'string').join(' · ')
export const isStalePrice = (r: Row) => (r as any).price_stale === true || /preis veraltet/i.test(_notes(r))
export const isDelisted = (r: Row) => /ausgelistet|nicht mehr auf \S+ gelistet/i.test(_notes(r))
/** not rankable for price reasons: stale price date or delisted */
export const isPriceExcluded = (r: Row) => isStalePrice(r) || isDelisted(r)
export const isRankable = (r: Row) => isReadyMeal(r) && (!r.stage || r.stage === 'meal' || r.stage === 'stew') && !(r as any).sold_out && !isPriceExcluded(r) && r.price_status !== 'unknown' && r.shop_status !== 'unknown' && r.score != null && !r.incomplete && r.price != null && r.price > 0 && !!r.store && !r.store.startsWith('unbekannt') && pricePerPortion(r) != null && isFullMeal(r)
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
export const isLightMeal = (r: Row) => r.meal_class === 'light_meal'
/** Haupt-Rankings: vollwertige Gerichte, leichte Mahlzeiten haben ein eigenes Ranking (passesLightRank). */
const isRankDup = (r: Row) => (((r as any).flags ?? []) as string[]).some((f: string) => /^Duplikat|nicht in Rankings|kein Fertiggericht-Ranking/i.test(f))
const isRankExcluded = (r: Row) =>
  r.dupOf != null ||
  !!r.incomplete ||
  !!(r as any).sold_out ||
  r.price_status === 'unknown' ||
  r.shop_status === 'unknown' ||
  isPriceExcluded(r) ||
  r.meal_class === 'multi_portion' ||
  (r as any).delivers_4020 === false ||
  !!(r as any).linz_excluded ||
  isRankDup(r)

export const passesRankMin = (r: Row, c: ValueCfg = {}) =>
  ((r as any).rankable === undefined || (r as any).rankable === true) &&
  !isLightMeal(r) &&
  !isRankExcluded(r) &&
  isRankable(r) &&
  (scoreOf(r, c) ?? 0) >= (c.minScore ?? VALUE_DEFAULTS.minScore) &&
  (kcalPerPortion(r) ?? 0) >= Math.max(MEAL_RULES.kcalMin, c.minKcal ?? VALUE_DEFAULTS.minKcal)

/** Separates Ranking „Leichte Mahlzeiten“ (meal_class light_meal): Fertiggericht, Preis + Score, Mindest-Score – ohne 400-kcal/20-g-Prüfung. */
export const passesLightRank = (r: Row, c: ValueCfg = {}) =>
  ((r as any).rankableLight === undefined || (r as any).rankableLight === true) &&
  isLightMeal(r) &&
  !isRankExcluded(r) &&
  r.gang !== 'vorspeise' &&
  r.gang !== 'frühstück' &&
  !portionEstimated(r) &&
  // SC64 P1.2: explicit pipeline rankableLight=true (Dead-Zone rescue) is trusted down to 240 kcal / 11 g protein
  (kcalPerPortion(r) ?? 0) >= ((r as any).rankableLight === true ? 240 : 300) &&
  (protPerPortion(r) ?? 0) >= ((r as any).rankableLight === true ? 11 : 15) &&
  isReadyMeal(r) &&
  r.price != null &&
  r.price > 0 &&
  !!r.store &&
  !r.store.startsWith('unbekannt') &&
  r.score != null &&
  (scoreOf(r, c) ?? 0) >= (c.minScore ?? VALUE_DEFAULTS.minScore) &&
  pricePerPortion(r) != null
/** GTIN aus psrc (z. B. „GTIN 4260237451068“). */
export const gtinOf = (r: { ean?: string | number | null; psrc?: string | null }) => (r.ean && /^\d{8,14}$/.test(String(r.ean).trim()) ? String(r.ean).trim() : null) ?? (r.psrc ?? '').match(/(?:\/product\/|\b)(\d{8,14})\b/)?.[1] ?? null
const completeness = (r: object) => Object.values(r).filter(v => v != null && v !== '' && !(Array.isArray(v) && !v.length)).length
/** Markiert Zeilen mit gleicher GTIN im selben Laden: die vollständigste bleibt, die anderen bekommen dupOf (Index bleibt stabil für topPLI/topLight). */
export function dedupeGtin<T extends { id?: number; store: string; ean?: string | number | null; psrc?: string | null; dupOf?: number }>(rows: T[]): (T & { dupOf?: number })[] {
  const best = new Map<string, T>()
  for (const r of rows) { const g = gtinOf(r); if (!g) continue; const k = g + '|' + r.store, o = best.get(k); if (!o || completeness(r) > completeness(o)) best.set(k, r) }
  return rows.map(r => { const g = gtinOf(r), b = g ? best.get(g + '|' + r.store) : undefined; return b && b !== r ? { ...r, dupOf: r.dupOf ?? b.id } : r })
}
