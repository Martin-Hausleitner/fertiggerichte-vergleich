// Sensecheck 91 P3-4: angezeigter €/100 g (useAppData → consistentP100g) = Preis ÷ Packungsgewicht × 100 (±0,005) für jede Zeile
// mit Preis und Größe; Zeilen ohne Preis/Größe bleiben unverändert; Preis, ppk, pPor, Score und Ranking werden nie verändert.
// SC92 P3: bei ganzzahligen Cent/Gramm exakt kaufmännisch gerundet (halbe Cent aufwärts, Ganzzahl-Orakel).
// Selftest mit vier Mutationen bei jedem Lauf (No-op-Pass, Pass der p100g ohne Preis/Größe löscht, abgeschnittene 0,1-Werte müssen rot werden).
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
const out = await build({ entryPoints: [new URL('../src/app/p100g.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
const S = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
const file = process.argv[2] || 'public/data.json'
const KEEP = ['price', 'size', 'ppk', 'pPor', 'pPorEff', 'score', 'pli', 'ppe', 'rankable', 'rankableLight']

function check(raw, shown) {
  const bad = []
  raw.forEach((r, i) => {
    const s = shown[i]
    for (const k of KEEP) if (s[k] !== r[k]) bad.push(`#${r.id} ${k} geändert`)
    const ok = typeof r.price === 'number' && r.price > 0 && typeof r.size === 'number' && r.size > 0
    if (ok) { const want = r.price / r.size * 100; if (typeof s.p100g !== 'number' || Math.abs(s.p100g - want) > 0.005 + 1e-9) bad.push(`#${r.id} p100g ${s.p100g} ≠ ${r.price}/${r.size}×100 = ${want.toFixed(3)}`) }
    if (ok && Number.isInteger(r.size) && Number.isInteger(Math.round(r.price * 100))) { const c = Math.round(r.price * 100); const half = Math.floor((2 * c * 100 + r.size) / (2 * r.size)) / 100; if (s.p100g !== half) bad.push(`#${r.id} p100g ${s.p100g} ≠ kaufmännisch gerundet ${half}`) }
    else if (s.p100g !== r.p100g) bad.push(`#${r.id} p100g ohne Preis/Größe verändert`)
  })
  return bad
}

// --- Selftest: SC91-Zeilen #547/#576/#28/#1303 (Altpreis), eine korrekte Zeile, eine ohne Preis, eine ohne Größe ---
const fx = [
  { id: 547, price: 3.99, size: 900, p100g: 0.42, ppk: 4.43 },
  { id: 576, price: 3.64, size: 710, p100g: 0.52, ppk: 5.13 },
  { id: 28, price: 5.29, size: 500, p100g: 0.7, ppk: 10.58 },
  { id: 1303, price: 2.49, size: 400, p100g: 0.82, ppk: 6.23 },
  { id: 10, price: 2.0, size: 400, p100g: 0.5, ppk: 5 },
  { id: 11, price: null, size: 400, p100g: 0.6 },
  { id: 12, price: 2.5, size: null, p100g: null },
  { id: 1170, price: 0.99, size: 200, p100g: 0.49 }, // SC92 P3: exakt halber Cent → 0,50
  { id: 2951, price: 11.79, size: 600, p100g: 1.96 }, // 1,965 → 1,97
]
const fixed = S.consistentP100g(fx)
assert.deepEqual(check(fx, fixed), [], 'Selftest: Pass muss die Fixture reparieren')
assert.equal(fixed[0].p100g, 0.44); assert.equal(fixed[1].p100g, 0.51); assert.equal(fixed[2].p100g, 1.06); assert.equal(fixed[3].p100g, 0.62)
assert.equal(fixed[7].p100g, 0.5); assert.equal(fixed[8].p100g, 1.97)
assert.equal(fixed[4], fx[4], 'korrekte Zeile behält Identität'); assert.equal(fixed[5].p100g, 0.6); assert.equal(fixed[6].p100g, null)
const muts = [
  ['No-op', rows => rows],
  ['löscht p100g ohne Preis/Größe', rows => S.consistentP100g(rows).map(r => (S.p100gOf(r) == null ? { ...r, p100g: null } : r))],
  ['Float-Rundung Math.round(x·10000)/100 (halbe Cent abwärts)', rows => rows.map(r => (r.price && r.size ? { ...r, p100g: Math.round(r.price / r.size * 10000) / 100 } : r))],
  ['ohne Rundung auf ppk/10 mit Abschneiden', rows => rows.map(r => (r.price && r.size ? { ...r, p100g: Math.floor(r.price / r.size * 10) / 10 } : r))],
]
for (const [n, m] of muts) assert.ok(check(fx, m(fx)).length > 0, `Selftest: Mutation „${n}“ muss rot werden`)

const raw = JSON.parse(readFileSync(file, 'utf8')).rows
const before = check(raw, raw).length
const bad = check(raw, S.consistentP100g(raw))
if (bad.length) { console.error(`[p100g] FAIL ${bad.length}:\n` + bad.slice(0, 20).join('\n')); process.exit(1) }
console.log(`[p100g] OK – ${raw.length} Zeilen, ${before} Altpreis-Abweichungen im Export werden in der App korrigiert, Selftest + ${muts.length} Mutationen rot`)

// SC101 P3-2: Gerichte-Karte zeigt €/100 g aus p100g (nicht ppk/10 → doppelte Rundung, #77 1,49 statt 1,50, #123 2,42 statt 2,41).
// SC101b P3-2: ppk/10-Fallback nur mit Packungsgröße (25+ Zeilen ohne size/p100g haben ppk = Stückpreis → unplausible €/100 g), sonst „–“.
const cardOk = (src) => src.includes("{r.p100g!=null?fmt(r.p100g,2)+' €':r.ppk!=null&&r.size!=null&&r.size>0?fmt(r.ppk/10,2)+' €':'–'}") // p100g zuerst, ppk/10 nur ohne p100g und mit Größe
const gsrc = readFileSync(new URL('../src/views/Gerichte.tsx', import.meta.url), 'utf8')
assert.ok(cardOk(gsrc), 'Gerichte.tsx: Karten-€/100 g muss r.p100g verwenden')
for (const [n, m] of [['alter Ausdruck ppk/10', s => s.replace("r.p100g!=null?fmt(r.p100g,2)+' €':", '')], ['p100g-Zweig entfernt', s => s.replace(/fmt\(r\.p100g,2\)/g, 'fmt(r.ppk/10,2)')], ['ppk/10 ohne Größe (SC101b)', s => s.replace('r.ppk!=null&&r.size!=null&&r.size>0?', 'r.ppk!=null?')]])
  assert.ok(!cardOk(m(gsrc)), `Selftest Karte: Mutation „${n}“ muss rot werden`)
const shownRows = S.consistentP100g(raw); const fmt2 = (x) => (Math.round(x * 100) / 100).toFixed(2)
const cardDiff = shownRows.filter(r => r.p100g != null && r.ppk != null && fmt2(r.ppk / 10) !== fmt2(r.p100g)).length
console.log(`[p100g] Gerichte-Karte nutzt p100g – ${cardDiff} Zeilen, in denen ppk/10 abweichen würde`)
const noSize = shownRows.filter(r => r.p100g == null && r.ppk != null && !(r.size > 0))
const cardShown = (r) => (r.p100g != null ? fmt2(r.p100g) : r.ppk != null && r.size != null && r.size > 0 ? fmt2(r.ppk / 10) : '–')
assert.ok(noSize.every(r => cardShown(r) === '–'), 'Zeilen ohne Größe/p100g müssen „–“ zeigen')
console.log(`[p100g] SC101b: ${noSize.length} Zeilen ohne Größe/p100g zeigen „–“ statt ppk/10 (${noSize.filter(r => r.dishKey).length} auf der Gerichte-Karte)`)
