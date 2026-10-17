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
// sensecheck 37 (2): rows marked not-a-ready-meal (qa/sensecheck37_nonmeal.json → row.nonMeal) never appear in ready-meal lists/rankings
const M = await load('../src/app/meal.ts')
const nm = D.rows.filter(r => r.nonMeal); assert.equal(nm.length, D.nonMealCheck?.applied ?? 0, 'nonMealCheck.applied')
for (const r of nm) {
  assert.ok(!M.isReadyMeal(r) && !M.isRankable(r) && !r.rankable && !r.rankableLight, `nonMeal #${r.id} ${r.name} not a ready meal`)
  if (r.nonMeal.kind === 'pasta' || r.nonMeal.kind === 'grocery') assert.equal(r.segment, 'grocery', `segment #${r.id}`)
  if (r.nonMeal.kind === 'pasta') assert.ok(r.stage === 'side' && r.gang === 'beilage' && r.meal_class === 'snack_side', `pasta labels #${r.id}`)
}
const kinds = {}; for (const r of nm) kinds[r.nonMeal.kind] = (kinds[r.nonMeal.kind] || 0) + 1
console.log(`[sc37-nonmeal] OK: ${nm.length} rows not ready meals ${JSON.stringify(kinds)}, none in isReadyMeal/isRankable`)
// sensecheck 38 (2): every nonMeal row has a visible 'Kein Fertiggericht' notice (UI label) and exactly one own 'kein Fertiggericht' flag;
//  Hüttenbrot #2739–#2741 / Kokosmilchreis #2748 no longer only generic snack/dessert wording, #2744 no duplicate 'Lebensmittel (kein Fertiggericht)'
const NM = await load('../src/app/nonMeal.ts')
assert.equal(NM.nonMealLabel({ kind: 'snack' }), 'Kein Fertiggericht · Snack, keine Mahlzeit'); assert.equal(NM.nonMealLabel(null), null)
for (const r of nm) {
  assert.ok(NM.nonMealLabel(r.nonMeal) && NM.NON_MEAL_LABEL[r.nonMeal.kind], `label for kind ${r.nonMeal.kind} #${r.id}`)
  assert.equal(r.flags.filter(f => /kein Fertiggericht/.test(f)).length, 1, `one 'kein Fertiggericht' flag #${r.id} ${JSON.stringify(r.flags)}`)
  assert.ok(!r.flags.includes('Lebensmittel (kein Fertiggericht) – nicht in Rankings'), `superseded flag #${r.id}`)
}
for (const u of ['dpls94th1i', 'xyxq2y1shg', 'bb10k80won', 'my285g2hfr']) { const r = D.rows.find(x => x.uid === u); assert.ok(r?.nonMeal && r.flags.some(f => /kein Fertiggericht/.test(f)), `sc38 (2) notice ${u}`) }
const t2744 = D.rows.find(x => x.uid === '2yoca0kvo2'); assert.ok(t2744 && !t2744.flags.includes('Lebensmittel (kein Fertiggericht) – nicht in Rankings'), '#2744 duplicate flag removed')
// sensecheck 38 (1): size-unknown rows (placeholder 1000 g removed) show the size note, nothing per kg / per portion
const szu = D.rows.filter(r => r.sizeNote); assert.equal(szu.length, D.sizeUnknown38?.rows?.length ?? 0, 'sizeUnknown38')
assert.ok(szu.every(r => r.size == null && r.ppk == null && r.pPor == null && r.p100g == null && r.nonMeal), 'size-unknown rows have no derived values')
console.log(`[sc38-nonmeal] OK: ${nm.length} rows with a visible notice + one own flag; size unknown ${szu.length} (${szu.map(r => '#' + r.id).join(', ')})`)
// sensecheck 38 (3): filled pasta without sauce = ingredient/side (not a ready meal); Kasnudeln/Schlutzkrapfen/Maultaschen kept, labelled 'ohne Sauce'
const pc = D.pastaCheck38; assert.ok(pc && pc.n > 100 && pc.applied === pc.n && pc.noSauce === pc.noSauceN, 'pastaCheck38 applied')
const ns = D.rows.filter(r => r.noSauce); assert.equal(ns.length, pc.noSauce)
assert.ok(ns.every(r => !r.nonMeal && /kasnudel|schlutzkrap|maultasch/i.test(r.name) && r.flags.some(f => f.startsWith('Gefüllte Teigtaschen ohne Sauce'))), 'noSauce rows = Kasnudeln/Schlutzkrapfen/Maultaschen')
const k621 = D.rows.find(r => r.uid === 'eqptxeqobz'); assert.ok(k621?.noSauce && M.isReadyMeal(k621), '#621 Omis Kärntner Kasnudeln stays a ready meal')
const fp = D.rows.filter(r => r.nonMeal?.kind === 'pasta' && r.dupOf == null && /ravioli|tortell|cappellet|girasol/i.test(r.name) && !/sauce|soße|bolognese|al forno|überbacken|pfanne/i.test(r.name))
assert.ok(fp.length >= 100 && fp.every(r => !M.isReadyMeal(r)), 'filled pasta without sauce not in ready-meal lists')
const canned = D.rows.filter(r => /felix fleischravioli|inzersdorfer ravioli|ravioli in tomatensauce/i.test(r.name)); assert.ok(canned.length >= 5 && canned.every(r => !r.nonMeal), 'canned ravioli stay')
console.log(`[sc38-pasta] OK: ${pc.applied} filled pasta without sauce -> Zutat/Beilage, ${ns.length} Kasnudeln/Schlutzkrapfen/Maultaschen 'ohne Sauce' kept, ${canned.length} canned ravioli kept, borderline ${pc.borderline.length} unchanged`)
// sensecheck 37 (3): PrepMyMeal shipping is a sourced data.shipping entry (5,99 € / 6er box, assumption stated) and matches every row's shipPor
const shp = D.shipping?.PrepMyMeal; assert.ok(shp && shp.shipping_eur === 5.99 && shp.box === 6 && /prepmymeal\.at\/policies\/shipping-policy/.test(shp.source_url) && shp.checked && /Annahme/.test(shp.note) && shp.assumption, 'PrepMyMeal shipping entry')
const pmm = D.rows.filter(r => r.store === 'PrepMyMeal' && r.pPor != null); assert.ok(pmm.length > 0 && pmm.every(r => r.shipPor === Math.round(shp.shipping_eur / shp.box * 100) / 100 && Math.abs(r.pPorEff - r.pPor - r.shipPor) < 0.011), 'PrepMyMeal shipPor = 5,99/6')
const noSrc = Object.entries(D.shipping || {}).filter(([, v]) => v.shipping_eur != null && !v.source_url); assert.deepEqual(noSrc, [], 'every shipping entry with a number has a source')
console.log(`[sc37-shipping] OK: PrepMyMeal ${shp.shipping_eur} € / ${shp.box} → shipPor ${pmm[0].shipPor} on ${pmm.length} rows, source ${shp.source_url} (${shp.checked})`)
