/**
 * Pure product query engine for GenUI ProductQuery – works on data.json rows.
 * Shared by the browser renderer and the MCP server (no React, no '@/' imports).
 * Ready-meal guard mirrors src/app/meal.ts (sense-check 2026-10-13); keep in sync.
 */
import type { ProductQuery } from './schema'

export type RowLike = {
  id: number; name: string; brand?: string; brandN?: string; store: string; herst?: string; img?: string | null; url?: string | null
  price: number | null; size: number | null; portion?: number | null; kcal: number | null; p100: number | null; sugar: number | null; salt: number | null
  fat?: number | null; score: number | null; ns?: string | null; nova?: number | null; stage: string; vegan?: boolean; bio?: boolean
  dry?: boolean; nonfood?: boolean; incomplete?: boolean; pack?: string; psrc?: string | null; gang?: string; cprot?: string[]
}
const NONMEAL = /^\S+ lasagne$|lasagne (hartweizen)?$|lasagneblätter|lasagne ?teig|suppe-(abc|gerstl|sternderl|hörnchen)|suppennudeln|suppeneinlage|backerbsen|suppenpulver|pesto|\bsugo\b|topfencreme|mousse|pudding|cheesecake|strudel|dessert|kaiserschmarrn|milchreis/i
const frozen = (r: RowLike) => /tiefk|\bTK\b/i.test(r.pack ?? '')
export const isDryish = (r: RowLike) => !!r.dry || (r.kcal != null && r.kcal >= 300 && (r.fat == null || r.fat < 10) && !frozen(r))
export const isReadyMeal = (r: RowLike) => !r.nonfood && (r.stage === 'meal' || r.stage === 'stew') && !isDryish(r) && r.gang !== 'dessert' && !NONMEAL.test(r.name)
export function portionG(r: RowLike): number | null {
  const m = r.name.match(/(\d)\s*(portionen|port\.|er\b|x\b)/i)
  if (m && r.size) return r.size / +m[1]
  if (r.portion != null && r.portion !== 100 && r.portion > 0) return r.size ? Math.min(r.portion, r.size) : r.portion
  return null
}
export const pricePerPortion = (r: RowLike) => { const p = portionG(r); return r.price != null && r.size && p ? r.price * p / r.size : null }
export const protPerPortion = (r: RowLike) => { const p = portionG(r); return r.p100 != null && p ? r.p100 * p / 100 : null }
export const kcalPerPortion = (r: RowLike) => { const p = portionG(r); return r.kcal != null && p ? r.kcal * p / 100 : null }
export const isRankable = (r: RowLike) => r.score != null && !r.incomplete && r.price != null && r.price > 0 && !!r.store && !r.store.startsWith('unbekannt') && pricePerPortion(r) != null && (kcalPerPortion(r) ?? 0) >= 250

/** Configurable value score (no hard-coded 50/50): w·score + (1-w)·min(protein per €, cap)/cap·100 */
export type ValueCfg = { healthWeight?: number; protPerEurCap?: number }
export function valueScore(r: RowLike, c: ValueCfg = {}) {
  const w = c.healthWeight ?? 0.5, cap = c.protPerEurCap ?? 10
  const pp = pricePerPortion(r), pr = protPerPortion(r)
  if (r.score == null || pp == null || pr == null || pp <= 0) return null
  return w * r.score + (1 - w) * Math.min(pr / pp, cap) / cap * 100
}

const MEATY = /fleisch|rind|schwein|huhn|hähn|pute|speck|schinken|wurst|fisch|lachs|thunfisch|garnele|kalb|lamm|ente|chicken|beef|pork|tuna|salami|gulasch|kebab|döner/i
export const isVegetarianGuess = (r: RowLike) => !!r.vegan || !MEATY.test(`${r.name} ${(r.cprot ?? []).join(' ')}`)

export function runQuery<T extends RowLike>(rows: T[], q: ProductQuery, cfg: ValueCfg = {}): T[] {
  let out = rows
  if (q.ids?.length) { const s = new Set(q.ids); out = out.filter(r => s.has(r.id)) }
  const ready = q.readyMealsOnly ?? !q.ids?.length
  out = out.filter(r => {
    if (r.nonfood) return false
    if (ready && !isReadyMeal(r)) return false
    if (q.q) { const t = q.q.toLowerCase().split(/\s+/).filter(Boolean); const hay = `${r.name} ${r.brandN ?? r.brand ?? ''} ${r.store} ${r.herst ?? ''}`.toLowerCase(); if (!t.every(x => hay.includes(x))) return false }
    if (q.stores?.length && !q.stores.some(s => s.toLowerCase() === r.store.toLowerCase())) return false
    if (q.stage?.length && !q.stage.includes(r.stage as any)) return false
    if (q.vegan && !r.vegan) return false
    if (q.vegetarian && !isVegetarianGuess(r)) return false
    if (q.bio && !r.bio) return false
    if (q.minScore != null && (r.score ?? -1) < q.minScore) return false
    if (q.maxPrice != null && (r.price == null || r.price > q.maxPrice)) return false
    if (q.maxPricePerPortion != null) { const v = pricePerPortion(r); if (v == null || v > q.maxPricePerPortion) return false }
    if (q.minProtein100 != null && (r.p100 ?? -1) < q.minProtein100) return false
    if (q.maxKcal100 != null && (r.kcal == null || r.kcal > q.maxKcal100)) return false
    if (q.maxSugar100 != null && (r.sugar == null || r.sugar > q.maxSugar100)) return false
    if (q.maxSalt100 != null && (r.salt == null || r.salt > q.maxSalt100)) return false
    return true
  })
  if (q.sort) {
    const key: Record<NonNullable<ProductQuery['sort']>, (r: RowLike) => number | null> = {
      score: r => r.score, price: r => r.price, pricePerPortion, ppk: r => r.price != null && r.size ? r.price / r.size * 1000 : null,
      protein: r => r.p100, value: r => valueScore(r, cfg), kcal: r => r.kcal,
    }
    const k = key[q.sort]
    const desc = (q.order ?? (['score', 'protein', 'value'].includes(q.sort) ? 'desc' : 'asc')) === 'desc'
    if (q.sort === 'value') out = out.filter(isRankable)
    out = out.filter(r => k(r) != null).sort((a, b) => desc ? k(b)! - k(a)! : k(a)! - k(b)!)
  }
  return out.slice(0, q.limit ?? 24)
}
