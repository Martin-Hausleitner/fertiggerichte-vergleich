// Sensecheck 33 (1)/(4): alsoText wording for same-store other sizes; '✓ aktuell' follows the price staleness.
// Run: node scripts/test_sc33_ui.mjs [public/data.json]   (part of prepush_gate.sh, fast section)
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const load = async f => { const o = await build({ entryPoints: [new URL(f, import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' }); return import('data:text/javascript;base64,' + Buffer.from(o.outputFiles[0].text).toString('base64')) }
const F = await load('../src/app/priceFresh.ts'), L = await load('../src/lib.ts')
// (4) badge rule
assert.equal(F.isPriceCurrent({ pstat: 'live 2026', price: 3.55, price_date: '2026-10-13' }), true)
assert.equal(F.isPriceCurrent({ pstat: 'live 2026', price: 3.55, price_date: '2024-04-23' }), false)   // #456 before the fix
assert.equal(F.isPriceCurrent({ pstat: 'live 2026', price: 6.49, price_date: '2026-05-19', variant_note: 'Preis veraltet / evtl. ausgelistet' }), false)
assert.equal(F.isPriceCurrent({ pstat: 'Preis 2025', price: 4.99, price_date: '2025-05-14' }), false)
assert.equal(F.isOldPrice({ pstat: 'live 2026', price: 1, price_date: '2023-01-01' }), true)
// (1) alsoText
assert.deepEqual(L.alsoText({ alsoAt: ['MPreis'], alsoPack: [{ store: 'Spar', kind: 'size', label: '800 g', sameStore: true }, { store: 'Billa', kind: 'size', label: '800 g' }] }), ['auch bei MPreis', 'auch als 800 g (auch bei Billa)'])
assert.deepEqual(L.alsoText({ alsoPack: [{ store: 'Billa', kind: 'size', label: '700 g', sameStore: true }] }), ['auch als 700 g'])
assert.deepEqual(L.alsoText({ alsoPack: [{ store: 'Spar', kind: 'single', label: 'einzeln (355 g)', sameStore: true }] }), ['auch einzeln (355 g)'])
assert.deepEqual(L.alsoText({ alsoAt: ['Spar'], alsoPack: [{ store: 'myProduct', kind: 'multipack', label: '6er-Pack' }] }), ['auch bei Spar', 'auch als 6er-Pack bei myProduct'])
// data: no visible row shows '✓ aktuell' next to 'Preis veraltet' / an old price year; same-store links point into the same store
const D = JSON.parse(readFileSync(process.argv[2] || new URL('../public/data.json', import.meta.url), 'utf8'))
const by = new Map(D.rows.map(r => [r.id, r]))
let cur = 0, contra = 0, same = 0
for (const r of D.rows) {
  if (F.isPriceCurrent(r)) { cur++; if (/preis veraltet|ausgelistet/i.test(String(r.variant_note || '') + String(r.rank_excluded_reason || '')) || F.isOldPrice(r)) contra++ }
  for (const p of r.alsoPack || []) if (p.sameStore) { same++; assert.equal(by.get(p.id)?.store, r.store, `sameStore link #${r.id} -> #${p.id}`) }
}
assert.equal(contra, 0)
const r456 = D.rows.find(r => r.uid === 'bjt8alu66p'); assert.ok(r456 && F.isPriceCurrent(r456) && !F.isOldPrice(r456), '#456 dm Little Lunch Thai Curry: live price 2026-10-13')
console.log(`[sc33-ui] OK: '✓ aktuell' ${cur} rows, 0 contradicting; same-store alsoPack links ${same}`)
