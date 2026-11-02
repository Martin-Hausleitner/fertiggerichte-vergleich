// Sensecheck 92 P3: ml-Gerichte werden als „€/100 ml“ und „… ml“ beschriftet, alle anderen bleiben „g“.
// Erwartet: genau die 7 Flüssig-Gerichte aus SC92 (#2722 #2724 #3209 #3219 #3220 #3221 #3223) sind ml; Tupperware/Non-Food nicht.
// Selftest mit 3 Mutationen (immer g, jede ml/l-Angabe zählt, Multiplikator ignoriert) muss rot werden.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
const out = await build({ entryPoints: [new URL('../src/app/unit.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' })
const S = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
const d = JSON.parse(readFileSync(process.argv[2] || 'public/data.json', 'utf8'))
const rows = Array.isArray(d) ? d : d.rows
const fx = [
  { id: 2722, name: "Hausg'mocht Erdäpfel-Rübengulasch 410ml", size: 410, want: 'ml' },
  { id: 3219, name: 'Bio Karottensuppe mit Ingwer 375ml - 6er Vorteilspack von Rettergut', size: 2250, want: 'ml' },
  { id: 271, name: 'Tupperware Wonderlier Bowl Set 775ml, 1,1L, 1,75L', size: 1750, nonfood: true, want: 'g' },
  { id: 9, name: 'Gulasch 1 l Topf', size: 800, want: 'g' },
  { id: 8, name: 'Lasagne 400 g', size: 400, want: 'g' },
]
const run = (f) => fx.filter(r => f(r) !== r.want).map(r => r.id)
assert.deepEqual(run(S.sizeUnit), [], 'Selftest: sizeUnit')
const muts = { immerG: () => 'g', jedeAngabe: r => /\d\s*(ml|l)\b/i.test(r.name) ? 'ml' : 'g', ohneMult: r => { for (const m of r.name.matchAll(/(\d+(?:[.,]\d+)?)\s*(ml|l)\b/gi)) { const v = parseFloat(m[1].replace(',', '.')) * (m[2].toLowerCase() === 'l' ? 1000 : 1); if (Math.abs(v - r.size) < .5) return 'ml' } return 'g' } }
for (const [k, f] of Object.entries(muts)) assert.notDeepEqual(run(f), [], `Mutation ${k} muss rot werden`)
const ml = rows.filter(r => S.sizeUnit(r) === 'ml').map(r => r.id).sort((a, b) => a - b)
const EXP = [2722, 2724, 3209, 3219, 3220, 3221, 3223]
for (const id of EXP) if (rows.some(r => r.id === id)) assert.ok(ml.includes(id), `#${id} muss ml sein`)
for (const id of ml) { const r = rows.find(x => x.id === id); assert.ok(!r.nonfood, `#${id} Non-Food als ml`) }
assert.equal(S.per100Label(rows.find(r => r.id === 2722) ?? fx[0]), '€/100 ml')
assert.equal(S.per100Label({ name: 'Lasagne', size: 400 }), '€/100 g')
console.log(`[size-unit] ${ml.length} ml-Zeilen (${ml.join(', ')}), Rest g; Selftest + 3 Mutationen rot – OK`)
// Sensecheck 97 P3-3: Detail „Inhalt“ und Vergleichstabelle (Packungsgröße, Preis/100) folgen ebenfalls sizeUnit statt hart „g“.
// Quelltext-Check mit Mutation: die alte harte Schreibweise muss vom Check erkannt werden.
const srcOk = (det, vt) => [
  !/\$\{fmt\(r\.size,0\)\} g`/.test(det) && /\$\{fmt\(r\.size,0\)\} \$\{sizeUnit\(r\)\}`/.test(det) || 'Detail Inhalt',
  /k: 'size',[^}]*u: r => sizeUnit\(/.test(vt) || 'Vergleich Packungsgröße',
  /k: 'p100g',[^}]*u: r => per100Label\(/.test(vt) || 'Vergleich Preis/100',
  /typeof m\.u === 'function' \? m\.u\(r\)/.test(vt) || 'Vergleich rendert u(r)',
].filter(x => x !== true)
const det = readFileSync(new URL('../src/views/Detail.tsx', import.meta.url), 'utf8')
const vt = readFileSync(new URL('../src/views/VergleichTabelle.tsx', import.meta.url), 'utf8')
assert.deepEqual(srcOk(det, vt), [], 'ml-Beschriftung Detail/Vergleich')
assert.notDeepEqual(srcOk(det.replace('${fmt(r.size,0)} ${sizeUnit(r)}`', '${fmt(r.size,0)} g`'), vt), [], 'Mutation Detail hart g muss rot werden')
assert.notDeepEqual(srcOk(det, vt.replace("u: r => sizeUnit(r as any)", "u: 'g'")), [], 'Mutation Vergleich hart g muss rot werden')
assert.notDeepEqual(srcOk(det, vt.replace("u: r => per100Label(r as any)", "u: '€'")), [], 'Mutation Vergleich Preis/100 hart muss rot werden')
console.log('[size-unit] Detail Inhalt + Vergleich Packungsgröße/Preis-100 folgen sizeUnit; 3 Mutationen rot – OK')
