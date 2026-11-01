// Sensecheck 91 P3-7: in topPE/topPLI (+Uncapped) stehen benachbarte Einträge mit gleichem gerundetem Key nach dem
// ungerundeten Key (PE protPor/pPor, PLI 0.5·score + 0.5·min(protPor/pPorEff/20,1)·100), Gleichstand nach ID.
// Menge, Länge und Cap jeder Liste bleiben gleich, Werte außerhalb von Gleichstands-Läufen behalten ihre Position.
// Selftest mit drei Mutationen (No-op, ID-Sortierung, Sortierung über die ganze Liste) bei jedem Lauf.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
const out = await build({ entryPoints: [new URL('../src/app/tieOrder.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
const S = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
const file = process.argv[2] || 'public/data.json'
const LISTS = [['topPE', 'ppe', S.ppeRaw], ['topPEUncapped', 'ppe', S.ppeRaw], ['topPLI', 'pli', S.pliRaw], ['topPLIUncapped', 'pli', S.pliRaw]]

function check(raw, shown) {
  const by = new Map(raw.rows.map(r => [r.id, r])); const bad = []
  for (const [L, k, f] of LISTS) {
    const a = raw[L], b = shown[L]; if (!a) continue
    if (JSON.stringify([...a].sort((x, y) => x - y)) !== JSON.stringify([...b].sort((x, y) => x - y))) { bad.push(`${L} Menge geändert`); continue }
    a.forEach((id, i) => { if (by.get(b[i])?.[k] !== by.get(id)?.[k]) bad.push(`${L}[${i}] gerundeter Wert verschoben`) })
    for (let i = 0; i + 1 < b.length; i++) {
      const p = by.get(b[i]), q = by.get(b[i + 1]); if (p[k] !== q[k]) continue
      const x = f(p), y = f(q); if (x == null || y == null) continue
      if (x < y - 1e-9 || (Math.abs(x - y) <= 1e-9 && b[i] > b[i + 1])) bad.push(`${L} #${b[i]} (${x.toFixed(3)}) vor #${b[i + 1]} (${y.toFixed(3)})`)
    }
  }
  return bad
}

// --- Selftest: SC91-Paare #1499/#2236 (PE 8.8), #2797/#2834 (PLI 49.5), echter Gleichstand #576/#577, Nachbar #10 ---
const fx = { rows: [
  { id: 1499, ppe: 8.8, protPor: 61.5, pPor: 6.99, pli: 44.2, score: 44.5 },
  { id: 2236, ppe: 8.8, protPor: 44, pPor: 4.99, pPorEff: 4.99, pli: 37.1, score: 30.2 },
  { id: 2797, ppe: 7, protPor: 43.5, pPor: 6.24, pPorEff: 7.24, pli: 49.5, score: 68.9 },
  { id: 2834, ppe: 6.6, protPor: 41, pPor: 6.24, pPorEff: 7.24, pli: 49.5, score: 70.7 },
  { id: 576, ppe: 9, protPor: 45, pPor: 5, pli: 50, score: 60 }, { id: 577, ppe: 9, protPor: 45, pPor: 5, pli: 50, score: 60 },
  { id: 10, ppe: 5, protPor: 20, pPor: 4, pli: 30, score: 40 } ],
  topPE: [577, 576, 1499, 2236, 2797, 10], topPLI: [577, 576, 2797, 2834, 1499, 10] }
const fixed = S.orderTopTies(fx)
assert.deepEqual(check(fx, fixed), [], 'Selftest: Pass muss die Fixture reparieren')
assert.deepEqual(fixed.topPE, [576, 577, 2236, 1499, 2797, 10]); assert.deepEqual(fixed.topPLI, [576, 577, 2834, 2797, 1499, 10])
assert.equal(fixed.rows, fx.rows, 'rows behalten Identität')
const muts = [
  ['No-op', d => d],
  ['nur ID-Sortierung', d => ({ ...d, topPE: S.orderTies(d.topPE, new Map(d.rows.map(r => [r.id, r])), r => r.ppe, () => 0), topPLI: S.orderTies(d.topPLI, new Map(d.rows.map(r => [r.id, r])), r => r.pli, () => 0) })],
  ['ganze Liste nach Rohwert', d => { const by = new Map(d.rows.map(r => [r.id, r])); return { ...d, topPE: [...d.topPE].sort((a, b) => S.ppeRaw(by.get(b)) - S.ppeRaw(by.get(a))) } }],
]
for (const [n, m] of muts) assert.ok(check(fx, m(fx)).length > 0, `Selftest: Mutation „${n}“ muss rot werden`)

const raw = JSON.parse(readFileSync(file, 'utf8'))
const before = check(raw, raw).length
const bad = check(raw, S.orderTopTies(raw))
if (bad.length) { console.error(`[tie_order] FAIL ${bad.length}:\n` + bad.slice(0, 20).join('\n')); process.exit(1) }
console.log(`[tie_order] OK – topPE/topPLI(+Uncapped): ${before} Gleichstands-Inversionen im Export werden in der App korrigiert, Menge/Cap unverändert, Selftest + ${muts.length} Mutationen rot`)
