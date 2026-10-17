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
const D = JSON.parse(readFileSync(process.argv[2] || new URL('../public/data.json', import.meta.url), 'utf8'))
const c = {}; for (const r of D.rows) { const k = L.linkKind(r.url) ?? 'none'; c[k] = (c[k] || 0) + 1 }
const flagged = (c.search || 0) + (c.category || 0) + (c.pdf || 0)
console.log(`[linkkind] OK: ${JSON.stringify(c)}, flagged ${flagged} (Shop-Suche/Kategorie ${(c.search || 0) + (c.category || 0)}, PDF ${c.pdf || 0})`)
