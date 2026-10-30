// SC84 P2(3): "Preise zuletzt aktualisiert" zeigte nur das jüngste Datum (Billa 30.10.), obwohl andere Shops älter sind.
// Jetzt: Preisstand je Shop (ältester–jüngster Shop-Stand), Tooltip mit Datum je Shop.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
for (const f of ['Heute.tsx', 'Tabelle.tsx']) {
  const s = readFileSync(new URL(`../src/views/${f}`, import.meta.url), 'utf8')
  assert.ok(!/zuletzt aktualisiert/.test(s), `${f}: kein irreführendes „zuletzt aktualisiert“ (Maximum über alle Shops)`)
  assert.ok(/fmtPriceSpan\(priceDateSpan\(R\)\)/.test(s), `${f}: Preisstand je Shop via priceDateSpan`)
}
const m = readFileSync(new URL('../src/app/meal.ts', import.meta.url), 'utf8')
const src = m.slice(m.indexOf('export const priceDateSpan'), m.indexOf('export const lastPriceDate')).replace(/export const /g, 'const ').replace(/: \{ store\?: string; psrc\?: string \| null \}\[\]/, '').replace(/\(sp: ReturnType<typeof priceDateSpan>\)/, '(sp)').replace(/const byStore: Record<string, string> = \{\}/, 'const byStore = {}').replace(/\(d: string\)/, '(d)')
const { priceDateSpan, fmtPriceSpan } = new Function(src + '; return { priceDateSpan, fmtPriceSpan }')()
const rows = [{ store: 'Billa', psrc: 'shop.billa.at API 2026-10-30 | vorher 2026-10-12' }, { store: 'Billa', psrc: 'x 2026-10-13' }, { store: 'Spar', psrc: 'y 2026-10-18' }, { store: 'dm', psrc: 'z 2026-10-13' }, { store: 'dm', psrc: null }]
const sp = priceDateSpan(rows)
assert.deepEqual(sp, { oldest: '2026-10-13', newest: '2026-10-30', byStore: { Billa: '2026-10-30', Spar: '2026-10-18', dm: '2026-10-13' } })
const f = fmtPriceSpan(sp)
assert.equal(f.label, 'Preisstand je Shop 13.10.2026–30.10.2026')
assert.equal(f.title, 'Billa: 30.10.2026 · Spar: 18.10.2026 · dm: 13.10.2026')
assert.equal(fmtPriceSpan(priceDateSpan([{ store: 'A', psrc: '2026-10-30' }])).label, 'Preisstand 30.10.2026')
assert.equal(priceDateSpan([{ store: 'A' }]), null)
const d = JSON.parse(readFileSync(new URL('../public/data.json', import.meta.url), 'utf8'))
const live = priceDateSpan(d.rows)
assert.ok(live && live.oldest <= live.newest && Object.keys(live.byStore).length >= 5, 'data.json: Preisstände je Shop vorhanden')
console.log('test_price_span ok', fmtPriceSpan(live).label)
