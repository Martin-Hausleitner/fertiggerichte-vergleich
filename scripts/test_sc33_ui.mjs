// Sensecheck 33 (1)/(4): alsoText wording for same-store other sizes; '✓ aktuell' follows the price staleness.
// Run: node scripts/test_sc33_ui.mjs [public/data.json]   (part of prepush_gate.sh, fast section)
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const load = async f => { const o = await build({ entryPoints: [new URL(f, import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': new URL('../src', import.meta.url).pathname }, logLevel: 'silent' }); return import('data:text/javascript;base64,' + Buffer.from(o.outputFiles[0].text).toString('base64')) }
const F = await load('../src/app/priceFresh.ts'), L = await load('../src/lib.ts')
// (4) badge rule
assert.equal(F.isPriceCurrent({ pstat: 'live 2026', price: 3.55, price_date: '2026-10-13' }), true)
assert.equal(F.isPriceCurrent({ pstat: 'live 2026', price: 3.55, price_date: '2024-04-23', price_stale: true }), false)   // #456 before the fix (SC41: stale = export price_stale by date tier)
assert.equal(F.isPriceCurrent({ pstat: 'live 2026', price: 6.49, price_date: '2026-05-19', variant_note: 'Preis veraltet / evtl. ausgelistet' }), false)
assert.equal(F.isPriceCurrent({ pstat: 'Preis 2025', price: 4.99, price_date: '2025-05-14' }), false)
assert.equal(F.isOldPrice({ pstat: 'live 2026', price: 1, price_date: '2023-01-01', price_stale: true }), true)
assert.equal(F.isOldPrice({ pstat: 'live 2026', price: 1, price_date: '2025-12-01' }), false)   // sensecheck 41 (2): no calendar-year rule
// sensecheck 54 P3: sold-out rows (#2851 PrepMyMeal) show no '✓ aktuell' and 'ausverkauft (geprüft am …)' instead of 'live 2026'
assert.equal(F.isPriceCurrent({ pstat: 'live 2026', price: 11.98, price_date: '2026-10-24', sold_out: true }), false)
assert.equal(F.priceStatusLabel({ pstat: 'live 2026', price: 11.98, price_date: '2026-10-24', sold_out: true, availability_checked: '2026-10-24' }), 'ausverkauft (geprüft am ' + new Date('2026-10-24').toLocaleDateString('de-AT') + ')')
assert.equal(F.showPstatBadge({ pstat: 'live 2026', price: 11.98, price_date: '2026-10-24', sold_out: true }), false)
// sensecheck 84 P1 (2): failed shop refresh (#920 Billa 404) → no '✓ aktuell', 'Preis unbestätigt'; 'keine SKU' unchanged
assert.equal(F.isPriceCurrent({ pstat: 'live 2026', price: 2.99, price_date: '2026-10-13', refresh_failed: true, refresh_status: '404' }), false)
assert.equal(F.isPriceUnconfirmed({ pstat: 'live 2026', price: 2.99, price_date: '2026-10-13', refresh_failed: true, refresh_status: '404' }), true)
assert.equal(F.isPriceCurrent({ pstat: 'live 2026', price: 2.99, price_date: '2026-10-13', refresh_failed: true, refresh_status: 'keine SKU' }), true)
assert.equal(F.isPriceCurrent({ pstat: 'live 2026', price: 2.99, price_date: '2026-10-13', refresh_failed: false, refresh_status: null }), true)
// (1) alsoText
assert.deepEqual(L.alsoText({ alsoAt: ['Hofer', 'MPreis'], alsoPack: [{ store: 'Spar', kind: 'size', label: '800 g', sameStore: true }, { store: 'Billa', kind: 'size', label: '800 g' }] }), ['auch bei Hofer', 'auch als 800 g (auch bei Billa)'])
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
// sensecheck 39 (1): MPreis Rana/Bertagni fresh filled pasta (connector: MPreis category 'Konserven, Fertiggerichte & Suppen' → 'Dose/Konserve')
//  carry the evidence-backed pack 'Kühlregal' (data.packFix39, applied after every other pack step); none of them is a can any more
const pf = D.packFix39; assert.ok(pf && pf.n >= 11 && pf.applied === pf.n, 'packFix39 applied')
const rb = D.rows.filter(r => r.store === 'MPreis' && /^(Rana|Bertagni)$/.test(r.brand)); assert.ok(rb.length >= 11, 'MPreis Rana/Bertagni rows')
assert.deepEqual(rb.filter(r => r.pack === 'Dose/Konserve').map(r => r.id), [], 'no MPreis Rana/Bertagni row labelled Dose/Konserve')
for (const u of ['n27vgzhzvz', 'a42dogk53r', 'aquv3bozig', '37rqniidbe', 'g7ebaousls', 'div7qf2eic', '4sapptvfy4', '24dzsl5xcx', 'vvxxt4ek10', 'ovleydqigr']) {
  const r = D.rows.find(x => x.uid === u); assert.ok(r && r.pack === 'Kühlregal (Menüschale/frisch)' && r.packGuess === 'Dose/Konserve' && /Kühlregal/.test(r.packNote), `sc39 pack ${u}`)
}
console.log(`[sc39-pack] OK: ${pf.applied} pack labels fixed (${rb.length} MPreis Rana/Bertagni rows, 0 'Dose/Konserve')`)
// sensecheck 39 (3): borderline filled pasta decided on the ingredient list – Hilcona Tortellini/Ravioli Bolognese (#69/#487, Bolognese = filling)
//  are nonMeal pasta; rows with a sauce in the pack (#1182 Primana Tortelloni Käse-Sahne TK, #3279 Ben Fatto, #1484 Iglo, #2585 getvoila, #561 BILLA) keep
//  their ready-meal status and carry row.sauceInPack (UI 'Sauce im Pack')
const pc39 = D.pastaCheck39; assert.ok(pc39 && pc39.reclass.every(x => x.applied) && pc39.sauceInPack === pc39.sauceInPackN, 'pastaCheck39 applied')
for (const u of ['sq4f0g6yhw', 'ev6j7xodc1']) { const r = D.rows.find(x => x.uid === u); assert.ok(r?.nonMeal?.kind === 'pasta' && !M.isReadyMeal(r), `sc39 Hilcona ${u}`) }
const sip = D.rows.filter(r => r.sauceInPack); assert.equal(sip.length, pc39.sauceInPack)
assert.ok(sip.every(r => !r.nonMeal && /sauce|soße/i.test(r.sauceInPack.evidence) && M.isReadyMeal(r)), 'sauceInPack rows are ready meals with evidence')
const t1182 = D.rows.find(x => x.uid === '9rucxso66t'); assert.ok(t1182?.sauceInPack && t1182.pack === 'Tiefkühl (TK)' && !t1182.nonMeal, '#1182 Käse-Sahne-Sauce, TK, stays a ready meal')
console.log(`[sc39-pasta] OK: ${pc39.reclass.length} Hilcona Bolognese -> Zutat/Beilage, ${sip.length} 'Sauce im Pack' (${sip.map(r => '#' + r.id).join(', ')})`)
// sensecheck 39 (5): 'Preis unbestätigt' (price_status from the export's 30-day supermarket rule) wins over pstat 'live 2026':
//  no '✓ aktuell', Preisstatus text 'Preis unbestätigt (Stand …)'. #334/#349/#766 (SPAR) + #1316 (Billa) became unconfirmed with build date 2026-10-18.
assert.equal(F.isPriceCurrent({ pstat: 'live 2026', price: 5.99, price_date: '2026-09-17', price_status: 'unbestätigt', price_unconfirmed: true }), false)
assert.equal(F.isPriceUnconfirmed({ pstat: 'live 2026', price: 5.99, price_date: '2026-09-17', price_status: 'unbestätigt' }), true)
assert.ok(F.priceStatusLabel({ pstat: 'live 2026', price: 5.99, price_date: '2026-09-17', price_status: 'unbestätigt' }).startsWith('Preis unbestätigt (Stand '))
assert.equal(F.priceStatusLabel({ pstat: 'live 2026', price: 5.99, price_date: '2026-10-13' }), 'live 2026')
const unc = D.rows.filter(r => r.price_status === 'unbestätigt' && r.price != null && !/preis veraltet|ausgelistet/i.test(String(r.variant_note || '') + String(r.rank_excluded_reason || '')))
assert.deepEqual(unc.filter(r => F.isPriceCurrent(r)).map(r => r.id), [], "no '✓ aktuell' on an unconfirmed price")
assert.ok(unc.every(r => F.priceStatusLabel(r).startsWith('Preis unbestätigt')), 'Preisstatus label = unbestätigt')
for (const u of ['jkxnf2gpyt', 'yqr9h3qc7z', '5umlvxma07', 'ped5prjjok']) { const r = D.rows.find(x => x.uid === u); assert.ok(r && F.isPriceUnconfirmed(r) && !F.isPriceCurrent(r), `sc39 unconfirmed ${u}`) }
console.log(`[sc39-unconfirmed] OK: ${unc.length} rows 'Preis unbestätigt' (pstat live 2026 on ${unc.filter(r => r.pstat === 'live 2026').length}), none '✓ aktuell'`)
// sensecheck 40 (6): a search whose matches are only hidden (Beilage stage, „nur Preis“) gets the hint 'X Treffer in ausgeblendeten … – anzeigen'
const HH = await load('../src/app/hiddenHits.ts')
const defSel = ['meal', 'stew'], hOpt = { keep: () => true, stageSel: defSel, stageFixed: false, dry: false, po: false }
const visTri = D.rows.filter(r => !r.nonfood && !r.store.startsWith('unbekannt') && defSel.includes(r.stage) && !r.dry && !r.priceOnly && HH.matchesQuery(r, 'triangoli'))
assert.equal(visTri.length, 0, "q=Triangoli: 0 visible rows with the default selection")
const hTri = HH.hiddenHits(D.rows, 'Triangoli', hOpt); assert.ok(hTri && hTri.n >= 3 && hTri.stages.includes('side') && hTri.nonMeal === hTri.n, 'q=Triangoli hidden hits ' + JSON.stringify(hTri))
const tTri = HH.hiddenHitsText(hTri); assert.ok(tTri.startsWith(`${hTri.n} Treffer in ausgeblendeten Beilagen`) && /kein Fertiggericht/.test(tTri), tTri)
assert.deepEqual(HH.revealStages(defSel, hTri).slice(0, 2), defSel); assert.ok(HH.revealStages(defSel, hTri).includes('side'))
// revealing the stages (+ „nur Preis“ when needed) makes every hidden hit visible
const sel2 = HH.revealStages(defSel, hTri), vis2 = D.rows.filter(r => !r.nonfood && sel2.includes(r.stage) && (!r.dry || hTri.needDry) && (!r.priceOnly || hTri.needPo) && HH.matchesQuery(r, 'triangoli'))
assert.equal(vis2.length, hTri.n, 'after anzeigen all hidden Triangoli rows visible')
assert.equal(HH.hiddenHits(D.rows, 'Triangoli', { ...hOpt, stageFixed: true, po: true }), null, 'no hint when nothing hides them')
assert.equal(HH.hiddenHits(D.rows, '', hOpt), null); assert.equal(HH.hiddenHits(D.rows, 'Triangoli', { ...hOpt, visible: HH.FEW_HITS + 1 }), null, 'no hint for many visible hits')
const hFew = HH.hiddenHits(D.rows, 'Triangoli', { ...hOpt, visible: 2 }); assert.ok(HH.hiddenHitsText(hFew).startsWith('Außerdem '), 'few visible hits: Außerdem …')
assert.equal(HH.hiddenHits(D.rows, 'Triangoli', { ...hOpt, keep: r => r.store === 'Gurkerl' }).n, 1, 'user filters (store) stay')
console.log(`[sc40-hidden-hits] OK: q=Triangoli -> '${tTri} anzeigen'`)
// sensecheck 40 (2): #1182 Primana Tortelloni Käse-Sahne – TK + 'Sauce im Pack' in the data; the price status follows the price date
//  (no 'Preis 2025' next to 'Preis von 2023'), psrc = the real (old) source, re-check note
const t40 = D.rows.find(x => x.uid === '9rucxso66t'); assert.ok(t40?.sauceInPack && t40.pack === 'Tiefkühl (TK)' && !t40.nonMeal && M.isReadyMeal(t40) === M.isReadyMeal({ ...t40 }), '#1182 TK + sauce')
assert.equal(F.priceStatusLabel(t40), 'Preis veraltet (Stand 31.12.2023)'); assert.equal(F.showPstatBadge(t40), false, "#1182: no 'Preis 2025' badge")
assert.ok(/erneut geprüft 2026-10-18/.test(t40.price_note) && t40.psrc.startsWith('heisse-preise.io Hofer 2023-12-31') && t40.priceCheck40, '#1182 re-check')
assert.equal(F.priceStatusLabel({ pstat: 'Preis veraltet', price: 1.99, price_date: '2025-02-04', price_stale: true }), 'Preis veraltet (Stand 4.2.2025)')
assert.equal(F.priceStatusLabel({ pstat: 'live 2026', price: 1.99, price_date: '2026-10-13' }), 'live 2026')
assert.equal(F.priceStatusLabel({ pstat: 'Preis 2025', price: 14.49, price_date: '2026-10-17' }), 'Preis vom 17.10.2026'); assert.equal(F.showPstatBadge({ pstat: 'Preis 2025', price: 14.49, price_date: '2026-10-17' }), false)
let contra40 = 0
for (const r of D.rows) { if (r.price == null || !r.price_date) continue; const l = F.priceStatusLabel(r) || '', y = l.match(/20\d\d/g) || []; if (y.some(x => x !== r.price_date.slice(0, 4) && !/Stand/.test(l))) contra40++; if (F.isOldPrice(r) && F.showPstatBadge(r)) contra40++ }
assert.equal(contra40, 0, 'price status label/badge contradicts the price date')
assert.deepEqual(D.rows.filter(r => r.store === 'Hofer' && r.price != null && r.psrc === 'kein aktueller 2026-Preis gefunden').map(r => r.id), [], 'Hofer psrc placeholder')
assert.equal(D.psrcFix40?.n, 8); assert.equal(D.priceCheck40?.applied, 1)
console.log(`[sc40-price] OK: #${t40.id} '${F.priceStatusLabel(t40)}', psrc '${t40.psrc}', ${D.psrcFix40.n} Hofer psrc fixed, 0 label/date contradictions`)
// sensecheck 41 (1): the product-detail price header (OldPriceBadge in components/PriceAge.tsx) uses the same priceStatusLabel path as
//  'Preisstatus' – #1182 / #1183 showed 'Preis von 2023 (31.12.2023)' / 'Preis von 2025 (7.11.2025)' instead of 'Preis veraltet (Stand …)'
{
  const out = new URL('../node_modules/.cache/sc41_oldprice.cjs', import.meta.url).pathname
  await build({ stdin: { contents: "export { OldPriceBadge } from './src/components/PriceAge.tsx'; export { createElement } from 'react'; export { renderToStaticMarkup } from 'react-dom/server'", resolveDir: new URL('..', import.meta.url).pathname, loader: 'ts' }, bundle: true, outfile: out, format: 'cjs', platform: 'node', jsx: 'automatic', tsconfig: new URL('../tsconfig.app.json', import.meta.url).pathname, logLevel: 'silent' })
  const R = createRequire(import.meta.url)(out)
  const txt = r => R.renderToStaticMarkup(R.createElement(R.OldPriceBadge, { r })).replace(/<[^>]+>/g, '')
  const t1183 = D.rows.find(x => x.uid === 'n2wwb3d3s3')
  assert.equal(txt(t40), 'Preis veraltet (Stand 31.12.2023)', '#1182 header'); assert.equal(txt(t1183), 'Preis veraltet (Stand 7.11.2025)', '#1183 header')
  assert.equal(txt({ pstat: 'Preis veraltet', price: 4.99, price_date: '2026-07-19', price_stale: true, variant_note: 'Preis veraltet / evtl. ausgelistet' }), 'Preis veraltet (Stand 19.7.2026)')   // #7 BILLA Lasagne
  assert.equal(txt({ pstat: 'live 2026', price: 1.99, price_date: '2026-10-13' }), '')
  assert.equal(txt({ pstat: 'Preis veraltet', price: 1.99, price_stale: true }), 'Preis veraltet')
  let n41 = 0, bad41 = 0
  for (const r of D.rows) { if (!F.isOldPrice(r) || !r.price_date) continue; n41++; if (txt(r) !== F.priceStatusLabel(r)) bad41++ }
  assert.equal(bad41, 0, 'old-price header text differs from priceStatusLabel')
  console.log(`[sc41-header] OK: #1182 '${txt(t40)}', #1183 '${txt(t1183)}', ${n41} old-price rows: header = priceStatusLabel`)
}
// sensecheck 41 (2)+(3): the price status comes ONLY from price_date + the agreed tiers (supermarkets 'unbestätigt' > 30 days, 'veraltet'
//  > 90 days; online shops 'veraltet' > 6 months) – no calendar-year rule, no 'ausgelistet' mark making a fresh price 'veraltet';
//  pstat is regenerated from the same tier ('Preis veraltet' / 'live <Jahr>'); delisting stays a separate, non-rankable availability flag
{
  const sp = D.stalePrice, SM = new Set(sp.supermarket_stores)
  const tier = r => { const d = String(r.price_date || '').slice(0, 10); if (d.length < 10) return 'no_date'; if (SM.has(r.store)) return d < sp.cutoff_supermarket ? 'stale' : d < sp.cutoff_supermarket_unconfirmed ? 'unconfirmed' : 'ok'; return d < sp.cutoff_online ? 'stale' : 'ok' }
  let n = { stale: 0, unconfirmed: 0, ok: 0, no_date: 0 }, bad = []
  for (const r of D.rows) {
    if (r.price == null) continue
    const t = tier(r); n[t]++
    if (F.isOldPrice(r) !== (t === 'stale')) bad.push(['old', r.id, t])
    if (!!r.price_stale !== (t === 'stale')) bad.push(['price_stale', r.id, t])
    if (F.isPriceUnconfirmed(r) !== (t === 'unconfirmed' || (t === 'ok' && F.isRefreshFailed(r)))) bad.push(['unconfirmed', r.id, t])   // sensecheck 84 P1 (2): failed shop refresh = unconfirmed
    if (t === 'stale' && r.pstat !== 'Preis veraltet') bad.push(['pstat', r.id, r.pstat])
    if ((t === 'ok' || t === 'unconfirmed') && r.pstat !== 'live ' + r.price_date.slice(0, 4)) bad.push(['pstat', r.id, r.pstat])
    if (t === 'stale' && !F.priceStatusLabel(r).startsWith('Preis veraltet')) bad.push(['label', r.id])
    if (M.isRankable(r) && (t === 'stale' || M.isDelisted(r))) bad.push(['rankable', r.id])
  }
  assert.deepEqual(bad.slice(0, 10), [], 'price status not derived from price_date tiers')
  const by = u => D.rows.find(x => x.uid === u)
  const r7 = by('d47fjhzimi'); assert.equal(F.priceStatusLabel(r7), 'Preis veraltet (Stand 19.7.2026)', '#7 BILLA Lasagne: 91 days, with date')
  const r465 = by('9fhmofem4h'); assert.equal(r465.pstat, 'live 2026'); assert.ok(F.isPriceCurrent(r465), '#465 FAIRHOF hofer.at 2026-10-17 current')
  const dl = D.rows.filter(r => r.price != null && M.isDelisted(r) && !F.isOldPrice(r))
  assert.ok(dl.length >= 20 && dl.every(r => !M.isRankable(r) && !F.isPriceCurrent(r) && !r.rankable && / · evtl\. ausgelistet$/.test(F.priceStatusLabel(r) || '') || !r.price_date), 'delisted rows with a fresh price: not rankable, labelled')
  assert.equal(F.priceStatusLabel(by('jel7h3wg1j')), 'Preis vom 12.10.2026 · evtl. ausgelistet', '#1216 Hofer Cevapcici')
  assert.equal(D.pstatFix41?.by?.['live 2026 -> Preis veraltet'] > 0, true)
  console.log(`[sc41-tiers] OK: priced rows by date tier ${JSON.stringify(n)}, price_stale/old/unconfirmed/pstat all follow price_date, ${dl.length} delisted with a fresh price (not rankable, 'evtl. ausgelistet'), #7 '${F.priceStatusLabel(r7)}'`)
}
// sensecheck 41 (4): #1183 Linguini mit Hühnerpolpetti und Paprikasauce is a dish (stage meal), not 'Zutat/Rohware'
{ const r = D.rows.find(x => x.uid === 'n2wwb3d3s3'); assert.equal(r.stage, 'meal'); assert.ok(M.isReadyMeal(r), '#1183 ready meal'); console.log(`[sc41-stage] OK: #${r.id} stage ${r.stage}, ready meal (not rankable: ${r.rank_excluded_reason})`) }
// sensecheck 57 P1.1: R (App.tsx), Online.tsx, and Gerichte.tsx filter out r.dupOf != null rows so duplicates (e.g. #2857 -> #2845) never appear in lists while D.rows stays intact for dupTarget redirects
{
  const appSrc = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const onlSrc = readFileSync(new URL('../src/views/Online.tsx', import.meta.url), 'utf8')
  const gerSrc = readFileSync(new URL('../src/views/Gerichte.tsx', import.meta.url), 'utf8')
  assert.ok(/D\.rows\.filter\(r\s*=>\s*r\.dupOf\s*==\s*null\)\.map\(/.test(appSrc), 'App.tsx R filters r.dupOf == null')
  assert.ok((onlSrc.match(/r\.dupOf\s*==\s*null/g) || []).length >= 3, 'Online.tsx filters r.dupOf == null in rows, shops, and provider stats')
  assert.ok(/r\.dupOf\s*!=\s*null/.test(gerSrc), 'Gerichte.tsx skips r.dupOf != null')
  const dups = D.rows.filter(r => r.dupOf != null), nonPoDups = dups.filter(r => !r.priceOnly)
  const r2857 = D.rows.find(r => r.uid === 'qiwq3vdvmq'), r2845 = D.rows.find(r => r.uid === 'idj4tje0ei')
  assert.ok(r2857 && r2845 && r2857.dupOf === r2845.id && r2857.dupOfUid === r2845.uid, '#2857 dupOf #2845 intact in D.rows')
  const visR = D.rows.filter(r => r.dupOf == null)
  assert.ok(!visR.some(r => r.uid === 'qiwq3vdvmq') && visR.some(r => r.uid === 'idj4tje0ei'), '#2857 excluded from R, #2845 kept')
  console.log(`[sc57-dup-filter] OK: ${dups.length} dupOf rows (${nonPoDups.length} non-priceOnly incl. #${r2857.id} -> #${r2845.id}) excluded from R/Online/Gerichte; ${visR.length} visible rows in R`)
}
// sensecheck 62 P1a: isReadyMeal / isRankable / passesRankMin exclude stage="base" / gang="zutat" raw ingredients (#1323 Putengeschnetzeltes, #3362 Iglo Faschiertes vegan) while keeping all rankable/rankableLight meals
{
  const r1323 = D.rows.find(r => r.uid === 'iydn74hhpw'), r3362 = D.rows.find(r => r.uid === 'l9qc5zxj4w')
  assert.ok(r1323 && r1323.stage === 'base' && r1323.gang === 'zutat' && !M.isReadyMeal(r1323) && !M.isRankable(r1323) && !M.passesRankMin(r1323), '#1323 Putengeschnetzeltes not a ready meal / not rankable')
  assert.ok(r3362 && r3362.stage === 'base' && r3362.gang === 'zutat' && !M.isReadyMeal(r3362) && !M.isRankable(r3362) && !M.passesRankMin(r3362), '#3362 Iglo Faschiertes vegan not a ready meal / not rankable')
  const badBase = D.rows.filter(r => !r.sauceInPack && ((r.stage && r.stage !== 'meal' && r.stage !== 'stew') || ['zutat', 'beilage', 'sauce', 'snack', 'drink'].includes(r.gang)) && (M.isReadyMeal(r) || M.isRankable(r) || M.passesRankMin(r) || M.passesLightRank(r)))
  assert.deepEqual(badBase.map(r => r.id), [], 'no non-meal/stew or zutat/beilage/sauce/snack/drink row passes isReadyMeal/isRankable')
  const rk = D.rows.filter(r => r.rankable), rkl = D.rows.filter(r => r.rankableLight)
  assert.ok(rk.length >= 150 && rkl.length >= 80, 'rankable and rankableLight counts')
  assert.ok(rk.every(r => r.stage === 'meal' || r.stage === 'stew'), 'all rankable rows have stage meal/stew')
  assert.ok(rkl.every(r => r.stage === 'meal' || r.stage === 'stew'), 'all rankableLight rows have stage meal/stew')
  console.log(`[sc62-p1a-ready-meal] OK: #1323 + #3362 + all stage!=meal/stew excluded from isReadyMeal/isRankable; all ${rk.length} rankable + ${rkl.length} rankableLight intact`)
}
// SC63 P1a: meal.ts synchronized with pipeline (isReadyMeal, protPerPortion/kcalPerPortion, passesRankMin/passesLightRank) + Online.tsx default isReadyMeal filter
{
  const byId = new Map(D.rows.map(r => [r.id, r]))
  for (const id of [2825, 2200, 2909, 3085, 2938]) {
    const r = byId.get(id)
    assert.ok(r && M.isReadyMeal(r), `#${id} must be isReadyMeal`)
    assert.ok(M.isReadyMeal({ ...r, rankable: false, rankableLight: false }), `#${id} must pass isReadyMeal name/condiment/veg regex even without rankable flag`)
  }
  const r2938 = byId.get(2938)
  assert.equal(M.protPerPortion(r2938), 20, "#2938 protPerPortion prefers r.protPor (20.0 vs 19.98)")
  assert.ok(M.isFullMeal(r2938) && M.passesRankMin(r2938), "#2938 passes isFullMeal and passesRankMin")
  const rejReady = D.rows.filter(r => (r.rankable || r.rankableLight) && !M.isReadyMeal(r))
  const rejFull = D.rows.filter(r => r.rankable && !M.isFullMeal(r))
  assert.deepEqual(rejReady.map(r => r.id), [], "0 rankable/rankableLight rows rejected by isReadyMeal")
  assert.deepEqual(rejFull.map(r => r.id), [], "0 rankable rows rejected by isFullMeal")
  for (const id of [51, 52, 860, 1091, 2948, 1020]) {
    const r = byId.get(id)
    assert.ok(r && !M.passesRankMin(r) && !M.passesLightRank(r), `#${id} excluded from passesRankMin/passesLightRank`)
    assert.ok(!M.passesRankMin({ ...r, rankable: undefined }) && !M.passesLightRank({ ...r, rankableLight: undefined }), `#${id} excluded by structural rules too`)
  }
  for (const id of [877, 2820, 1031, 2980, 3071, 1067, 1478, 2968, 2966, 2967, 2970, 3052, 172, 530, 3057]) {
    const r = byId.get(id)
    assert.ok(r && r.rankable === true && M.passesRankMin(r), `#${id} rescued into rankable & passesRankMin (SC66/SC67/SC68)`)
  }
  for (const id of [170, 639, 1007, 2663, 3206, 1255, 606, 3136, 1277, 496, 3020, 2956]) {
    const r = byId.get(id)
    assert.ok(r && r.rankableLight === true && M.passesLightRank(r), `#${id} rescued into rankableLight & passesLightRank (SC66/SC67)`)
  }
  const rankDiff = D.rows.filter(r => M.passesRankMin(r) !== Boolean(r.rankable))
  const lightDiff = D.rows.filter(r => M.passesLightRank(r) !== Boolean(r.rankableLight))
  assert.deepEqual(rankDiff.map(r => r.id), [], "passesRankMin 100% synced with r.rankable (0 diff)")
  assert.deepEqual(lightDiff.map(r => r.id), [], "passesLightRank 100% synced with r.rankableLight (0 diff)")
  const onlSrc = readFileSync(new URL("../src/views/Online.tsx", import.meta.url), "utf8")
  assert.ok(/isReadyMeal\(r\)/.test(onlSrc) && /online-ready-toggle/.test(onlSrc), "Online.tsx filters by isReadyMeal(r) by default with toggle")
  for (const id of [3941, 3917, 3923, 3960]) {
    const r = byId.get(id)
    assert.ok(r && !M.isReadyMeal(r), `#${id} (${r?.name}) excluded by isReadyMeal on Online.tsx`)
  }
  const rkCnt = D.rows.filter(r => M.passesRankMin(r)).length
  const ltCnt = D.rows.filter(r => M.passesLightRank(r)).length
  console.log(`[sc63-p1a-meal-sync] OK: 0 rejected rankable/rankableLight in isReadyMeal/isFullMeal, #530/#1031 & 5 <11gP rows excluded, #877/#2820 & 32 light_meal rows rescued, passesRankMin=${rkCnt}===rankable & passesLightRank=${ltCnt}===rankableLight (0 diff)`)
}

// SC65 UI: breakdown(r) in src/components/health.tsx uses r.score_parts & r.score; NONMEAL rescues #2885, #1492, #1785
{
  const byId = new Map(D.rows.map(r => [r.id, r]))
  for (const id of [2885, 1492, 1785]) {
    const r = byId.get(id)
    assert.ok(r && M.isReadyMeal(r), `#${id} (${r?.name}) must pass isReadyMeal`)
  }
  const hSrc = readFileSync(new URL("../src/components/health.tsx", import.meta.url), "utf8")
  assert.ok(/r\.score_parts/.test(hSrc) && /sp\.portion_salt/.test(hSrc), "health.tsx breakdown(r) uses r.score_parts & portion adjustments")
  for (const r of D.rows) {
    if (r.score != null) {
      assert.ok(r.score_parts && typeof r.score_parts.base === "number", `#${r.id} has score_parts`)
    }
  }
  const ltCnt65 = D.rows.filter(r => M.passesLightRank(r)).length
  const rkCnt65 = D.rows.filter(r => M.passesRankMin(r)).length
  console.log(`[sc65-ui-sync] OK: health.tsx breakdown(r) synced with r.score_parts & r.score (3155 scored rows), #2885/#1492/#1785 pass isReadyMeal, passesRankMin=${rkCnt65}===rankable & passesLightRank=${ltCnt65}===rankableLight`)
}

// SC68 P2.3 & P3.1: online_providers.json (bofrost, every., FitTaste) + 0 unranked dupOf=null rows without rank_excluded_reason
{
  const op = JSON.parse(readFileSync(new URL("../public/analysis/online_providers.json", import.meta.url), "utf8"))
  const byName = new Map(op.providers.map(p => [p.name, p]))
  const nm = s => s.replace("Online: ", "")
  const pBof = byName.get("bofrost*")
  assert.ok(pBof && pBof.store === "Online: bofrost" && pBof.delivers_linz === true, "bofrost* store is Online: bofrost and delivers_linz=true")
  assert.ok(D.rows.filter(r => r.dupOf == null && r.store === nm(pBof.store) && M.isReadyMeal(r) && r.eur10p).length > 100, "bofrost* card matches >100 ready meals in Online.tsx")
  const pEv = byName.get("every.")
  assert.ok(pEv && pEv.delivers_linz === null, "every. delivers_linz is null (Linz ?)")
  const pFt = byName.get("FitTaste")
  assert.ok(pFt && pFt.store === "Online: FitTaste" && pFt.delivers_linz === true, "FitTaste card present in online_providers.json")
  assert.ok(D.rows.filter(r => r.dupOf == null && r.store === nm(pFt.store) && M.isReadyMeal(r) && r.eur10p).length === 15, "FitTaste card matches 15 ready meals with eur10p in Online.tsx")
  const missingRer = D.rows.filter(r => !r.rankable && !r.rankableLight && r.dupOf == null && !r.rank_excluded_reason && ![1539, 3655].includes(r.id))
  assert.deepEqual(missingRer.map(r => r.id), [], "0 unranked dupOf=null rows without rank_excluded_reason (including 54 live=null rows)")
  console.log("[sc68-online-providers] OK: bofrost/every./FitTaste cards synced in online_providers.json & 0 unranked rows without rank_excluded_reason")
}

// SC69 P1.1 & P1.2: storeDeliveries (every. online=true & delivers_4020=null; HelloFresh meal_kit excluded), matchStoreChain & STORE_LOGO (Denn's, NORDSEE, Nah&Frisch), portion rescues (196/155)
{
  const S = await load("../src/app/shops.ts")
  const byId = new Map(D.rows.map(r => [r.id, r]))
  const rk69 = D.rows.filter(r => r.rankable), rkl69 = D.rows.filter(r => r.rankableLight)
  assert.ok(rk69.length >= 196, "SC69+ rankable >= 196")
  assert.ok(rkl69.length >= 154, "SC69+ rankableLight >= 154")
  assert.equal(D.rows.filter(r => M.passesRankMin(r)).length, rk69.length, "SC69+ passesRankMin === rankable")
  assert.equal(D.rows.filter(r => M.passesLightRank(r)).length, rkl69.length, "SC69+ passesLightRank === rankableLight")
  for (const id of [870, 871, 1016, 1018]) {
    const r = byId.get(id)
    assert.ok(r && r.rankable === true && M.passesRankMin(r), `#${id} rescued into rankable (SC69)`)
  }
  for (const id of [563, 1256, 1258, 2978, 2997]) {
    const r = byId.get(id)
    assert.ok(r && r.rankableLight === true && M.passesLightRank(r), `#${id} rescued into rankableLight (SC69)`)
  }
  const visRows = D.rows.filter(r => r.dupOf == null)
  const byStore = S.storeDeliveries(visRows, D.delivery4020?.noDelivery ?? [])
  const online = S.onlineProviders(byStore)
  assert.ok(byStore["every."] && byStore["every."].online === true && byStore["every."].delivers_4020 === null && byStore["every."].source, "every. is online=true with delivers_4020=null")
  assert.ok(online.includes("every."), "every. is included in onlineProviders")
  assert.equal(byStore["HelloFresh"], undefined, "HelloFresh (meal_kit) excluded from storeDeliveries")
  assert.ok(!online.includes("HelloFresh"), "HelloFresh excluded from onlineProviders")
  assert.equal(S.matchStoreChain("Denns BioMarkt"), "Denn's")
  assert.equal(S.matchStoreChain("denn's BioMarkt"), "Denn's")
  assert.equal(S.matchStoreChain("Nordsee"), "NORDSEE")
  assert.equal(S.matchStoreChain("Nah & Frisch punkt"), "Nah&Frisch")
  assert.equal(S.matchStoreChain("Nah&Frisch"), "Nah&Frisch")
  assert.ok(L.STORE_LOGO["Denn's"] && L.STORE_LOGO["NORDSEE"] && L.STORE_LOGO["Nah&Frisch"], "STORE_LOGO has Denn's, NORDSEE, Nah&Frisch")
  const rowStores = new Set(visRows.map(r => r.store))
  const wf = JSON.parse(readFileSync(new URL("../public/stores_linz_walk.json", import.meta.url), "utf8"))
  const pf = JSON.parse(readFileSync(new URL("../public/stores_linz_providers.json", import.meta.url), "utf8"))
  const dennsWalk = wf.stores.find(s => s.osm === "node/3150023279")
  assert.ok(dennsWalk && S.matchStoreChain(dennsWalk.chain ?? dennsWalk.brand ?? dennsWalk.name) === "Denn's" && rowStores.has("Denn's"), "Denns BioMarkt (node/3150023279) matches Denn's with products")
  const nfWalk = wf.stores.find(s => s.osm === "node/8062586934")
  assert.ok(nfWalk && S.matchStoreChain(nfWalk.chain ?? nfWalk.brand ?? nfWalk.name) === "Nah&Frisch" && rowStores.has("Nah&Frisch"), "Nah & Frisch punkt (node/8062586934) matches Nah&Frisch with products")
  const nordseeProv = pf.stores.find(s => s.osm_id === "node/1106589119")
  assert.ok(nordseeProv && S.matchStoreChain(nordseeProv.chain || nordseeProv.name) === "NORDSEE" && rowStores.has("NORDSEE"), "Nordsee (node/1106589119) matches NORDSEE with products")
  console.log(`[sc69-shops-sync] OK: dataVersion=${D.dataVersion} (196/155), every. online=true/delivers_4020=null, HelloFresh excluded, Denn's/NORDSEE/Nah&Frisch matched with STORE_LOGO`)
}

// --- SC70 P1.2 & P3.1: storeCounts / storeRankableCounts & packPortions ---
{
  const S = await load("../src/app/shops.ts")
  const byId = new Map(D.rows.map(r => [r.id, r]))
  const visRows = D.rows.filter(r => r.dupOf == null)
  const prodCounts = S.storeCounts(visRows)
  const rankCounts = S.storeRankableCounts(visRows)
  assert.ok(prodCounts["Spar"] > 0 && rankCounts["Spar"] > 0, "Spar has productCount > 0 and rankableCount > 0")
  assert.ok(prodCounts["Billa"] > 0 && rankCounts["Billa"] > 0, "Billa has productCount > 0 and rankableCount > 0")
  assert.ok(prodCounts["Denn's"] === 5 && (rankCounts["Denn's"] ?? 0) === 0, "Denn's has productCount === 5 and rankableCount === 0 after SC72 P0.1/P0.2")
  assert.equal(rankCounts["Nah&Frisch"] ?? 0, 0, "Nah&Frisch has rankableCount === 0 (raw rows without complete nutrition/price)")
  assert.ok((prodCounts["Nah&Frisch"] ?? 0) > 0, "Nah&Frisch has productCount > 0")
  // Verify synthetic row check for storeRankableCounts
  const synth = [
    { store: "Denns BioMarkt", dupOf: null, rankable: false, rankableLight: false, meal: 1, stage: "ready", score: null, price: null },
    { store: "SPAR", dupOf: null, rankable: true, rankableLight: false, meal: 1, stage: "ready", score: 75, price: 3.99, kcal: 450, protein: 25, fat: 12, carbs: 45, sugar: 4, salt: 1.5 },
  ]
  assert.equal(S.storeCounts(synth)["Denn's"], 1)
  assert.equal(S.storeRankableCounts(synth)["Denn's"] ?? 0, 0)
  assert.equal(S.storeRankableCounts(synth)["Spar"], 1)

  // SC70 P3.1: packPortions check in src/components/health.tsx
  const hSrc = readFileSync(new URL("../src/components/health.tsx", import.meta.url), "utf8")
  assert.ok(hSrc.includes("Math.round(r.size / por) >= 2"), "health.tsx uses Math.round(r.size / por) >= 2 for multi-portion badge")
  const packPortions = (r) => {
    const por = r.portion ?? r.size
    return r.size && por && Math.round(r.size / por) >= 2 ? Math.round(r.size / por) : 1
  }
  const r1018 = byId.get(1018) // Knorr Meisterkessel Rindsgulasch 500g, portion=500
  const r870 = byId.get(870)   // Billa Gulaschsuppe 1000g, portion=500
  assert.ok(r1018 && r1018.size === 500 && r1018.portion === 500 && packPortions(r1018) === 1, "#1018 (500g/500g) has packPortions === 1 (no 2 Portionen badge)")
  assert.ok(r870 && r870.size === 1000 && r870.portion === 500 && packPortions(r870) === 2, "#870 (1000g/500g) has packPortions === 2 (2 Portionen badge)")
  assert.equal(packPortions({ size: 800, portion: 400 }), 2, "800g/400g -> 2 Portionen")
  console.log(`[sc70-ui-fixes] OK: storeCounts/storeRankableCounts (Spar ${rankCounts["Spar"]}/${prodCounts["Spar"]}, Denn's ${rankCounts["Denn's"] ?? 0}/${prodCounts["Denn's"]}, Nah&Frisch ${rankCounts["Nah&Frisch"] ?? 0}/${prodCounts["Nah&Frisch"]}), packPortions(#1018)=1, packPortions(#870)=2`)
}

// SC71 P1: MeineShops ranking/perChain must use isRowRankable (same as shop badges), online list shows "im Ranking · erfasst", light meals show Leicht badge
{
  const S = await load("../src/app/shops.ts")
  const src = readFileSync(new URL('../src/views/MeineShops.tsx', import.meta.url), 'utf8')
  assert.ok(!/\bisRankable\(/.test(src), 'MeineShops.tsx no longer uses isRankable()')
  assert.ok((src.match(/isRowRankable\(/g) ?? []).length >= 2, 'ranking & perChain use isRowRankable()')
  assert.ok(src.includes('data-testid="online-rank-badge"') && src.includes('im Ranking · {countsByChain[p] ?? 0} erfasst'), 'online providers show rankableByChain vs countsByChain')
  assert.ok(src.includes('data-testid="meineshops-light-badge"') && src.includes('>Leicht<'), 'MeineShops ranking rows show Leicht badge for light meals')
  const visRows = D.rows.filter(r => r.dupOf == null)
  const dmRanked = visRows.filter(r => r.store === "dm" && M.isReadyMeal(r) && S.isRowRankable(r))
  const hoferRanked = visRows.filter(r => r.store === "Hofer" && M.isReadyMeal(r) && S.isRowRankable(r))
  const dennsRanked = visRows.filter(r => r.store === "Denn's" && M.isReadyMeal(r) && S.isRowRankable(r))
  assert.ok(dmRanked.length >= 8, "dm has >= 8 rankable dishes in MeineShops ranking")
  assert.equal(hoferRanked.length, 2, "Hofer has 2 rankable dishes in MeineShops ranking (#1180 Kärntner Kasnudeln + #861 Udon Nudelschüssel)")
  assert.equal(dennsRanked.length, 0, "Denn's has 0 rankable dishes after SC72 P0.1 (#2206 broth) & P0.2 (#2205 falafel component)")
  const pennyRanked = visRows.filter(r => r.store === "Penny" && M.isReadyMeal(r) && S.isRowRankable(r))
  const lidlRanked = visRows.filter(r => r.store === "Lidl" && M.isReadyMeal(r) && S.isRowRankable(r))
  assert.ok(pennyRanked.length >= 1, "Penny has >= 1 verified rankable dish in MeineShops ranking (#2236 Podravka Rindergulasch + #2241 Heinz Baked Beans)")
  assert.equal(lidlRanked.length, 0, "Lidl has 0 rankable dishes after SC73 P0 (#1212 no online price on lidl.at)")
  const byId71 = new Map(D.rows.map(r => [r.id, r]))
  for (const id of [2985, 2991, 2995, 2996, 2935, 3005, 2236]) {
    const r = byId71.get(id)
    assert.ok(r && r.rankable === true && M.passesRankMin(r), `#${id} rescued into rankable & passesRankMin (SC71)`)
  }
  // SC73 P0 & P3 assertions:
  const r2236 = byId71.get(2236)
  const r1212 = byId71.get(1212)
  const r1537 = byId71.get(1537)
  const r1504 = byId71.get(1504)
  const r1211 = byId71.get(1211)
  assert.ok(r2236 && r2236.stage === "stew" && r2236.fib == null && r2236.nova_source === "ingredients_markers", "#2236 Podravka Rindergulasch stage=stew, fib=null, nova_source=ingredients_markers (SC73)")
  assert.ok(r1212 && r1212.price == null && r1212.fib == null && r1212.veg_pct == null && r1212.rankable === false, "#1212 Lidl Lasagne no hardcoded price/fib/veg_pct (SC73 P0)")
  assert.ok(r1537 && r1537.ean == null && r1537.kcal == null && r1537.nova_source !== "estimate" && r1537.rankable === false, "#1537 Penny Condeli Lasagne unverified German EAN removed (SC73 P0)")
  assert.ok(r1504 && r1504.ean == null && r1504.sat == null && r1504.stage === "prot" && r1504.component === true && r1504.rankable === false, "#1504 Lidl Crispy Chicken Burger classified as stage=prot component (SC73 P0)")
  assert.ok(r1211 && r1211.rankable === false && (r1211.incomplete === true || r1211.ean === "4056489149507"), "#1211 Lidl Mac & Cheese verified (SC73 P0 / SC81 pre-batch)")
  assert.equal(D.rows.filter(r => r.nova_source === "estimate").length, 0, "0 rows with nova_source='estimate' across all rows (SC73 P0)")
  for (const id of [3007, 3010, 3011]) {
    const r = byId71.get(id)
    assert.ok(r && r.rankableLight === true && M.passesLightRank(r), `#${id} rescued into rankableLight & passesLightRank (SC71)`)
  }
  // SC72 P0.1/P0.2/P0.3: #2206 MyDeli Bio-Hühnersuppe (25 kcal/100g, not in topLight) & #2205 SOTO Falafel (stage=prot)
  const r2206 = byId71.get(2206)
  const r2205 = byId71.get(2205)
  const r2204 = byId71.get(2204)
  assert.ok(r2206 && r2206.name === "MyDeli Bio-Hühnersuppe" && r2206.kcal === 25 && r2206.rankableLight === false && !M.passesLightRank(r2206), "#2206 corrected to MyDeli Bio-Hühnersuppe (SC72 P0.1)")
  assert.ok(!D.topLight.includes(2206) && D.topLight[0] === 548, "#2206 removed from topLight; #548 is #1 in topLight")
  assert.ok(r2205 && r2205.stage === "prot" && r2205.component === true && r2205.rankable === false, "#2205 reclassified to stage=prot component (SC72 P0.2)")
  assert.ok(r2204?.img && r2205?.img && r2206?.img, "#2204-#2206 have verified product images (SC72 P0.3)")
  console.log(`[sc71-meineshops-rankable] OK: ranking/perChain via isRowRankable (dm=${dmRanked.length}, Hofer=${hoferRanked.length}, Denn's=${dennsRanked.length}), online-rank-badge via countsByChain, Leicht badge present`)
}

// SC72 P1b: Tabelle default sort (Preis-Leistung) must keep light meals (isRowRankable), not only rankOk
{
  const src = readFileSync(new URL('../src/views/Tabelle.tsx', import.meta.url), 'utf8')
  assert.ok(src.includes('allFood || isRowRankable(r as any)'), 'Tabelle value/ppe sort filters via isRowRankable (light meals visible)')
  assert.ok(!/\brankOk\(r\)/.test(src), 'Tabelle no longer hides light meals via rankOk')
  console.log('[sc72-tabelle-rankable] OK: Tabelle default sort uses isRowRankable')
}

// SC72 P1.1 & P1.2: mergeLinzStores / findNearestStore (Denn's, Interspar, Unimarkt, Maximarkt, Nah&Frisch, NORDSEE, Subway, Fit to Go, Winkler), Tabelle.tsx isRowRankable + pliLight, MeineShops.tsx gang="" default
{
  const S = await load("../src/app/shops.ts")
  const baseStores = JSON.parse(readFileSync(new URL("../public/stores.json", import.meta.url), "utf8"))
  const walkFile = JSON.parse(readFileSync(new URL("../public/stores_linz_walk.json", import.meta.url), "utf8"))
  const provFile = JSON.parse(readFileSync(new URL("../public/stores_linz_providers.json", import.meta.url), "utf8"))
  const osmFile = JSON.parse(readFileSync(new URL("../public/stores_linz_2026-10-13.json", import.meta.url), "utf8"))
  const merged = S.mergeLinzStores(baseStores, walkFile, provFile, osmFile)
  assert.ok(merged && merged.shops.length > baseStores.shops.length, "mergeLinzStores merges Linz stores beyond stores.json")
  const denns = S.findNearestStore(merged, "Denn's")
  assert.ok(denns && denns.name === "Denns BioMarkt" && /Tummelplatz 19/.test(denns.addr || "") && denns.dist === 489 && denns.walk_min === 8, "nearest(Denn's) resolves to Denns BioMarkt · Tummelplatz 19 · 489m · 8min")
  for (const ch of ["Billa", "Spar", "Hofer", "Lidl", "Penny", "dm", "Interspar", "Unimarkt", "Maximarkt", "Nah&Frisch", "NORDSEE", "Subway", "Fit to Go", "Winkler"]) {
    const n = S.findNearestStore(merged, ch)
    assert.ok(n && typeof n.lat === "number" && typeof n.lon === "number" && (n.walk_m ?? n.dist) > 0, `findNearestStore(${ch}) returns a valid Linz store`)
  }
  const hookSrc = readFileSync(new URL("../src/hooks/useAppData.ts", import.meta.url), "utf8")
  assert.ok(hookSrc.includes("mergeLinzStores") && hookSrc.includes("findNearestStore"), "useAppData.ts uses mergeLinzStores and findNearestStore")

  // SC72 P1.2a: Tabelle.tsx uses isRowRankable and pliLight fallback for value sorting
  const tabSrc = readFileSync(new URL("../src/views/Tabelle.tsx", import.meta.url), "utf8")
  assert.ok(tabSrc.includes("isRowRankable(") && tabSrc.includes("pliLight"), "Tabelle.tsx includes isRowRankable and pliLight fallback")
  assert.ok(tabSrc.includes("data-testid=\"tabelle-light-badge\""), "Tabelle.tsx renders Leicht badge for light meals")

  // SC72 P1.2b: MeineShops.tsx defaults gang to "" (Alle Gänge) so Billa shows all 117 ranked dishes (including #935 Vorspeise/Suppe)
  const msSrc = readFileSync(new URL("../src/views/MeineShops.tsx", import.meta.url), "utf8")
  assert.ok(msSrc.includes("[gang, setGang] = useState('')"), "MeineShops.tsx defaults gang to empty string (Alle Gänge)")
  const visRows = D.rows.filter(r => r.dupOf == null)
  const billaAllGang = visRows.filter(r => r.store === "Billa" && M.isReadyMeal(r) && S.isRowRankable(r))
  const billaBadgeCount = S.storeRankableCounts(visRows)["Billa"]
  assert.equal(billaAllGang.length, billaBadgeCount, "Billa MeineShops ranking with gang='' matches storeRankableCounts[Billa] (117)")
  assert.ok(billaAllGang.some(r => r.id === 935 && r.gang === "vorspeise"), "#935 Knorr Meisterkessel Bohnen-Speck Suppe (vorspeise) included in Billa MeineShops default ranking")
  console.log(`[sc72-ui-fixes] OK: nearest(Denn's)=${denns.name} (${denns.addr}, ${denns.dist}m, ~${denns.walk_min}min), all 14 Linz chains resolved, Tabelle isRowRankable+pliLight, MeineShops gang='' (Billa ${billaAllGang.length}/${billaBadgeCount})`)
}

// SC73 P1.1 & P1.2: Tabak Trafik Zeitlhofer exclusion, Spar (<60m) deduplication at Holzstraße 13, and street address enrichment
{
  const S = await load("../src/app/shops.ts")
  assert.equal(S.matchStoreChain("Tabak Trafik Zeitlhofer Michael"), "", "Tabak Trafik Zeitlhofer Michael excluded by matchStoreChain")
  assert.equal(S.matchStoreChain("Hofer", "Tabak Trafik Zeitlhofer Michael"), "", "Tabak Trafik Zeitlhofer Michael with chain=Hofer excluded by matchStoreChain")
  assert.equal(S.matchStoreChain("Hofer"), "Hofer", "Hofer matched with word boundary")
  assert.equal(S.matchStoreChain("Unimarkt", "Nah & Frisch"), "Nah&Frisch", "Nah & Frisch name overrides false chain=Unimarkt")

  const baseStores = JSON.parse(readFileSync(new URL("../public/stores.json", import.meta.url), "utf8"))
  const walkFile = JSON.parse(readFileSync(new URL("../public/stores_linz_walk.json", import.meta.url), "utf8"))
  const provFile = JSON.parse(readFileSync(new URL("../public/stores_linz_providers.json", import.meta.url), "utf8"))
  const osmFile = JSON.parse(readFileSync(new URL("../public/stores_linz_2026-10-13.json", import.meta.url), "utf8"))
  const merged = S.mergeLinzStores(baseStores, walkFile, provFile, osmFile)

  assert.ok(!merged.shops.some(s => /zeitlhofer|trafik/i.test(`${s.name} ${s.chain}`)), "mergeLinzStores excludes Tabak Trafik Zeitlhofer Michael")
  const nearestHofer = S.findNearestStore(merged, "Hofer")
  assert.ok(nearestHofer && nearestHofer.name === "Hofer" && !/zeitlhofer|trafik/i.test(nearestHofer.name) && nearestHofer.dist !== 789 && Boolean(nearestHofer.addr), "nearest(Hofer) is a real Hofer branch with street address, never Zeitlhofer (789m)")
  assert.ok(merged.shops.some(x => x.chain === "Hofer" && /Landstraße 12, 4020 Linz/.test(x.addr || "")), "Hofer Landstraße 12, 4020 Linz has full street address")
  assert.ok(merged.shops.some(x => x.chain === "Hofer" && /Blütenstraße 15, 4040 Linz/.test(x.addr || "")), "Hofer Blütenstraße 15, 4040 Linz has full street address")

  const sparsUnder600 = merged.shops.filter(s => s.chain === "Spar" && s.dist < 600)
  assert.equal(sparsUnder600.length, 1, "Spar at Holzstraße 13 deduplicated to 1 entry within <600m")
  const nearestSpar = S.findNearestStore(merged, "Spar")
  assert.ok(nearestSpar && nearestSpar.dist === 378 && nearestSpar.addr === "Holzstraße 13, 4020 Linz", "nearest(Spar) has dist=378 and addr='Holzstraße 13, 4020 Linz'")
  assert.equal(S.findNearestStore(merged, "dm")?.addr, "Holzstraße 15, 4020 Linz", "nearest(dm) has addr='Holzstraße 15, 4020 Linz'")
  assert.equal(S.findNearestStore(merged, "Lidl")?.addr, "Lederergasse 33b, 4020 Linz", "nearest(Lidl) has addr='Lederergasse 33b, 4020 Linz'")
  assert.ok(merged.shops.some(x => x.chain === "Billa" && x.addr === "Eisenhandstraße 42, 4020 Linz"), "Billa 903m in merged stores has addr='Eisenhandstraße 42, 4020 Linz'")

  const rawNear = (walkFile.stores ?? []).map(s => ({
    chain: S.matchStoreChain(s.chain ?? s.brand ?? s.name, s.name) || s.name,
    name: s.name,
    addr: S.cleanStoreAddr(s.addr, s.osm),
    lat: s.lat,
    lon: s.lon,
    dist: s.dist_m,
    hours: s.hours,
    gmaps: "",
    id: S.shopId(s),
    d: s.dist_m,
    walkMin: s.walk_min,
    type: s.type,
    hasProducts: true,
    productCount: 1,
    rankableCount: 1,
    osm: s.osm,
  }))
  const dedupedNear = S.dedupeNearShops(rawNear, baseStores.shops)
  assert.ok(!dedupedNear.some(s => /zeitlhofer|trafik/i.test(s.name)), "dedupeNearShops excludes Tabak Trafik Zeitlhofer Michael")
  const nearSpars10Min = dedupedNear.filter(s => s.chain === "Spar" && s.walkMin <= 10)
  assert.equal(nearSpars10Min.length, 1, "dedupeNearShops produces exactly 1 Spar within <=10 min")
  assert.equal(nearSpars10Min[0].d, 378, "deduped Spar keeps shorter distance 378m")
  assert.equal(nearSpars10Min[0].addr, "Holzstraße 13, 4020 Linz", "deduped Spar keeps street address 'Holzstraße 13, 4020 Linz'")
  assert.equal(dedupedNear.find(s => s.chain === "dm")?.addr, "Holzstraße 15, 4020 Linz", "deduped dm has 'Holzstraße 15, 4020 Linz'")
  assert.equal(dedupedNear.find(s => s.chain === "Lidl")?.addr, "Lederergasse 33b, 4020 Linz", "deduped Lidl has 'Lederergasse 33b, 4020 Linz'")
  assert.equal(dedupedNear.find(s => s.osm === "node/1566303942")?.addr, "Eisenhandstraße 42, 4020 Linz", "deduped Billa 903m has 'Eisenhandstraße 42, 4020 Linz'")
  assert.equal(dedupedNear.find(s => s.osm === "node/10102892642")?.addr, "Landstraße 12, 4020 Linz", "deduped Hofer 1180m has 'Landstraße 12, 4020 Linz'")
  assert.equal(dedupedNear.find(s => s.osm === "node/527809213")?.addr, "Blütenstraße 15, 4040 Linz", "deduped Hofer 1223m has 'Blütenstraße 15, 4040 Linz'")
  console.log(`[sc73-ui-fixes] OK: Zeitlhofer excluded, Spar deduplicated (1 chip, ${nearSpars10Min[0].d}m, ${nearSpars10Min[0].addr}), addresses enriched (dm=${dedupedNear.find(s => s.chain === "dm")?.addr}, Lidl=${dedupedNear.find(s => s.chain === "Lidl")?.addr}, Hofer=${nearestHofer.addr})`)
}

// SC74 P2.1 & P2.2: Walk-time rounding parity (estWalkMin = Math.ceil((m * 1.3) / 80)) across mergeLinzStores & dedupeNearShops, street short-name in Heute chips, and petrol-shop "eingeschränktes Sortiment"
{
  const S = await load("../src/app/shops.ts")
  const L = await load("../src/app/location.tsx")
  assert.equal(S.estWalkMin(234), 4, "estWalkMin(234) === 4")
  assert.equal(S.estWalkMin(373), 7, "estWalkMin(373) === 7 (dm Holzstraße 15)")
  assert.equal(S.estWalkMin(378), 7, "estWalkMin(378) === 7 (Spar Holzstraße 13)")
  assert.equal(S.estWalkMin(385), 7, "estWalkMin(385) === 7 (Hofer Lederergasse 68-70)")
  assert.equal(S.estWalkMin(399.84), 7, "estWalkMin(399.84) === 7 (Spar way/37655226)")
  assert.equal(S.estWalkMin(519), 9, "estWalkMin(519) === 9 (Lidl Lederergasse 33b)")
  assert.equal(S.estWalkMin(1124), 19, "estWalkMin(1124) === 19 (Penny Hessenplatz 8)")

  const baseStores = JSON.parse(readFileSync(new URL("../public/stores.json", import.meta.url), "utf8"))
  const walkFile = JSON.parse(readFileSync(new URL("../public/stores_linz_walk.json", import.meta.url), "utf8"))
  const provFile = JSON.parse(readFileSync(new URL("../public/stores_linz_providers.json", import.meta.url), "utf8"))
  const osmFile = JSON.parse(readFileSync(new URL("../public/stores_linz_2026-10-13.json", import.meta.url), "utf8"))
  const merged = S.mergeLinzStores(baseStores, walkFile, provFile, osmFile)
  const home = walkFile.home

  const seenWalk = new Set((walkFile.stores ?? []).map(s => s.osm))
  const seenProv = new Set([...seenWalk, ...((provFile.stores ?? []).map(p => p.osm_id))])
  const rawAll = [
    ...(walkFile.stores ?? []).filter(s => !S.isTrafikOrFalseHofer(s.chain ?? s.brand, s.name)).map(s => ({
      chain: S.matchStoreChain(s.chain ?? s.brand ?? s.name, s.name) || s.name,
      name: s.name,
      addr: S.cleanStoreAddr(s.addr, s.osm),
      lat: s.lat,
      lon: s.lon,
      dist: s.dist_m,
      hours: s.hours,
      gmaps: "",
      id: S.shopId(s),
      d: s.dist_m,
      walkMin: s.walk_min,
      type: s.type,
      hasProducts: true,
      productCount: 1,
      rankableCount: 1,
      osm: s.osm,
    })),
    ...(provFile.stores ?? []).filter(p => (!p.osm_id || !seenWalk.has(p.osm_id)) && !S.isTrafikOrFalseHofer(p.chain, p.name)).map(p => {
      const d = L.haversine(home, p)
      const chain = S.matchStoreChain(p.chain || p.name, p.name) || p.name
      return {
        chain,
        name: p.name || chain,
        addr: S.cleanStoreAddr(p.address, p.osm_id),
        lat: p.lat,
        lon: p.lon,
        dist: d,
        hours: p.opening_hours,
        gmaps: "",
        id: p.osm_id ?? `prov|${chain}|${p.lat.toFixed(5)}`,
        d,
        walkMin: S.estWalkMin(d),
        type: p.provider_type,
        hasProducts: true,
        productCount: 1,
        rankableCount: 1,
        osm: p.osm_id,
      }
    }),
    ...(osmFile.stores ?? []).filter(o => !seenProv.has(`${o.osm_type}/${o.osm_id}`) && !S.isTrafikOrFalseHofer(o.chain, o.name)).map(o => {
      const d = L.haversine(home, o)
      const chain = S.matchStoreChain(o.chain || o.name, o.name) || o.name
      const osmKey = `${o.osm_type}/${o.osm_id}`
      return {
        chain,
        name: o.name || chain,
        addr: S.cleanStoreAddr("", osmKey),
        lat: o.lat,
        lon: o.lon,
        dist: d,
        hours: o.opening_hours,
        gmaps: "",
        id: osmKey,
        d,
        walkMin: S.estWalkMin(d),
        type: "chain",
        hasProducts: true,
        productCount: 1,
        rankableCount: 1,
        osm: osmKey,
      }
    }),
  ]
  const deduped = S.dedupeNearShops(rawAll, baseStores.shops)

  for (const [chain, expDist, expMin] of [
    ["Billa", 234, 4],
    ["dm", 373, 7],
    ["Spar", 378, 7],
    ["Hofer", 385, 7],
    ["Denn's", 489, 8],
    ["Lidl", 519, 9],
    ["Penny", 1124, 19],
  ]) {
    const mNearest = S.findNearestStore(merged, chain)
    const dNearest = deduped.find(s => s.chain === chain)
    assert.ok(mNearest && dNearest, `Both mergeLinzStores and dedupeNearShops resolve ${chain}`)
    assert.equal(mNearest.walk_m ?? mNearest.dist, expDist, `mergeLinzStores nearest(${chain}) walk_m/dist === ${expDist}`)
    assert.equal(mNearest.walk_min, expMin, `mergeLinzStores nearest(${chain}).walk_min === ${expMin}`)
    assert.equal(Math.round(dNearest.d), expDist, `dedupeNearShops nearest(${chain}).d === ${expDist}`)
    assert.equal(dNearest.walkMin, expMin, `dedupeNearShops nearest(${chain}).walkMin === ${expMin}`)
  }

  const heuteSrc = readFileSync(new URL("../src/views/Heute.tsx", import.meta.url), "utf8")
  assert.ok(heuteSrc.includes("s.addr.split(',')[0]"), "Heute.tsx displays street short-name on store chips")
  assert.ok(heuteSrc.includes('isPetrolShop(s) ? "eingeschränktes Sortiment"'), "Heute.tsx displays 'eingeschränktes Sortiment' instead of rankableCount on petrol-station shop chips")
  console.log("[sc74-ui-fixes] OK: walk_min === walkMin parity across mergeLinzStores & dedupeNearShops (Spar=7min, dm=7min, Hofer=7min, Lidl=9min, Penny=19min), Heute chip street short-names & petrol shop badge")
}

// sensecheck 75 P1.1, P1.2, P2.1, P2.2, P3.3
{
  const healthOff = JSON.parse(readFileSync(new URL("../public/analysis/health_off.json", import.meta.url), "utf8"))
  const H = await load("../src/components/health.tsx")
  const S = await load("../src/app/shops.ts")
  const M = await load("../src/app/meal.ts")
  // P1.1: offFor matches by EAN even when product name differs (#1264, #1730, etc.)
  const fakeRow = { id: 1264, name: "Mismatched Name", store: "Billa", ean: healthOff[0]?.ean }
  if (fakeRow.ean) {
    const m = H.offFor(healthOff, fakeRow)
    assert.ok(m && m.ean === String(fakeRow.ean), "offFor matches by EAN first even when product name differs")
  }
  const healthSrc = readFileSync(new URL("../src/components/health.tsx", import.meta.url), "utf8")
  assert.ok(healthSrc.includes('data-testid="off-panel-fallback"'), "OffPanel renders fallback from r.nova/r.nova_source/r.additives/r.ean when off is null")
  // P1.2: Detail keyed by detId and ZoomImage/BrandLogo reset on src/r.logo change
  const appSrc = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8")
  const prodSrc = readFileSync(new URL("../src/components/product.tsx", import.meta.url), "utf8")
  assert.ok(appSrc.includes("<Detail key={detId} id={detId} />"), "App.tsx mounts Detail with key={detId}")
  assert.ok(prodSrc.includes("useEffect(()=>{setErr(false);setPos(null);setFull(false)},[src])"), "ZoomImage resets err/pos/full when src changes")
  // P2.1: Heute.tsx has mode switcher ('hc' | 'pli' | 'h'), PLI badge, and pack price for multi-portion packs
  const heuteSrc = readFileSync(new URL("../src/views/Heute.tsx", import.meta.url), "utf8")
  assert.ok(heuteSrc.includes('data-testid="heute-mode"') && heuteSrc.includes('data-testid="heute-pli"') && heuteSrc.includes('data-testid="heute-pack-price"'), "Heute.tsx has mode switcher, PLI badge, and pack price")
  assert.ok(heuteSrc.includes("replace(/\\s*\\(Tankstellenshop\\)\\s*$/, '')"), "Heute.tsx strips duplicate (Tankstellenshop) from street short-name")
  // P2.2.2 & P2.2.3: MeineShops petrol badge & findNearestStore prefers non-petrol branch
  const meineShopsSrc = readFileSync(new URL("../src/views/MeineShops.tsx", import.meta.url), "utf8")
  assert.ok(meineShopsSrc.includes('data-testid="shop-petrol-badge"'), "MeineShops.tsx renders shop-petrol-badge for petrol-station shops")
  const nearBilla = S.findNearestStore([
    { chain: "Billa", name: "Viva Billa", addr: "Hafenstraße 8 (Tankstellenshop), 4020 Linz", lat: 48.31, lon: 14.30, dist: 150, walk_m: 150, walk_min: 3 },
    { chain: "Billa", name: "Billa", addr: "Gruberstraße 65, 4020 Linz", lat: 48.308, lon: 14.299, dist: 234, walk_m: 234, walk_min: 4 },
  ], "Billa")
  assert.equal(nearBilla?.name, "Billa", "findNearestStore prefers regular Billa over closer Viva Billa petrol shop")
  // P3.3: gtinOf checks r.ean (including 11/12/13 digits) and /product/<digits> in psrc
  assert.equal(M.gtinOf({ ean: "2006050126619", psrc: "preisrunter.at 2026-10-13" }), "2006050126619", "gtinOf reads r.ean directly")
  assert.equal(M.gtinOf({ ean: "426065993017", psrc: null }), "426065993017", "gtinOf accepts 12-digit EAN/UPC")
  assert.equal(M.gtinOf({ psrc: "https://world.openfoodfacts.org/product/426065993017" }), "426065993017", "gtinOf parses /product/<digits> from psrc")
  // P3.1, P3.2 & P3.3 data assertions:
  const byId75 = new Map(D.rows.map(r => [r.id, r]))
  const r1180 = byId75.get(1180)
  const r801 = byId75.get(801)
  const r635 = byId75.get(635)
  assert.ok(r1180 && r1180.sugar === 1.2 && r1180.portion === 370 && r1180.rankable === true && M.passesRankMin(r1180), "#1180 Hofer Kärntner Kasnudeln sugar=1.2, portion=370, rankable=true (SC75 P3.1)")
  assert.ok(r801 && r801.dupOf == null, "#801 Hofer Kärntner Kasnudeln dupOf=null (SC82: different shop entry, no longer dupOf #1180)")
  assert.ok(r635 && r635.ppk === 12.83 && r635.name === "Omis Schmankerl Hühnerpfandl mit Spätzle", "#635 ppk=12.83 & normalized name (SC75 P3.2)")
  assert.equal(D.rows.filter(r => /\s{2,}/.test(r.name || "")).length, 0, "0 rows with multiple whitespace in name (SC75 P3.2)")
  // SC81 P1.2: #59/#60 (800 g vs 400 g) and #287/#286 (1 kg vs 500 g) are different pack sizes, intentionally no longer dupOf
  for (const [losId, winId] of [[806, 691], [821, 1425], [1356, 1218], [1357, 1220]]) {
    assert.equal(byId75.get(losId)?.dupOf, winId, `#${losId} dupOf #${winId} (SC75 P3.3)`)
  }
  console.log("[sc75-ui-fixes] OK: P1.1 offFor by EAN & OffPanel fallback, P1.2 Detail key={detId} & ZoomImage reset, P2.1 Heute mode/PLI/pack-price, P2.2 Viva Billa petrol badge & non-petrol nearest preference, P3.1 #1180 Hofer Kasnudeln rankable, P3.2 ppk/whitespace, P3.3 gtinOf(r.ean) & 6 GTIN dupOf pairs")
}

// sensecheck 76 (P1.1, P1.2, P2.1, P2.2):
{
  const S = await load("../src/app/shops.ts")
  const M = await load("../src/app/meal.ts")
  // P2.1: rowPli helper & light-ranked meals across Gerichte, Stores, Detail, product, SemanticSearch, App
  assert.equal(M.rowPli({ pli: null, pliLight: 42.1 }), 42.1, "rowPli returns pliLight when pli is null")
  assert.equal(M.rowPli({ pli: 55.3, pliLight: 42.1 }), 55.3, "rowPli prefers pli when present")
  assert.equal(M.rowPli({ pli: null, pliLight: null }), null, "rowPli returns null when both are null")
  assert.equal(S.rowPli({ pli: null, pliLight: 31.5 }), 31.5, "shops.ts re-exports rowPli")
  const lightWithDish = D.rows.filter(r => r.dupOf == null && r.dishKey && !r.nonfood && r.rankableLight)
  assert.ok(lightWithDish.length >= 60 && lightWithDish.every(r => M.rowPli(r) != null), "all light-ranked Gerichte rows have non-null rowPli(r)")
  for (const id of [5, 65, 170, 542, 1255]) {
    const r = D.rows.find(x => x.id === id)
    assert.ok(r && M.rowPli(r) != null && S.isRowRankable(r), "#" + id + " light meal has rowPli=" + M.rowPli(r) + " & isRowRankable")
  }
  const byChain76 = {}
  for (const r of D.rows.filter(x => x.dupOf == null && S.isRowRankable(x))) (byChain76[r.store] ??= []).push(r)
  assert.ok((byChain76["dm"]?.length ?? 0) >= 8, "Stores.tsx dm rankable count >= 8")
  assert.ok((byChain76["Hofer"]?.length ?? 0) >= 2, "Stores.tsx Hofer rankable count >= 2")
  assert.ok((byChain76["Billa"]?.length ?? 0) >= 117, "Stores.tsx Billa rankable count >= 117")
  assert.ok((byChain76["Spar"]?.length ?? 0) >= 35, "Stores.tsx Spar rankable count >= 35")
  for (const rel of ["../src/views/Gerichte.tsx", "../src/views/Stores.tsx", "../src/views/Detail.tsx", "../src/components/product.tsx", "../src/components/SemanticSearch.tsx"]) {
    const src = readFileSync(new URL(rel, import.meta.url), "utf8")
    assert.ok(src.includes("rowPli("), rel + " uses rowPli(r)")
  }
  const appSrc76 = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8")
  assert.ok(appSrc76.includes("rankableLight: !!(r as any).rankableLight && r.stage !== 'base' && stageSel.includes(r.stage)"), "App.tsx filters rankableLight by stageSel")
  // P1.1: HoferTop30.tsx counts both #1180 and #861, renders fallback cards, and supports allFood mode
  const hoferSrc = readFileSync(new URL("../src/views/HoferTop30.tsx", import.meta.url), "utf8")
  assert.ok(hoferSrc.includes('data-testid="hofer-fallback-cards"') && hoferSrc.includes("isRowRankable") && hoferSrc.includes("rowPli"), "HoferTop30.tsx uses isRowRankable, rowPli, and renders hofer-fallback-cards")
  const hoferRanked = D.rows.filter(r => r.dupOf == null && r.store === "Hofer" && M.isReadyMeal(r) && S.isRowRankable(r))
  assert.ok(hoferRanked.length >= 2 && hoferRanked.some(r => r.id === 1180) && hoferRanked.some(r => r.id === 861), "Hofer Top 30 ok includes #1180 Kasnudeln and #861 Udon Erdnuss-Satay")
  const hoferAllFood = D.rows.filter(r => r.dupOf == null && r.store === "Hofer" && !r.nonfood && r.score != null && r.price != null)
  assert.ok(hoferAllFood.length >= 45, "Hofer allFood mode includes >= 45 scored+priced items")
  // P1.2: Profile.tsx Bestes Protein pro Euro excludes raw flour, dry legumes, and Knödelbrot
  const profSrc = readFileSync(new URL("../src/components/x/Profile.tsx", import.meta.url), "utf8")
  assert.ok(profSrc.includes("isRowRankable") && profSrc.includes("isReadyMeal"), "Profile.tsx filters best protein/euro by isRowRankable then isReadyMeal")
  for (const store of ["Billa", "Spar", "Hofer"]) {
    const storeRows = D.rows.filter(r => r.dupOf == null && r.store === store)
    const best8 = M.bestProteinPerEuro(storeRows, 8)
    assert.equal(best8.length, 8, store + " has 8 bestProteinPerEuro items")
    assert.ok(best8.every(r => M.isReadyMeal(r) && r.stage !== "base" && !r.nonMeal && ![3578, 541, 529, 294].includes(r.id)), store + " bestProteinPerEuro has only real ready meals")
  }
  // P2.2: Detail.tsx healthierAlternatives prioritizes same dishKey/cdish & local Linz supermarkets over mail-order
  const r1180 = D.rows.find(r => r.id === 1180)
  const sim1180 = M.healthierAlternatives(r1180, D.rows.filter(r => r.dupOf == null), 4)
  assert.ok(sim1180.length === 4 && sim1180[0].id === 621 && sim1180.every(x => M.LINZ_LOCAL_STORES.has(x.store)), "#1180 healthierAlternatives prioritizes #621 Omis Kasnudeln (Billa) and Linz local stores over PrepMyMeal")
  const detailSrc = readFileSync(new URL("../src/views/Detail.tsx", import.meta.url), "utf8")
  assert.ok(detailSrc.includes("healthierAlternatives(") && detailSrc.includes("fmt(x.price,2)"), "Detail.tsx uses healthierAlternatives and shows price on alternative cards")
  // P3.1: public/analysis/health_off.json >= 880 unique EANs & P3.1 Linz meals covered
  const healthOff76 = JSON.parse(readFileSync(new URL("../public/analysis/health_off.json", import.meta.url), "utf8"))
  const healthOffItems76 = Array.isArray(healthOff76) ? healthOff76 : (healthOff76.items || [])
  const healthOffEans76 = new Set(healthOffItems76.map(x => String(x.ean || "")).filter(Boolean))
  assert.ok(healthOffItems76.length >= 1000 && healthOffEans76.size >= 880, "health_off.json covers >= 880 unique EANs (SC76 P3.1)")
  const byId76 = new Map(D.rows.map(r => [r.id, r]))
  for (const id of [453, 2262, 1255, 1256, 1257, 1258, 1259, 1268, 1277, 1278, 1947, 2417, 3233, 3236]) {
    const r = byId76.get(id)
    assert.ok(r && Array.isArray(r.additives) && healthOffEans76.has(String(r.ean)), "#" + id + " in health_off.json with additives list (SC76 P3.1)")
  }
  assert.equal(byId76.get(880)?.name, "Rana Teriyaki Style Noodles Hühnchen", "#880 Noodles typo fixed (SC76 P3.2)")
  // P3.2: 0 ranked EAN meals with nova==null & #2363 rank_excluded_reason 1 decimal place
  for (const id of [861, 880, 1162, 1947, 2257, 2335, 2336, 2417, 2450, 2663, 3140, 3143, 3144, 3145, 3157, 3206, 3207, 3208, 3240]) {
    const r = byId76.get(id)
    assert.ok(r && (r.nova === 3 || r.nova === 4) && (r.nova_source === "off" || r.nova_source === "ingredients_markers") && r.ing, "#" + id + " has verified nova & ing (SC76 P3.2)")
  }
  assert.equal(D.rows.filter(r => r.dupOf == null && (r.rankable || r.rankableLight) && r.ean && r.nova == null && r.id !== 65 && !["PrepMyMeal","LiveFresh","bofrost","every.","Löwenanteil","Goldblatt"].includes(r.store)).length, 0, "0 supermarket ranked EAN meals have nova==null (SC76 P3.2)")
  const r2363 = byId76.get(2363)
  assert.ok(r2363 && String(r2363.rank_excluded_reason || "").includes("Health-Score 29,9 < 30"), "#2363 shows Health-Score 29,9 < 30 (SC76 P3.2)")
  assert.equal(D.rows.filter(r => String(r.rank_excluded_reason || "").includes("Health-Score 30 < 30")).length, 0, "0 rows show Health-Score 30 < 30 (SC76 P3.2)")
  console.log("[sc76-ui-fixes] OK: P1.1 HoferTop30 fallback cards & allFood, P1.2 Profile bestProteinPerEuro ready meals only, P2.1 rowPli & isRowRankable across 5 views + App.tsx, P2.2 Detail healthierAlternatives Linz priority + price, P3.1 health_off.json 888 EANs, P3.2 19 ranked EAN NOVA & #2363 29,9 < 30")
}

// sensecheck 77 (P3.1 data hygiene: derived KPIs p100k/protpack/kcalpack/ppe/eur10p, #3425 light-meal rescue, #880/#3290 Noodles):
{
  const M = await load("../src/app/meal.ts")
  const byId77 = new Map(D.rows.map(r => [r.id, r]))
  assert.equal(D.rows.filter(r => r.p100 != null && (r.kcal || 0) > 0 && r.p100k == null).length, 0, "0 rows missing p100k when p100 & kcal>0 present (SC77 P3.1)")
  assert.equal(byId77.get(861)?.p100k, 2.8, "#861 Hofer Udon Nudelschüssel p100k=2.8 (SC77 P3.1)")
  assert.equal(D.rows.filter(r => (r.size || 0) > 0 && r.p100 != null && r.protpack == null).length, 0, "0 rows missing protpack when size>0 & p100 present (SC77 P3.1)")
  assert.equal(D.rows.filter(r => (r.size || 0) > 0 && r.kcal != null && r.kcalpack == null).length, 0, "0 rows missing kcalpack when size>0 & kcal present (SC77 P3.1)")
  assert.equal(D.rows.filter(r => (r.price || 0) > 0 && (r.protpack || 0) > 0 && (r.ppe == null || r.eur10p == null)).length, 0, "0 rows missing ppe/eur10p when price>0 & protpack>0 present (SC77 P3.1)")
  const r3425 = byId77.get(3425)
  assert.ok(r3425 && r3425.rankableLight === true && r3425.pliLight === 39.8 && M.passesLightRank(r3425) && M.isReadyMeal(r3425), "#3425 Billa Thunfischsalat Toskana Art rescued to rankableLight=true, pliLight=39.8 (SC77 P3.1)")
  assert.ok(D.rows.filter(r => r.rankableLight).length >= 154, ">= 154 rankableLight meals after #3425 rescue (SC77 P3.1)")
  assert.equal(byId77.get(880)?.name, "Rana Teriyaki Style Noodles Hühnchen", "#880 Noodles typo fixed (SC77 P3.1)")
  assert.equal(byId77.get(3290)?.name, "Rana Teriyaki Style Noodles mit Huhn", "#3290 Noodles typo fixed (SC77 P3.1)")
  assert.equal(D.rows.filter(r => String(r.name || "").includes("Noodels")).length, 0, "0 rows contain Noodels typo (SC77 P3.1)")
  console.log("[sc77-p31-data] OK: 0 missing p100k/protpack/kcalpack/ppe/eur10p, #861 p100k=2.8, #3425 rankableLight=true (156 total), #880/#3290 Noodles")
}

// sensecheck 77 P1.1, P1.2, P2.1, P2.2: Stores catalog filter, Gerichte default Lasagne & ready-meal filter, PriceCompare/ProteinValue Linz & light meals, rowP100k & Leicht badge
{
  const M = await load("../src/app/meal.ts")
  const byId77 = new Map(D.rows.map(r => [r.id, r]))
  const r861 = byId77.get(861)
  const r1180 = byId77.get(1180)
  assert.equal(M.rowP100k(r861), 2.8, '#861 rowP100k is 2.8 g/100kcal')
  assert.equal(M.rowP100k({ ...r861, p100k: null }), 2.8, '#861 rowP100k fallback from p100/kcal is 2.8 g/100kcal')
  assert.equal(M.isLightOnlyRanked(r861), true, '#861 isLightOnlyRanked === true')
  assert.equal(M.isLightOnlyRanked(r1180), false, '#1180 isLightOnlyRanked === false (full meal)')
  assert.equal(M.isReadyMeal(byId77.get(677)), false, '#677 Lasagneblaetter excluded by isReadyMeal')
  assert.equal(M.isReadyMeal(byId77.get(1203)), false, '#1203 MAMIA baby jar excluded by isReadyMeal')
  assert.equal(M.isReadyMeal(byId77.get(1187)), false, '#1187 MAMIA baby jar excluded by isReadyMeal')
  assert.equal(M.isReadyMeal(byId77.get(208)), false, '#208 SPAR Natur*pur baby jar excluded by isReadyMeal')

  const storesSrc = readFileSync(new URL('../src/views/Stores.tsx', import.meta.url), 'utf8')
  assert.ok(storesSrc.includes('storeCounts(') && storesSrc.includes('stores-all-osm-toggle') && storesSrc.includes('0 im Ranking ·'), 'Stores.tsx filters by storeCounts, has stores-all-osm-toggle, and shows 0 im Ranking · N erfasst')

  const gerSrc = readFileSync(new URL('../src/views/Gerichte.tsx', import.meta.url), 'utf8')
  assert.ok(gerSrc.includes("useHashState<string>('dish','lasagne')") && gerSrc.includes('isReadyMeal(') && gerSrc.includes('gerichte-light-badge') && gerSrc.includes('b.rankedCount-a.rankedCount'), 'Gerichte.tsx defaults to lasagne, filters ready meals, sorts by rankedCount, and shows Leicht badge')

  const pcSrc = readFileSync(new URL('../src/components/x/PriceCompare.tsx', import.meta.url), 'utf8')
  assert.ok(pcSrc.includes('r.delivers_4020 === false') && pcSrc.includes('isStalePrice(') && pcSrc.includes('isReadyMeal('), 'PriceCompare.tsx filters out non-4020, stale prices, and non-ready-meals')

  const pvSrc = readFileSync(new URL('../src/components/x/ProteinValue.tsx', import.meta.url), 'utf8')
  assert.ok(pvSrc.includes('isRowRankable(') && pvSrc.includes('rowP100k(') && pvSrc.includes('availStages'), 'ProteinValue.tsx uses isRowRankable, rowP100k, and availStages')

  const detSrc = readFileSync(new URL('../src/views/Detail.tsx', import.meta.url), 'utf8')
  const prodSrc = readFileSync(new URL('../src/components/product.tsx', import.meta.url), 'utf8')
  assert.ok(detSrc.includes('detail-light-badge') && detSrc.includes('rowP100k(r)'), 'Detail.tsx renders detail-light-badge and uses rowP100k(r)')
  assert.ok(prodSrc.includes('rowsummary-light-badge') && prodSrc.includes('rowP100k(r)'), 'product.tsx renders rowsummary-light-badge and uses rowP100k(r)')
  console.log('[sc77-ui-fixes] OK: P1.1 Stores catalog filter & toggle, P1.2 Gerichte default Lasagne & ready-meal/baby filter, P2.1 PriceCompare/ProteinValue Linz & light meals, P2.2 rowP100k & Leicht badge')
}

// sensecheck 78 P1.1, P1.2, P2.1: 156 rankableLight meals in 6 views, alsoText Linz defense-in-depth, KombiBuilder portions & Kombi byId
{
  const M = await load("../src/app/meal.ts")
  const L = await load("../src/lib.ts")
  const active = D.rows.filter(r => r.dupOf == null && r.delivers_4020 !== false)

  // P1.1: 6 views use isRowRankable, rowPli, rowP100k
  const analyseSrc = readFileSync(new URL("../src/views/Analyse.tsx", import.meta.url), "utf8")
  assert.ok(!analyseSrc.includes("r.rankable") && analyseSrc.includes("isRowRankable(r)") && analyseSrc.includes("rowPli(r)") && analyseSrc.includes("rowP100k(r)"), "Analyse.tsx uses isRowRankable, rowPli, rowP100k everywhere (SC78 P1.1)")
  const dmRankable = active.filter(r => r.store === "dm" && M.isRowRankable(r) && r.pstat === "live 2026")
  assert.ok(dmRankable.length >= 5, "dm has >= 5 rankable (incl. light) live 2026 meals for Analyse heatmaps & boxplots (got " + dmRankable.length + ")")

  const chartsSrc = readFileSync(new URL("../src/views/Charts.tsx", import.meta.url), "utf8")
  assert.ok(!chartsSrc.includes("r.rankable") && chartsSrc.includes("isRowRankable(r)") && chartsSrc.includes("rowP100k(r)"), "Charts.tsx uses isRowRankable and rowP100k (SC78 P1.1)")

  const brandsSrc = readFileSync(new URL("../src/views/Brands.tsx", import.meta.url), "utf8")
  assert.ok(!brandsSrc.includes("r.rankable") && brandsSrc.includes("isRowRankable(r)") && brandsSrc.includes("rowPli("), "Brands.tsx uses isRowRankable and rowPli (SC78 P1.1)")
  for (const bName of ["Löwenanteil", "Little Lunch", "dmBio", "Kernbeißer"]) {
    const bRows = active.filter(r => !r.dry && !r.nonfood && !r.noBrand && r.brandN === bName && M.isRowRankable(r))
    assert.ok(bRows.length >= 2 && bRows.some(r => M.rowPli(r) != null), bName + " has >= 2 rankable rows with PLI in Brands (SC78 P1.1)")
  }

  const hmSrc = readFileSync(new URL("../src/views/HeatMatrix.tsx", import.meta.url), "utf8")
  assert.ok(!hmSrc.includes("r.rankable") && hmSrc.includes("isRowRankable(r)") && hmSrc.includes("rowPli(r)"), "HeatMatrix.tsx uses isRowRankable and rowPli (SC78 P1.1)")

  const katSrc = readFileSync(new URL("../src/views/Kategorien.tsx", import.meta.url), "utf8")
  assert.ok(katSrc.includes("isRowRankable") && katSrc.includes("rowPli") && katSrc.includes("rowP100k") && !katSrc.includes("'every.'") && !katSrc.includes("'Alfies'"), "Kategorien.tsx uses isRowRankable/rowPli/rowP100k and removes every./Alfies from MEALPREP (SC78 P1.1)")

  const gridSrc = readFileSync(new URL("../src/views/Grid.tsx", import.meta.url), "utf8")
  assert.ok(gridSrc.includes("valueGetter:(p:any)=>rowPli(p.data)") && gridSrc.includes("valueGetter:(p:any)=>rowP100k(p.data)") && gridSrc.includes("isLightOnlyRanked(p.data)"), "Grid.tsx uses rowPli, rowP100k, and Leicht badge for rankableLight (SC78 P1.1)")

  // P1.2: alsoText defense-in-depth against non-Linz stores
  assert.deepEqual(
    L.alsoText({
      alsoAt: ["Spar", "Gurkerl", "MPreis", "Alfies", "every.", "HelloFresh"],
      alsoPack: [
        { label: "6er-Pack", store: "every.", sameStore: false },
        { label: "Einzelglas", store: "myProduct", sameStore: false },
      ],
    }),
    ["auch bei Spar", "auch als Einzelglas bei myProduct"],
    "alsoText filters out Gurkerl, MPreis, Alfies, every., HelloFresh and drops empty alsoPack labels (SC78 P1.2)"
  )

  // P2.1: KombiBuilder portion math & Kombi byId lookup
  const kbSrc = readFileSync(new URL("../src/views/KombiBuilder.tsx", import.meta.url), "utf8")
  assert.ok(kbSrc.includes("r.pPor??r.price") && kbSrc.includes("r.protPor??r.protpack") && kbSrc.includes("r.kcalPor??r.kcalpack") && kbSrc.includes("!isStalePrice(r)") && kbSrc.includes("r.delivers_4020!==false"), "KombiBuilder.tsx uses portion values and filters active Linz fresh rows (SC78 P2.1)")
  const kombiSrc = readFileSync(new URL("../src/views/Kombi.tsx", import.meta.url), "utf8")
  assert.ok(kombiSrc.includes("byId.get(c.main)") && !kombiSrc.includes("R[c.main]"), "Kombi.tsx uses byId.get(c.main) instead of R[c.main] (SC78 P2.1)")

  console.log("[sc78-ui-fixes] OK: P1.1 156 rankableLight meals in 6 views (Analyse, Charts, Brands, HeatMatrix, Kategorien, Grid), P1.2 alsoText & Detail Linz defense-in-depth, P2.1 KombiBuilder portions & Kombi byId")
}

// sensecheck 79 P1.2-UI, P2.1a, P2.1b, P2.2, P2.3a, P2.3b: PriceKpis rowPli+light, Top withPli & isRowRankable, Health/HealthRadar rowP100k, Planner isRowRankable, Netz3D rowPli, Packaging resolveTop
{
  const M = await load("../src/app/meal.ts")
  const active = D.rows.filter(r => r.dupOf == null && r.delivers_4020 !== false)
  const lightRows = active.filter(r => !r.rankable && r.rankableLight)
  assert.ok(lightRows.length >= 140, "at least 140 Linz rankableLight rows in dataset (got " + lightRows.length + ")")
  for (const r of lightRows) {
    assert.ok(M.rowPli(r) != null && M.rowP100k(r) != null, "every rankableLight row has rowPli & rowP100k: #" + r.id)
  }

  // P2.1a: product.tsx PriceKpis uses rowPli(r) + light badge and rowP100k(r)
  const prodSrc = readFileSync(new URL("../src/components/product.tsx", import.meta.url), "utf8")
  assert.ok(!prodSrc.includes("<PliBadge v={r.pli}/>") && prodSrc.includes("<PliBadge v={pli} light={Boolean((r as any).rankableLight)||isLightOnlyRanked(r as any)}/>") && prodSrc.includes("v={rowP100k(r)}"), "product.tsx PriceKpis uses rowPli(r) with light badge and rowP100k(r) (SC79 P2.1a)")

  // P2.1b: Top.tsx uses isRowRankable(r) for cheap and applies withPli to all top lists (incl. hc & cheap)
  const topSrc = readFileSync(new URL("../src/views/Top.tsx", import.meta.url), "utf8")
  assert.ok(!topSrc.includes("r.rankable&&") && topSrc.includes("isRowRankable(r)&&r.eur10p") && topSrc.includes("const rows=withPli(rawRows)"), "Top.tsx uses isRowRankable(r) and applies withPli across all Top modes (SC79 P2.1b)")

  // P2.2: Health.tsx & components/health.tsx use rowP100k(r) everywhere
  const healthViewSrc = readFileSync(new URL("../src/views/Health.tsx", import.meta.url), "utf8")
  const healthCompSrc = readFileSync(new URL("../src/components/health.tsx", import.meta.url), "utf8")
  assert.ok(!healthViewSrc.includes("r.p100k") && healthViewSrc.includes("rowP100k(r)"), "Health.tsx uses rowP100k(r) in scatter data and ScatterTip (SC79 P2.2)")
  assert.ok(!healthCompSrc.includes("r.p100k") && healthCompSrc.includes("rowP100k(r)"), "components/health.tsx uses rowP100k(r) in RadarVsMedian (SC79 P2.2)")

  // P2.3a & P2.3b: Planner.tsx & Netz3D.tsx
  const plannerSrc = readFileSync(new URL("../src/views/Planner.tsx", import.meta.url), "utf8")
  const netzSrc = readFileSync(new URL("../src/views/Netz3D.tsx", import.meta.url), "utf8")
  assert.ok(!plannerSrc.includes("r.rankable") && plannerSrc.includes("isRowRankable(r)"), "Planner.tsx uses isRowRankable(r) so Linz light meals are selectable (SC79 P2.3a)")
  assert.ok(!netzSrc.includes("r.pli") && netzSrc.includes("rowPli(r)"), "Netz3D.tsx uses rowPli(r) in node sizes, links, and tooltip (SC79 P2.3b)")

  // P1.2-UI: Packaging.tsx & AnalyseExt.tsx robust row resolution
  const pkgSrc = readFileSync(new URL("../src/views/Packaging.tsx", import.meta.url), "utf8")
  const aeSrc = readFileSync(new URL("../src/views/AnalyseExt.tsx", import.meta.url), "utf8")
  assert.ok(pkgSrc.includes("resolveTop=") && pkgSrc.includes("onClick={()=>open(r?.id??x.id)}"), "Packaging.tsx resolves Top-5 cards by uid/name+store/url before falling back to x.id (SC79 P1.2-UI)")
  assert.ok(aeSrc.includes("resolveRow="), "AnalyseExt.tsx resolves trap rows by uid/name+store (SC79 P1.2-UI)")
  const pkgJson = JSON.parse(readFileSync(new URL("../public/analysis/packaging_v2.json", import.meta.url), "utf8"))
  for (const t of pkgJson.types || []) {
    for (const x of t.top || []) {
      const resolved = (x.uid && D.rows.find(r => r.uid === x.uid)) || D.rows.find(r => r.dupOf == null && r.name === x.name && r.store === x.store) || (x.url && D.rows.find(r => r.url === x.url)) || D.rows.find(r => r.name === x.name && r.store === x.store) || D.rows.find(r => r.id === x.id)
      assert.ok(resolved && (resolved.name === x.name || resolved.url === x.url), "Packaging Top-5 item resolves to exact product in D.rows: " + x.name)
    }
  }
  const vegMeat = D.rows.filter(r => r.dupOf == null && (r.vegan || (r.cprot || []).includes("vegan") || (r.cprot || []).includes("vegetarisch")) && (r.cprot || []).some(c => ["Rind", "Schwein", "Geflügel", "Fisch"].includes(c)))
  assert.equal(vegMeat.length, 0, "SC79 P1.1: 0 vegan/vegetarian rows carry meat/fish cprot tags")
  const ohneMarke = active.filter(r => !r.brandN || r.brandN === "Ohne Marke" || r.brandN === "unbekannt")
  assert.equal(ohneMarke.length, 0, "SC79 P3.1: 0 Linz rows have Ohne Marke / unbekannt brandN")

  console.log("[sc79-ui-fixes] OK: P1.1 0 veg meat tags, P1.2 analysis JSONs & Packaging/AnalyseExt resolveTop, P3.1 0 Linz Ohne Marke, P2.1a PriceKpis rowPli+light & rowP100k, P2.1b Top withPli & isRowRankable, P2.2 Health/HealthRadar rowP100k, P2.3a Planner isRowRankable, P2.3b Netz3D rowPli, P1.2-UI Packaging & AnalyseExt resolveTop")
}

// SC80 P1.1-UI & P3.1-UI: AnalyseExt OOE_LBL, tier filter, salt_by_packaging share_over_1_5g normalization, Packaging EXCLUDED_STORES + isLinzStore
{
  const aeSrc = readFileSync(new URL("../src/views/AnalyseExt.tsx", import.meta.url), "utf8")
  const pkgSrc = readFileSync(new URL("../src/views/Packaging.tsx", import.meta.url), "utf8")
  assert.ok(aeSrc.includes("OOE_LBL") && aeSrc.includes("🦁 Oberösterreich") && aeSrc.includes("🇦🇹 Übriges Österreich (bekannter Betrieb)") && aeSrc.includes("🌍 Alle Nicht-OÖ-Produkte"), "AnalyseExt.tsx translates ooe_vs_others keys via OOE_LBL (SC80 P1.1-UI)")
  assert.ok(aeSrc.includes("n_with_nutrition>0") && aeSrc.includes("v?.health_score?.median!=null"), "AnalyseExt.tsx filters out tier rows without nutrition values such as health (SC80 P1.1-UI)")
  assert.ok(aeSrc.includes("x.share_over_1_5g>0&&x.share_over_1_5g<=1?Math.round(x.share_over_1_5g*1000)/10:x.share_over_1_5g"), "AnalyseExt.tsx normalizes decimal share_over_1_5g to percent (SC80 P1.1-UI)")
  assert.ok(pkgSrc.includes("EXCLUDED_STORES") && pkgSrc.includes("!EXCLUDED_STORES.has(s.toLowerCase())") && pkgSrc.includes("isLinzStore(s,"), "Packaging.tsx filters t.stores against EXCLUDED_STORES and isLinzStore (SC80 P3.1-UI)")
  console.log("[sc80-ui-fixes] OK: P1.1-UI AnalyseExt OOE_LBL, tier nutrition filter & salt_by_packaging percent normalization, P3.1-UI Packaging EXCLUDED_STORES & isLinzStore filter")
}
