// Sensecheck 100 P3-1: angezeigter €/kg (useAppData → consistentPpk) = Preis ÷ Größe × 1000 kaufmännisch gerundet
// (halbe Cent aufwärts, Ganzzahl-Orakel) für jede Zeile mit Preis, Größe und reiner Rundungsabweichung; echte
// Abweichungen, Zeilen ohne Preis/Größe sowie Preis, Größe, p100g, pPor, Score und Ranking bleiben unverändert.
// Selftest mit Mutationen bei jedem Lauf (No-op, alte Float-Rundung, überschreibt echte Abweichung, löscht ppk ohne Größe).
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
const out = await build({ entryPoints: [new URL('../src/app/ppk.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
const S = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
const file = process.argv[2] || 'public/data.json'
const KEEP = ['price', 'size', 'p100g', 'pPor', 'pPorEff', 'score', 'pli', 'ppe', 'rankable', 'rankableLight']

function check(raw, shown) {
  const bad = []
  raw.forEach((r, i) => {
    const s = shown[i]
    for (const k of KEEP) if (s[k] !== r[k]) bad.push(`#${r.id} ${k} geändert`)
    const ok = typeof r.price === 'number' && r.price > 0 && typeof r.size === 'number' && r.size > 0 && typeof r.ppk === 'number'
    const exact = ok ? r.price / r.size * 1000 : null
    if (ok && Math.abs(r.ppk - exact) <= 0.005 + 1e-9 && Number.isInteger(r.size) && Number.isInteger(Math.round(r.price * 100))) {
      const c = Math.round(r.price * 100); const half = Math.floor((2 * c * 1000 + r.size) / (2 * r.size)) / 100
      if (s.ppk !== half) bad.push(`#${r.id} ppk ${s.ppk} ≠ kaufmännisch gerundet ${half}`)
    } else if (!(ok && Math.abs(r.ppk - exact) <= 0.005 + 1e-9) && s.ppk !== r.ppk) bad.push(`#${r.id} ppk ohne reine Rundungsabweichung verändert`)
  })
  return bad
}

const fx = [
  { id: 8, price: 3.19, size: 400, ppk: 7.97 }, // 7,975 → 7,98
  { id: 2, price: 2.0, size: 400, ppk: 5 },
  { id: 3, price: 2.5, size: 400, ppk: 9.99 }, // echte Abweichung bleibt
  { id: 4, price: 2.5, size: null, ppk: 6.1 },
  { id: 5, price: 0.99, size: 200, ppk: 4.95 },
  { id: 2143, price: 4.39, size: 400, ppk: 10.97 }, // 10,975 → 10,98 (Float-Rundung bliebe 10,97)
]
const fixed = S.consistentPpk(fx)
assert.deepEqual(check(fx, fixed), [], 'Selftest: Pass muss die Fixture reparieren')
assert.equal(fixed[0].ppk, 7.98); assert.equal(fixed[1], fx[1], 'korrekte Zeile behält Identität'); assert.equal(fixed[2].ppk, 9.99); assert.equal(fixed[3].ppk, 6.1); assert.equal(fixed[4].ppk, 4.95); assert.equal(fixed[5].ppk, 10.98)
const muts = [
  ['No-op', rows => rows],
  ['Float-Rundung Math.round(x·100000)/100 (halbe Cent abwärts)', rows => rows.map(r => (r.price && r.size && r.ppk != null && Math.abs(r.ppk - r.price / r.size * 1000) <= 0.006 ? { ...r, ppk: Math.round(r.price / r.size * 100000) / 100 } : r))],
  ['überschreibt echte Abweichung', rows => rows.map(r => (S.ppkOf(r) != null ? { ...r, ppk: S.ppkOf(r) } : r))],
  ['löscht ppk ohne Größe', rows => S.consistentPpk(rows).map(r => (S.ppkOf(r) == null ? { ...r, ppk: null } : r))],
]
for (const [n, m] of muts) assert.ok(check(fx, m(fx)).length > 0, `Selftest: Mutation „${n}“ muss rot werden`)

const raw = JSON.parse(readFileSync(file, 'utf8')).rows
const before = check(raw, raw).length
const bad = check(raw, S.consistentPpk(raw))
if (bad.length) { console.error(`[ppk] FAIL ${bad.length}:\n` + bad.slice(0, 20).join('\n')); process.exit(1) }
console.log(`[ppk] OK – ${raw.length} Zeilen, ${before} Halbcent-Abrundungen im Export werden in der App korrigiert, Selftest + ${muts.length} Mutationen rot`)
