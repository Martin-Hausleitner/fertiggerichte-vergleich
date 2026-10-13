import type { Row } from '@/lib'
import { isReadyMeal, isRankable, pricePerPortion, kcalPerPortion, protPerPortion } from './meal'
import { clientScore } from './scoring'

export type PlanTargets = { days: number; mealsPerDay: number; kcalPerDay: number; proteinPerDay: number; budgetPerDay: number; vegetarian?: boolean }
export type PlanMeal = { id: number; name: string; store: string; brand: string; price: number; kcal: number; protein: number; score: number }
export type PlanDay = { day: number; meals: PlanMeal[]; kcal: number; protein: number; cost: number }
export type ShoppingItem = { id: number; name: string; store: string; qty: number; cost: number }
export type MealPlan = { days: PlanDay[]; shopping: ShoppingItem[]; totals: { kcal: number; protein: number; cost: number }; candidates: number; note?: string }
export const DEFAULT_TARGETS: PlanTargets = { days: 1, mealsPerDay: 2, kcalPerDay: 1400, proteinPerDay: 80, budgetPerDay: 12 }

/** Greedy-Planer: wählt je Mahlzeit das Gericht, das Ziel-kcal/Protein/Budget je Slot am besten trifft (Score als Tiebreaker), max. 2× dasselbe Gericht pro Woche. */
export function buildMealPlan(rows: Row[], chains: Set<string> | null, t: PlanTargets): MealPlan {
  const cand = rows.filter(r => isReadyMeal(r) && isRankable(r) && (!chains || chains.has(r.store)) && (!t.vegetarian || r.vegan || r.cprot?.includes('vegan') || r.cprot?.includes('vegetarisch')))
    .map(r => ({ r, price: pricePerPortion(r)!, kcal: kcalPerPortion(r)!, protein: protPerPortion(r) ?? 0, score: clientScore(r) ?? 0 }))
  const used: Record<number, number> = {}; const days: PlanDay[] = []
  const slot = { kcal: t.kcalPerDay / t.mealsPerDay, protein: t.proteinPerDay / t.mealsPerDay, cost: t.budgetPerDay / t.mealsPerDay }
  for (let d = 0; d < t.days; d++) {
    const meals: PlanMeal[] = []
    for (let m = 0; m < t.mealsPerDay; m++) {
      let best: typeof cand[0] | null = null, bv = Infinity
      for (const c of cand) {
        if ((used[c.r.id] ?? 0) >= 2 || meals.some(x => x.id === c.r.id)) continue
        const v = Math.abs(c.kcal - slot.kcal) / slot.kcal + Math.max(0, slot.protein - c.protein) / slot.protein * 1.5 + Math.max(0, c.price - slot.cost) / slot.cost * 2 - c.score / 100
        if (v < bv) { bv = v; best = c }
      }
      if (!best) break
      used[best.r.id] = (used[best.r.id] ?? 0) + 1
      meals.push({ id: best.r.id, name: best.r.name, store: best.r.store, brand: best.r.brandN, price: best.price, kcal: best.kcal, protein: best.protein, score: best.score })
    }
    days.push({ day: d + 1, meals, kcal: meals.reduce((a, x) => a + x.kcal, 0), protein: meals.reduce((a, x) => a + x.protein, 0), cost: meals.reduce((a, x) => a + x.price, 0) })
  }
  const sh: Record<number, ShoppingItem> = {}
  days.forEach(d => d.meals.forEach(m => { const r = rows.find(x => x.id === m.id)!; const it = sh[m.id] ??= { id: m.id, name: m.name, store: m.store, qty: 0, cost: 0 }; it.qty++; it.cost = it.qty * (r.price ?? 0) }))
  const shopping = Object.values(sh).sort((a, b) => a.store.localeCompare(b.store))
  return { days, shopping, candidates: cand.length, totals: { kcal: days.reduce((a, d) => a + d.kcal, 0), protein: days.reduce((a, d) => a + d.protein, 0), cost: shopping.reduce((a, s) => a + s.cost, 0) }, note: cand.length === 0 ? 'Keine passenden Fertiggerichte in deinen Shops.' : undefined }
}
