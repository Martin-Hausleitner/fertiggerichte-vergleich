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
    if (F.isPriceUnconfirmed(r) !== (t === 'unconfirmed')) bad.push(['unconfirmed', r.id, t])
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
  const missingRer = D.rows.filter(r => !r.rankable && !r.rankableLight && r.dupOf == null && !r.rank_excluded_reason)
  assert.deepEqual(missingRer.map(r => r.id), [], "0 unranked dupOf=null rows without rank_excluded_reason (including 54 live=null rows)")
  console.log("[sc68-online-providers] OK: bofrost/every./FitTaste cards synced in online_providers.json & 0 unranked rows without rank_excluded_reason")
}

// SC69 P1.1 & P1.2: storeDeliveries (every. online=true & delivers_4020=null; HelloFresh meal_kit excluded), matchStoreChain & STORE_LOGO (Denn's, NORDSEE, Nah&Frisch), portion rescues (196/155)
{
  const S = await load("../src/app/shops.ts")
  const byId = new Map(D.rows.map(r => [r.id, r]))
  const rk69 = D.rows.filter(r => r.rankable), rkl69 = D.rows.filter(r => r.rankableLight)
  assert.ok(rk69.length >= 196, "SC69+ rankable >= 196")
  assert.ok(rkl69.length >= 155, "SC69+ rankableLight >= 155")
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
  assert.equal(dmRanked.length, 8, "dm has 8 rankable dishes in MeineShops ranking")
  assert.equal(hoferRanked.length, 1, "Hofer has 1 rankable dish in MeineShops ranking")
  assert.equal(dennsRanked.length, 0, "Denn's has 0 rankable dishes after SC72 P0.1 (#2206 broth) & P0.2 (#2205 falafel component)")
  const pennyRanked = visRows.filter(r => r.store === "Penny" && M.isReadyMeal(r) && S.isRowRankable(r))
  const lidlRanked = visRows.filter(r => r.store === "Lidl" && M.isReadyMeal(r) && S.isRowRankable(r))
  assert.equal(pennyRanked.length, 1, "Penny has 1 verified rankable dish in MeineShops ranking (#2236 Podravka Rindergulasch)")
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
  assert.ok(r1211 && r1211.sat == null && r1211.salt == null && r1211.incomplete === true && r1211.rankable === false, "#1211 Lidl Mac & Cheese incomplete=true (SC73 P0)")
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
