// Sensecheck 33 (1)/(4): alsoText wording for same-store other sizes; '✓ aktuell' follows the price staleness.
// Run: node scripts/test_sc33_ui.mjs [public/data.json]   (part of prepush_gate.sh, fast section)
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
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
assert.equal(F.priceStatusLabel({ pstat: 'Preis 2025', price: 1.99, price_date: '2025-02-04' }), 'Preis von 2025 (Stand 4.2.2025)')
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
  assert.equal(txt({ pstat: 'Preis 2025', price: 1.99, price_date: '2025-02-04' }), 'Preis von 2025 (Stand 4.2.2025)')
  assert.equal(txt({ pstat: 'live 2026', price: 1.99, price_date: '2026-10-13' }), '')
  assert.equal(txt({ pstat: 'Preis 2025', price: 1.99 }), 'Preis von 2025')
  let n41 = 0, bad41 = 0
  for (const r of D.rows) { if (!F.isOldPrice(r) || !r.price_date) continue; n41++; if (txt(r) !== F.priceStatusLabel(r)) bad41++ }
  assert.equal(bad41, 0, 'old-price header text differs from priceStatusLabel')
  console.log(`[sc41-header] OK: #1182 '${txt(t40)}', #1183 '${txt(t1183)}', ${n41} old-price rows: header = priceStatusLabel`)
}
