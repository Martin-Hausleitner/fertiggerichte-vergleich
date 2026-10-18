// UI follow-up Sensecheck 28: classify shop links that are only a search/category page or PDF (src/app/linkKind.ts).
// Run: node scripts/test_linkkind.mjs [public/data.json]   (part of prepush_gate.sh, fast section)
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const out = await build({ entryPoints: [new URL('../src/app/linkKind.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node' })
const L = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
assert.equal(L.linkKind('https://www.hofer.at/suchergebnisse?q=Lasagne'), 'search')
assert.equal(L.linkKind('https://www.interspar.at/shop/lebensmittel/search/?q=SPAR%20Risotto'), 'search')
assert.equal(L.linkKind('https://www.bofrost.at/shop/fleisch_44196'), 'category')
assert.equal(L.linkKind('https://www.bofrost.at/shop/suesse-vielfalt_44201/x_48009/kaiserschmarrn_01575.html'), 'product')
assert.equal(L.linkKind('https://shop.billa.at/produkte/billa-lasagne-bolognese-00697017'), 'product')
assert.equal(L.linkKind('https://www.subway.com/a/menu.pdf#sub'), 'pdf')
assert.equal(L.linkKind(null), null)
assert.equal(L.linkLabel('https://www.hofer.at/suchergebnisse?q=x'), 'Shop-Suche, keine Produktseite')
assert.equal(L.linkLabel('https://shop.billa.at/produkte/x-1'), null)
// sensecheck 36 (2): pack-size notice for shop links that may open another pack size
assert.equal(L.linkPackLabel({ kind: 'otherPack', note: 'Shopseite evtl. andere Packungsgröße' }), 'Shopseite evtl. andere Packungsgröße')
assert.equal(L.linkPackLabel({ kind: 'weight' }), 'Shopseite zeigt Kilopreis (Gewichtsware)')
assert.equal(L.linkPackLabel(null), null)
assert.equal(L.rowLinkLabel({ url: 'https://www.interspar.at/p/5528158', linkPack: { kind: 'otherPack' } }), 'Shopseite evtl. andere Packungsgröße')
assert.equal(L.rowLinkLabel({ url: 'https://www.hofer.at/suchergebnisse?q=x', linkPack: { kind: 'otherPack' } }), 'Shop-Suche, keine Produktseite')
assert.equal(L.rowLinkLabel({ url: null, linkPack: { kind: 'otherPack' } }), null)
assert.equal(L.rowLinkLabel({ url: 'https://shop.billa.at/produkte/x-1' }), null)
const D = JSON.parse(readFileSync(process.argv[2] || new URL('../public/data.json', import.meta.url), 'utf8'))
const c = {}; for (const r of D.rows) { const k = L.linkKind(r.url) ?? 'none'; c[k] = (c[k] || 0) + 1 }
const flagged = (c.search || 0) + (c.category || 0) + (c.pdf || 0)
const byUid = u => D.rows.find(r => r.uid === u)
for (const [u, pk] of [['ykeyrb04hq', '700 G']]) {   // #78 Iglo Lasagne 350 g (sensecheck 37 (1): #420 Efko / #1120 Jackfrucht now net size = shop pack, see below)
  const r = byUid(u); assert.ok(r?.url && r.linkPack?.kind === 'otherPack' && r.linkPack.shopPack === pk && L.rowLinkLabel(r) === L.LINKPACK_NOTE, `linkPack ${u}`)
}
assert.equal(byUid('5ruglnj5no')?.linkPack?.kind, 'weight')   // #216 SPAR Natur*pur Bio-Rinds-Gulasch ca. 300 g (Kilopreis)
assert.ok(!byUid('273fww4rap')?.linkPack && byUid('273fww4rap')?.size === 400, '#1470 Linseneintopf 400 g, no notice')
for (const [u, net, dr] of [['7g0n0evi73', 670, 375], ['rcrm56uxfu', 400, 240]]) {   // sensecheck 37 (1): drained weight separately, no pack-size notice
  const r = byUid(u); assert.ok(r && r.size === net && r.drainedWeight === dr && !r.linkPack && L.rowLinkLabel(r) === null, `drained ${u}`)
}
// sensecheck 38 (4): Billa weight articles (placeholder 1000 g, price = €/kg) carry the weight notice like #216
for (const u of ['m73tjsoff1', 'oye0l1goid']) { const r = byUid(u); assert.equal(r?.linkPack?.kind, 'weight', u); assert.equal(L.linkPackLabel(r.linkPack), 'Shopseite zeigt Kilopreis (Gewichtsware)'); assert.equal(r.pPor, null) }   // #662 Roastbeef, #867 Beef Ribs
assert.deepEqual(D.rows.filter(r => r.store === 'Billa' && r.kiloErr && r.size === 1000 && r.dupOf == null && !r.linkPack).map(r => r.id), [], 'every Billa kilo-price row has the weight notice')
const lp = D.rows.filter(r => r.linkPack); assert.equal(lp.length, D.linkPackCheck?.n, 'linkPackCheck.n')
const lpc = {}; for (const r of lp) lpc[r.linkPack.kind] = (lpc[r.linkPack.kind] || 0) + 1
console.log(`[linkkind] OK: ${JSON.stringify(c)}, flagged ${flagged} (Shop-Suche/Kategorie ${(c.search || 0) + (c.category || 0)}, PDF ${c.pdf || 0}); pack-size notice ${lp.length} ${JSON.stringify(lpc)} (visible ${lp.filter(r => r.dupOf == null).length})`)
