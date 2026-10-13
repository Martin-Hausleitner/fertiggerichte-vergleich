/**
 * Pure product query engine for GenUI ProductQuery – works on data.json rows.
 * Shared by the browser renderer and the MCP server (no React, no '@/' imports).
 * Ready-meal rules are imported from src/app/meal.ts (single source).
 */
import type { ProductQuery } from './schema.js'

export type RowLike = {
  id: number; name: string; brand?: string; brandN?: string; store: string; herst?: string; img?: string | null; url?: string | null
  price: number | null; size: number | null; portion?: number | null; kcal: number | null; p100: number | null; sugar: number | null; salt: number | null
  fat?: number | null; score: number | null; ns?: string | null; nova?: number | null; stage: string; vegan?: boolean; bio?: boolean
  dry?: boolean; nonfood?: boolean; incomplete?: boolean; pack?: string; psrc?: string | null; gang?: string; cprot?: string[]
}
// Fertiggericht-Regeln: EINE Quelle → src/app/meal.ts (dedupliziert)
import { isDryish, isReadyMeal, portionG, pricePerPortion, protPerPortion, kcalPerPortion, isRankable } from '../meal.js'
export { isDryish, isReadyMeal, portionG, pricePerPortion, protPerPortion, kcalPerPortion, isRankable }

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
