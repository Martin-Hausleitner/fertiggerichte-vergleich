// Sensecheck 91 P3-8: Top-Listen nennen, wie viele höher bewertete Gerichte das Anbieter-Limit verdrängt.
// capHidden zählt ids aus topXUncapped[0..N) (N = Länge der gecappten Liste), die in topX fehlen, je Laden.
// Prüft gegen data.json: Anzahl = Mengen-Differenz, Summe je Laden = Anzahl, Listen selbst unverändert.
// Selftest mit drei Mutationen (immer 0, ganze Uncapped-Liste statt Top N, Text ohne Anzahl) bei jedem Lauf.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
const out = await build({ entryPoints: [new URL('../src/app/capHidden.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
const S = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))

function check(M, d) {
  const by = new Map(d.rows.map(r => [r.id, r])); const bad = []
  for (const L of ['topPLI', 'topHealth', 'topPE', 'topLight']) {
    const c = d[L], u = d[L + 'Uncapped']; if (!c || !u) continue
    const want = u.slice(0, c.length).filter(i => !c.includes(i) && by.has(i)).length
    const h = M.capHidden(c, u, by)
    if (h.n !== want) bad.push(`${L}: ${h.n} statt ${want} verdrängt`)
    if (h.byStore.reduce((a, [, n]) => a + n, 0) !== h.n) bad.push(`${L}: Summe je Laden ≠ ${h.n}`)
    const t = M.capHiddenText(h)
    if (want ? !t.includes(` ${want} `) : t !== '') bad.push(`${L}: Text „${t}“ passt nicht zu ${want}`)
  }
  return bad
}

// --- Selftest: 4 Zeilen, Cap verdrängt #3 (A) aus Top 2 ---
const fx = { rows: [{ id: 1, store: 'A' }, { id: 2, store: 'B' }, { id: 3, store: 'A' }, { id: 4, store: 'C' }], topPLI: [1, 2], topPLIUncapped: [1, 3, 2, 4] }
assert.deepEqual(check(S, fx), [], 'Fixture muss grün sein')
assert.equal(S.capHidden(fx.topPLI, fx.topPLIUncapped, new Map(fx.rows.map(r => [r.id, r]))).byStore[0][0], 'A')
const muts = {
  'immer 0': { ...S, capHidden: () => ({ n: 0, byStore: [] }) },
  'ganze Liste': { ...S, capHidden: (c, u, m) => { const s = new Set(c); const r = u.filter(i => !s.has(i) && m.has(i)); return { n: r.length, byStore: [['?', r.length]] } } },
  'Text ohne Anzahl': { ...S, capHiddenText: h => h.n ? ' Weitere Gerichte ausgeblendet.' : '' },
}
for (const [n, M] of Object.entries(muts)) assert.ok(check(M, fx).length > 0, `Mutation „${n}“ muss rot sein`)

const d = JSON.parse(readFileSync(process.argv[2] || 'public/data.json', 'utf8'))
const bad = check(S, d)
if (bad.length) { console.error('test_cap_hidden FAIL\n' + bad.join('\n')); process.exit(1) }
const by = new Map(d.rows.map(r => [r.id, r]))
console.log('test_cap_hidden OK ' + ['topPLI', 'topHealth', 'topPE', 'topLight'].map(L => `${L} ${S.capHidden(d[L], d[L + 'Uncapped'], by).n}`).join(', ') + ' (Selftest + 3 Mutationen rot)')
