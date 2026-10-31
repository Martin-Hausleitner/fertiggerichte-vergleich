// Sensecheck 88 P3-3: Score = Σ score_parts (|score − clamp(Σ parts, 0, 100)| ≤ 0,05) für alle Zeilen, wie die App sie anzeigt
// (useAppData → consistentParts). Score/Ranking bleiben unverändert: score, sugar-Teil und ganzzahlige Teile werden nie verschoben,
// jeder Teil höchstens um 0,1. Nicht-Rundungs-Lücken (Datenfehler, z. B. #1212 Literal 29,9 vs. Teile 21,5) zählen gegen ein Budget,
// bis der Datenzweig (fertig sc88-p2, sc88_fixes.consistent_parts) sie im Export schließt. Selftest mit Mutation bei jedem Lauf.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
const out = await build({ entryPoints: [new URL('../src/app/scoreParts.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
const S = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
const file = process.argv[2] || 'public/data.json'
const MAX_NONROUNDING = Number(process.env.SCORE_PARTS_NONROUNDING_MAX ?? 1)
const TOL = 0.05

/** Prüft angezeigte Zeilen; liefert Verstöße (Liste) gegen |score − clamp(Σ)| ≤ 0,05 und gegen die Unveränderlichkeit. */
function check(raw, shown) {
  const bad = []
  raw.forEach((r, i) => {
    const s = shown[i]
    if (s.score !== r.score) bad.push(`#${r.id} score geändert ${r.score} → ${s.score}`)
    if (Math.abs(S.partsGap(s)) > TOL) bad.push(`#${r.id} score ${s.score} vs Σ ${Math.round((s.score - S.partsGap(s)) * 10) / 10}`)
    if (r.score_parts && s.score_parts !== r.score_parts) for (const [k, v] of Object.entries(r.score_parts)) {
      const d = Math.abs(s.score_parts[k] - v)
      if (d > 0.1 + 1e-9) bad.push(`#${r.id} ${k} ${v} → ${s.score_parts[k]} (> 0,1)`)
      if (d > 1e-9 && (k === 'sugar' || k === 'base' || Math.abs(v - Math.round(v)) < 1e-6)) bad.push(`#${r.id} ganzzahliger/sugar-Teil ${k} verschoben`)
    }
  })
  return bad
}

// --- Selftest (synthetische Fixture: die vier SC88-Zeilen + geklemmte Zeile + Nicht-Rundungs-Lücke) ---
const fx = [
  { id: 1941, score: 31.2, score_parts: { base: 30.0, protein: 12.2, salt: -5.1, satfat: -4.3, sugar: 0.0, fiber: 3.2, veg: 0, nova: -3, portion_salt: -4.8, portion_satfat: -1.8, portion_protein: 5 } },
  { id: 2069, score: 31.4, score_parts: { base: 30.0, protein: 15.2, salt: -4.9, satfat: -6.7, sugar: -2.0, fiber: 3.0, veg: 0, nova: -3, portion_salt: -2.7, portion_satfat: -2.7, portion_protein: 5 } },
  { id: 2669, score: 30.2, score_parts: { base: 30.0, protein: 17.1, salt: -7.1, satfat: -3.3, sugar: 0.0, fiber: 3.2, veg: 5.8, nova: -10, portion_salt: -8, portion_satfat: -2.3, portion_protein: 5 } },
  { id: 2995, score: 32.3, score_parts: { base: 30.0, protein: 13.2, salt: -5.1, satfat: -5.3, sugar: 0.0, fiber: 2.7, veg: 0, nova: -3 } },
  { id: 568, score: 0, score_parts: { base: 30.0, protein: 7.8, salt: -20, satfat: -15, sugar: -2.0, fiber: 0, veg: 0, nova: -3, portion_salt: -8, portion_satfat: -4.0 } },
  { id: 9, score: 40.0, score_parts: { base: 30.0, protein: 10.0 } },
  { id: 11, score: 24.1, score_parts: { base: 30.0, protein: 5.3, sugar: -12.5, salt: 1.2 } },
  { id: 7, score: 29.9, score_parts: { base: 30.0, protein: 18.4, salt: -2.9, nova: -10, portion_salt: -5.4, portion_satfat: -7.9, portion_protein: 5 } },
]
const fxOrig = JSON.stringify(fx)
const fxShown = S.consistentParts(fx)
assert.equal(JSON.stringify(fx), fxOrig, 'consistentParts darf die Eingabe nicht verändern')
const fxBad = check(fx, fxShown)
assert.deepEqual(fxBad.map(b => b.split(' ')[0]), ['#7'], 'Selftest: nur die Nicht-Rundungs-Lücke #7 bleibt: ' + fxBad.join('; '))
for (const id of [1941, 2069, 2669, 2995]) assert.notEqual(fxShown.find(r => r.id === id).score_parts, fx.find(r => r.id === id).score_parts, `Selftest #${id} korrigiert`)
assert.equal(fxShown.find(r => r.id === 568).score_parts, fx.find(r => r.id === 568).score_parts, 'Selftest: geklemmte Zeile (score 0) bleibt')
// Mutation 1: App ohne Korrektur (Identität) → die vier SC88-Zeilen fallen auf
const m1 = check(fx, fx).map(b => b.split(' ')[0])
for (const id of [1941, 2069, 2669, 2995]) assert.ok(m1.includes('#' + id), `Mutation 1 (keine Korrektur) muss #${id} melden`)
// Mutation 2: Korrektur schiebt Score statt Teile → Score-Änderung gemeldet
const m2 = check(fx, fx.map(r => ({ ...r, score: Math.round((r.score - S.partsGap(r)) * 10) / 10 })))
assert.ok(m2.some(b => /score geändert/.test(b)), 'Mutation 2 (Score verschoben) muss fehlschlagen')
// Mutation 3: ganze Lücke auf einen Teil (auch sugar) → > 0,1 / sugar gemeldet
const m3 = check(fx, fx.map(r => r.id === 1941 ? { ...r, score_parts: { ...r.score_parts, sugar: -0.2 } } : S.consistentParts([r])[0]))
assert.ok(m3.some(b => /#1941 sugar 0 → -0.2/.test(b)) && m3.some(b => /#1941 ganzzahliger\/sugar-Teil sugar/.test(b)), 'Mutation 3 (sugar-Teil verschoben) muss fehlschlagen')

// SC89 P3-1: gebrochener sugar-Teil (#11, größter Kandidat) darf nie verschoben werden – der Schutz in isFrac ist sonst ungetestet
const fx11 = fxShown.find(r => r.id === 11)
assert.equal(fx11.score_parts.sugar, -12.5, 'Selftest #11: sugar-Teil unverändert')
assert.equal(fx11.score_parts.protein, 5.4, 'Selftest #11: Lücke auf protein statt sugar')
// Mutation 4: sugar-Schutz aus isFrac entfernt → check() muss #11 sugar melden
const srcSP = readFileSync(new URL('../src/app/scoreParts.ts', import.meta.url), 'utf8')
const srcMut = srcSP.replace("k !== 'sugar' && ", '')
assert.notEqual(srcMut, srcSP, 'Mutation 4: sugar-Schutz im Quelltext nicht gefunden')
const outMut = await build({ stdin: { contents: srcMut, loader: 'ts', resolveDir: new URL('../src/app/', import.meta.url).pathname }, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
const SM = await import('data:text/javascript;base64,' + Buffer.from(outMut.outputFiles[0].text).toString('base64'))
const m4 = check(fx, SM.consistentParts(fx))
assert.ok(m4.some(b => /#11 ganzzahliger\/sugar-Teil sugar/.test(b)), 'Mutation 4 (sugar-Schutz entfernt) muss fehlschlagen: ' + m4.join('; '))

// --- echte Daten ---
const rows = JSON.parse(readFileSync(file, 'utf8')).rows
const scored = rows.filter(r => r.score != null && r.score_parts)
assert.ok(scored.length > 1000, `zu wenige Zeilen mit score_parts (${scored.length}) – Datenformat geändert?`)
const rawGaps = scored.filter(r => Math.abs(S.partsGap(r)) > TOL)
const shown = S.consistentParts(rows)
const bad = check(rows, shown)
const nonRounding = bad.filter(b => / vs Σ /.test(b))
const other = bad.filter(b => !/ vs Σ /.test(b))
const near = [1941, 2069, 2669, 2995].map(id => { const i = rows.findIndex(r => r.id === id); return i < 0 ? `#${id} fehlt` : `#${id} ${rows[i].score} = Σ ${Math.round((rows[i].score - S.partsGap(shown[i])) * 10) / 10}` })
console.log(`[sc88-p3-3] ${scored.length} Zeilen mit score_parts; Export-Lücken ${rawGaps.length} (Datenzweig), nach App-Korrektur ${nonRounding.length} Nicht-Rundungs-Lücken (Budget ${MAX_NONROUNDING}): ${nonRounding.join('; ')}; ${near.join(', ')}`)
let fail = false
if (other.length) { fail = true; console.error('FAIL Score/Teile unzulässig verändert:\n  ' + other.slice(0, 20).join('\n  ')) }
if (nonRounding.length > MAX_NONROUNDING) { fail = true; console.error(`FAIL |score − Σ parts| > ${TOL}: ${nonRounding.length} > Budget ${MAX_NONROUNDING}\n  ` + nonRounding.slice(0, 20).join('\n  ')) }
const src = readFileSync(new URL('../src/hooks/useAppData.ts', import.meta.url), 'utf8')
if (!/consistentParts\(dedupeGtin\(raw\.rows\)\)/.test(src)) { fail = true; console.error('FAIL useAppData.ts wendet consistentParts nicht auf die Zeilen an') }
if (fail) process.exit(1)
console.log('ok test_score_parts')
