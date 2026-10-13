import type { Row } from '@/lib'
import { isReadyMeal, isRankable, pricePerPortion, kcalPerPortion, protPerPortion } from './meal'
import { clientScore } from './scoring'

/** Persönliche Ziele gemäß score_v2.md §8 – NUR localStorage (Art. 9 DSGVO), nie URL/Server. */
export type PlanTargets = { days: number; meals_per_day: number; kcal_target: number; protein_target_g: number; salt_max_g: number; satfat_max_g: number; sugar_max_g: number; fiber_target_g: number; budgetPerDay: number; vegan?: boolean; vegetarian?: boolean; bio?: boolean; allergens?: string[] }
/** Referenzwerte, auf die day_pct in den Daten bezogen ist. */
export const DAY_REF = { kcal: 2000, protein: 50, salt: 6, satfat: 20, sugar: 90, fiber: 30 }
export type Nutr = { kcal: number; protein: number; salt: number; satfat: number; sugar: number; fiber: number }
/** per_portion = day_pct × Referenz / 100 */
export const portionNutr = (r: Row): Nutr | null => r.day_pct ? Object.fromEntries(Object.entries(DAY_REF).map(([k, v]) => [k, ((r.day_pct as any)[k] ?? 0) * v / 100])) as Nutr : null
export type PlanMeal = { id: number; name: string; store: string; brand: string; price: number; kcal: number; protein: number; score: number; n: Nutr | null }
export type PlanDay = { day: number; meals: PlanMeal[]; kcal: number; protein: number; cost: number; salt: number; satfat: number; sugar: number; fiber: number }
export type ShoppingItem = { id: number; name: string; store: string; qty: number; cost: number }
export type MealPlan = { days: PlanDay[]; shopping: ShoppingItem[]; totals: { kcal: number; protein: number; cost: number }; candidates: number; note?: string }
export const DEFAULT_TARGETS: PlanTargets = { days: 1, meals_per_day: 3, kcal_target: 2000, protein_target_g: 50, salt_max_g: 6, satfat_max_g: 20, sugar_max_g: 90, fiber_target_g: 30, budgetPerDay: 15, allergens: [] }

/** Greedy-Planer: wählt je Mahlzeit das Gericht, das Ziel-kcal/Protein/Budget je Slot am besten trifft (Score als Tiebreaker), max. 2× dasselbe Gericht pro Woche. */
export function buildMealPlan(rows: Row[], chains: Set<string> | null, t: PlanTargets): MealPlan {
  const cand = rows.filter(r => isReadyMeal(r) && isRankable(r) && (!chains || chains.has(r.store)) && (!t.vegan || r.vegan || r.cprot?.includes('vegan')) && (!t.vegetarian || r.vegan || r.cprot?.includes('vegan') || r.cprot?.includes('vegetarisch')) && (!t.bio || r.bio))
    .map(r => ({ r, price: pricePerPortion(r)!, kcal: kcalPerPortion(r)!, protein: protPerPortion(r) ?? 0, score: clientScore(r) ?? 0 }))
  const used: Record<number, number> = {}; const days: PlanDay[] = []
  const slot = { kcal: t.kcal_target / t.meals_per_day, protein: t.protein_target_g / t.meals_per_day, cost: t.budgetPerDay / t.meals_per_day, salt: t.salt_max_g / t.meals_per_day }
  for (let d = 0; d < t.days; d++) {
    const meals: PlanMeal[] = []
    for (let m = 0; m < t.meals_per_day; m++) {
      let best: typeof cand[0] | null = null, bv = Infinity
      for (const c of cand) {
        if ((used[c.r.id] ?? 0) >= 2 || meals.some(x => x.id === c.r.id)) continue
        const v = Math.abs(c.kcal - slot.kcal) / slot.kcal + Math.max(0, slot.protein - c.protein) / slot.protein * 1.5 + Math.max(0, c.price - slot.cost) / slot.cost * 2 + Math.max(0, (portionNutr(c.r)?.salt ?? 0) - slot.salt) / slot.salt - c.score / 100
        if (v < bv) { bv = v; best = c }
      }
      if (!best) break
      used[best.r.id] = (used[best.r.id] ?? 0) + 1
      meals.push({ id: best.r.id, name: best.r.name, store: best.r.store, brand: best.r.brandN, price: best.price, kcal: best.kcal, protein: best.protein, score: best.score, n: portionNutr(best.r) })
    }
    days.push({ day: d + 1, meals, kcal: meals.reduce((a, x) => a + x.kcal, 0), protein: meals.reduce((a, x) => a + x.protein, 0), cost: meals.reduce((a, x) => a + x.price, 0), ...Object.fromEntries((['salt', 'satfat', 'sugar', 'fiber'] as const).map(k => [k, meals.reduce((a, x) => a + (x.n?.[k] ?? 0), 0)])) as any })
  }
  const sh: Record<number, ShoppingItem> = {}
  days.forEach(d => d.meals.forEach(m => { const r = rows.find(x => x.id === m.id)!; const it = sh[m.id] ??= { id: m.id, name: m.name, store: m.store, qty: 0, cost: 0 }; it.qty++; it.cost = it.qty * (r.price ?? 0) }))
  const shopping = Object.values(sh).sort((a, b) => a.store.localeCompare(b.store))
  return { days, shopping, candidates: cand.length, totals: { kcal: days.reduce((a, d) => a + d.kcal, 0), protein: days.reduce((a, d) => a + d.protein, 0), cost: shopping.reduce((a, s) => a + s.cost, 0) }, note: cand.length === 0 ? 'Keine passenden Fertiggerichte in deinen Shops.' : undefined }
}
