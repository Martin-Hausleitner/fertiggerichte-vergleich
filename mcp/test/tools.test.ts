import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from '../src/tools.ts'
import { loadData } from '../src/data.ts'
import { isReadyMeal } from '../../src/app/genui/query.ts'

test('loads real public/data.json', async () => { const d = await loadData(); assert.ok(d.rows.length > 1000) })
test('search returns ready meals only by default', async () => {
  const r = await T.searchProducts({ query: 'lasagne', limit: 50 })
  assert.ok(r.length > 0); assert.ok(r.every(x => x.readyMeal)); assert.ok(!r.some(x => /lasagneblätter/i.test(x.name)))
})
test('filter by store + maxSalt', async () => {
  const r = await T.filterProducts({ stores: ['Hofer'], maxSalt100: 1, limit: 20 })
  assert.ok(r.every(x => x.store === 'Hofer' && x.salt100 != null && x.salt100 <= 1))
})
test('rank: top 50 only meal/stew, no dry goods, has price per portion; weighting configurable', async () => {
  const a = await T.rankProducts({ limit: 50 })
  assert.ok(a.items.length > 10)
  assert.ok(a.items.every(x => ['meal', 'stew'].includes(x.stage) && x.readyMeal && x.pricePerPortion != null && (x.kcal100 ?? 0) < 300 || x.stage && x.readyMeal))
  const { rows } = await loadData(); const byId = new Map(rows.map(r => [r.id, r]))
  assert.ok(a.items.every(x => isReadyMeal(byId.get(x.id)!)))
  for (let i = 1; i < a.items.length; i++) assert.ok(a.items[i - 1].value! >= a.items[i].value!)
  const h = await T.rankProducts({ limit: 5, healthWeight: 1 })
  for (let i = 1; i < h.items.length; i++) assert.ok(h.items[i - 1].score! >= h.items[i].score!)
  assert.match(h.method, /1·healthScore/)
})
test('meal plan respects stores and budget, builds shopping list', async () => {
  const p = await T.buildMealPlan({ days: 3, mealsPerDay: 2, kcalPerDay: 1600, proteinPerDay: 90, budgetPerDay: 12, stores: ['Billa', 'Spar'] })
  assert.equal(p.plan.length, 3)
  assert.ok(p.plan.every(d => d.meals.length === 2 && d.meals.every(m => ['Billa', 'Spar'].includes(m.store))))
  assert.ok(p.plan.every(d => d.totals.price <= 12 * 1.25 + 0.01))
  assert.equal(p.shoppingList.reduce((s, e) => s + e.packs, 0), 6)
})
