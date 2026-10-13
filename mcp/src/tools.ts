/** SDK-independent tool logic (unit-tested). */
import { z } from 'zod'
import { ProductQuery, validateSpec, describeLibrary } from '../../src/app/genui/schema.ts'
import { runQuery, pricePerPortion, protPerPortion, kcalPerPortion, isRankable, isReadyMeal, valueScore, type RowLike, type ValueCfg } from '../../src/app/genui/query.ts'
import type { UiBridge } from './bridge.ts'
import { loadData } from './data.ts'

export const summary = (r: RowLike, cfg: ValueCfg = {}) => ({
  id: r.id, name: r.name, brand: r.brandN ?? r.brand ?? '', store: r.store, stage: r.stage, readyMeal: isReadyMeal(r),
  price: r.price, pricePerPortion: round(pricePerPortion(r)), kcalPerPortion: round(kcalPerPortion(r), 0), proteinPerPortion: round(protPerPortion(r)),
  kcal100: r.kcal, protein100: r.p100, sugar100: r.sugar, salt100: r.salt, score: r.score, value: round(valueScore(r, cfg)), nutriScore: r.ns ?? null, url: r.url ?? null,
})
const round = (v: number | null, d = 2) => v == null ? null : Math.round(v * 10 ** d) / 10 ** d

export const ValueCfgShape = {
  healthWeight: z.number().min(0).max(1).optional().describe('Weight of health score vs. protein-per-€ in value (default 0.5, user-configurable – not decided by us)'),
  protPerEurCap: z.number().min(1).max(100).optional().describe('Cap for protein g per € in value score (default 10)'),
}
export const SearchShape = { query: z.string().min(1).max(200), stores: z.array(z.string()).max(30).optional(), includeGroceries: z.boolean().optional().describe('Include normal groceries (default: ready meals only)'), limit: z.number().int().min(1).max(100).optional() }
export const FilterShape = { filter: ProductQuery.describe('Product filter (GenUI ProductQuery)') }
export const RankShape = { by: z.enum(['value', 'score', 'pricePerPortion', 'price']).optional(), stores: z.array(z.string()).max(30).optional(), limit: z.number().int().min(1).max(100).optional(), filter: ProductQuery.optional(), ...ValueCfgShape }
export const MealPlanShape = {
  days: z.number().int().min(1).max(7).default(1), mealsPerDay: z.number().int().min(1).max(3).default(2),
  kcalPerDay: z.number().min(800).max(5000).optional(), proteinPerDay: z.number().min(0).max(400).optional(), budgetPerDay: z.number().min(0).max(200).optional(),
  stores: z.array(z.string()).max(30).optional(), vegetarian: z.boolean().optional(), vegan: z.boolean().optional(), ...ValueCfgShape,
}
export const SetViewShape = { view: z.string().regex(/^[\w-]+$/).max(60), params: z.record(z.string(), z.string().max(200)).optional() }
export const RenderShape = { spec: z.unknown().describe('GenUI v1 spec: ' + describeLibrary()) }

export async function searchProducts(a: z.infer<z.ZodObject<typeof SearchShape>>) {
  const { rows } = await loadData()
  return runQuery(rows, { q: a.query, stores: a.stores, readyMealsOnly: !a.includeGroceries, limit: a.limit ?? 20 }).map(r => summary(r))
}
export async function filterProducts(f: ProductQuery) {
  const { rows } = await loadData(); return runQuery(rows, { limit: 50, ...f }).map(r => summary(r))
}
export async function rankProducts(a: z.infer<z.ZodObject<typeof RankShape>>) {
  const { rows } = await loadData()
  const cfg = { healthWeight: a.healthWeight, protPerEurCap: a.protPerEurCap }
  const sort = a.by === 'value' || !a.by ? 'value' : a.by
  const base = runQuery(rows, { readyMealsOnly: true, ...(a.filter ?? {}), stores: a.stores ?? a.filter?.stores, limit: 100000 }).filter(isRankable)
  const list = runQuery(base, { ids: base.map(r => r.id), readyMealsOnly: false, sort, limit: a.limit ?? 30 }, cfg)
  return { method: sort === 'value' ? `value = ${cfg.healthWeight ?? 0.5}·healthScore + ${1 - (cfg.healthWeight ?? 0.5)}·min(protein/€ per portion, ${cfg.protPerEurCap ?? 10})/${cfg.protPerEurCap ?? 10}·100; only ready meals with price, shop, complete score and known portion ≥250 kcal` : `sorted by ${sort}`, items: list.map(r => summary(r, cfg)) }
}

/**
 * Greedy meal plan. Targets arrive as tool arguments from the local AI client and are NOT stored,
 * logged or forwarded – the server is stateless. Nothing is sent to the public site.
 */
export async function buildMealPlan(a: z.infer<z.ZodObject<typeof MealPlanShape>>) {
  const { rows } = await loadData()
  const cfg = { healthWeight: a.healthWeight, protPerEurCap: a.protPerEurCap }
  const days = a.days ?? 1, mpd = a.mealsPerDay ?? 2
  const kcalT = a.kcalPerDay ? a.kcalPerDay / mpd : null, protT = a.proteinPerDay ? a.proteinPerDay / mpd : null, budT = a.budgetPerDay != null ? a.budgetPerDay / mpd : null
  let pool = rows.filter(r => isReadyMeal(r) && isRankable(r) && (!a.stores?.length || a.stores.some(s => s.toLowerCase() === r.store.toLowerCase())))
  if (a.vegan) pool = pool.filter(r => r.vegan)
  else if (a.vegetarian) pool = runQuery(pool, { ids: pool.map(r => r.id), vegetarian: true, readyMealsOnly: false, limit: 100000 })
  if (budT != null) pool = pool.filter(r => pricePerPortion(r)! <= budT * 1.25)
  const fit = (r: RowLike) => {
    let s = valueScore(r, cfg) ?? 0
    if (kcalT) s -= Math.abs((kcalPerPortion(r) ?? 0) - kcalT) / kcalT * 40
    if (protT) s -= Math.max(0, protT - (protPerPortion(r) ?? 0)) / protT * 40
    return s
  }
  const ranked = [...pool].sort((x, y) => fit(y) - fit(x))
  const used = new Map<number, number>(), plan: { day: number; meals: ReturnType<typeof summary>[]; totals: { kcal: number; protein: number; price: number } }[] = []
  for (let d = 1; d <= days; d++) {
    const meals: RowLike[] = []
    for (const r of ranked) { if (meals.length >= mpd) break; if ((used.get(r.id) ?? 0) >= 2 || meals.some(m => m.id === r.id)) continue; meals.push(r); used.set(r.id, (used.get(r.id) ?? 0) + 1) }
    const t = meals.reduce((o, r) => ({ kcal: o.kcal + (kcalPerPortion(r) ?? 0), protein: o.protein + (protPerPortion(r) ?? 0), price: o.price + (pricePerPortion(r) ?? 0) }), { kcal: 0, protein: 0, price: 0 })
    plan.push({ day: d, meals: meals.map(r => summary(r, cfg)), totals: { kcal: Math.round(t.kcal), protein: round(t.protein, 1)!, price: round(t.price)! } })
  }
  const shop = new Map<number, { id: number; name: string; store: string; packs: number; price: number | null }>()
  for (const d of plan) for (const m of d.meals) { const e = shop.get(m.id) ?? { id: m.id, name: m.name, store: m.store, packs: 0, price: m.price }; e.packs++; shop.set(m.id, e) }
  const list = [...shop.values()].sort((x, y) => x.store.localeCompare(y.store))
  return { plan, shoppingList: list, total: round(list.reduce((s, e) => s + (e.price ?? 0) * e.packs, 0)), candidates: pool.length,
    note: 'Portions-Schätzung; Mehrportionen-Packungen ggf. teilen. Ersetzt keine medizinische oder Ernährungsberatung.' }
}

export async function setView(bridge: UiBridge, a: z.infer<z.ZodObject<typeof SetViewShape>>) { return bridge.call('setView', a) }
export async function renderCustomUi(bridge: UiBridge, spec: unknown) {
  const res = validateSpec(spec)
  if (!res.ok) return { ok: false, errors: res.errors }
  const out = await bridge.call('renderCustomUI', { spec: res.spec })
  return { ok: true, validationWarnings: res.errors, app: out }
}
