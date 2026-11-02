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
// Sensecheck 99 P3-1: Grundpreis-Zeile „€/kg“ wird bei ml-Packungen „€/l“ (Detail „Packung & Preis“, Produktvergleich-Sheet).
assert.equal(S.perKgLabel(rows.find(r => r.id === 3221) ?? fx[1]), '€/l')
assert.equal(S.perKgLabel({ name: 'Lasagne 400 g', size: 400 }), '€/kg')
assert.equal(S.perKgLabel(fx[2]), '€/kg', 'Non-Food bleibt €/kg')
const cmp = readFileSync(new URL('../src/views/Compare.tsx', import.meta.url), 'utf8')
const kgOk = (det, cmp) => [
  !/<Row l="€\/kg" v=\{r\.ppk/.test(det) && /<Row l=\{perKgLabel\(r\)\} v=\{r\.ppk/.test(det) || 'Detail €/kg hart',
  /k:'ppk',[^}]*u:r=>perKgLabel\(/.test(cmp) || 'Vergleich-Sheet Wert-Einheit',
  /m\.k==='ppk'\?ppkHead\(items\)/.test(cmp) || 'Vergleich-Sheet Kopf',
  /typeof m\.u==='function'\?m\.u\(r\)/.test(cmp) || 'Vergleich-Sheet rendert u(r)',
].filter(x => x !== true)
assert.deepEqual(kgOk(det, cmp), [], '€/l-Beschriftung Detail/Vergleich-Sheet')
assert.notDeepEqual(kgOk(det.replace('<Row l={perKgLabel(r)} v={r.ppk', '<Row l="€/kg" v={r.ppk'), cmp), [], 'Mutation Detail hart €/kg muss rot werden')
assert.notDeepEqual(kgOk(det, cmp.replace("u:r=>perKgLabel(r as any)", "u:'€'")), [], 'Mutation Sheet-Einheit hart muss rot werden')
assert.notDeepEqual(kgOk(det, cmp.replace("m.k==='ppk'?ppkHead(items):m.l", 'm.l')), [], 'Mutation Sheet-Kopf hart muss rot werden')
const hd = (ids) => { const u = new Set(ids.map(id => S.perKgLabel(rows.find(r => r.id === id) ?? {}))); return u.size > 1 ? '€/kg bzw. €/l' : [...u][0] }
console.log(`[size-unit] €/l: #3221 ${S.perKgLabel(rows.find(r => r.id === 3221) ?? fx[1])}, Kopf 3221+3220 „${hd([3221, 3220])}“, 3221+Lasagne gemischt; 3 Mutationen rot – OK`)
// Sensecheck 100 P3-2/P3-3: gemischter Vergleich (€/kg neben €/l) vergibt keinen 🏆 für €/kg und zeigt einen Hinweis; Wert-Zelle bricht nicht um.
const mixOk = (c) => [
  /export const ppkMixed=\(items:Row\[\]\)=>new Set\(items\.map\(r=>perKgLabel\(/.test(c) || 'ppkMixed fehlt',
  /const win=\(m:M\)=>\{if\(m\.k==='ppk'&&ppkMixed\(items\)\)return null;/.test(c) || 'win ohne Mixed-Ausnahme',
  /m\.k==='ppk'&&ppkMixed\(items\)\?'kg und l nicht direkt vergleichbar/.test(c) || 'Hinweis fehlt',
  /whitespace-nowrap text-right tabular-nums/.test(c) || 'Wert-Zelle bricht um',
].filter(x => x !== true)
assert.deepEqual(mixOk(cmp), [], 'gemischter €/kg-€/l-Vergleich')
assert.notDeepEqual(mixOk(cmp.replace("if(m.k==='ppk'&&ppkMixed(items))return null;", '')), [], 'Mutation 🏆 bei gemischt muss rot werden')
assert.notDeepEqual(mixOk(cmp.replace("m.k==='ppk'&&ppkMixed(items)?'kg und l nicht direkt vergleichbar – kein Sieger':", '')), [], 'Mutation ohne Hinweis muss rot werden')
assert.notDeepEqual(mixOk(cmp.replace('whitespace-nowrap text-right', 'text-right')), [], 'Mutation Umbruch muss rot werden')
const mixed = (ids) => new Set(ids.map(id => S.perKgLabel(rows.find(r => r.id === id) ?? { name: 'x', size: 400 }))).size > 1
assert.equal(mixed([3221, 8]), true, '3221+Lasagne gemischt'); assert.equal(mixed([3221, 3220]), false, '3221+3220 nur €/l')
console.log('[size-unit] gemischter Vergleich: kein 🏆 €/kg, Hinweis, kein Umbruch; 3 Mutationen rot – OK')
// Sensecheck 101 (Nicht geprüft/bekannt): Fabrik-Karten in Misc zeigen je Produkt „€/l“ bei ml-Packungen statt hart „€/kg“.
const misc = readFileSync(new URL('../src/views/Misc.tsx', import.meta.url), 'utf8')
const miscOk = (m) => [!/\{fmt\(r\.ppk,2\)\} €\/kg</.test(m) && /\{fmt\(r\.ppk,2\)\} \{perKgLabel\(r\)\}</.test(m) || 'Misc €/kg hart', /import \{ perKgLabel \} from '\.\.\/app\/unit'/.test(m) || 'Misc Import'].filter(x => x !== true)
assert.deepEqual(miscOk(misc), [], 'Misc €/l-Beschriftung')
assert.notDeepEqual(miscOk(misc.replace('{fmt(r.ppk,2)} {perKgLabel(r)}<', '{fmt(r.ppk,2)} €/kg<')), [], 'Mutation Misc hart €/kg muss rot werden')
console.log('[size-unit] Misc Fabrik-Karten: €/l bei ml je Produkt; 1 Mutation rot – OK')
// Sensecheck 102 P3-1: Spannen-Badge im Fabrik-Kartenkopf nicht mehr hart „€/kg-Spanne“, sondern spreadLabel(rs) (gemischt g/ml neutral).
const misc2 = readFileSync(new URL('../src/views/Misc.tsx', import.meta.url), 'utf8')
const spOk = (m) => [
  !/>€\/kg-Spanne ×/.test(m) && /\{spreadLabel\(rs\)\} ×\{fmt\(spread,1\)\}/.test(m) || 'Badge hart €/kg',
  /u\.size>1\?'Grundpreis-Spanne':`\$\{\[\.\.\.u\]\[0\]\?\?'€\/kg'\}-Spanne`/.test(m) || 'spreadLabel gemischt/einheitlich',
].filter(x => x !== true)
assert.deepEqual(spOk(misc2), [], 'Spannen-Badge folgt Einheit')
assert.notDeepEqual(spOk(misc2.replace('{spreadLabel(rs)} ×{fmt(spread,1)}', '€/kg-Spanne ×{fmt(spread,1)}')), [], 'Mutation Badge hart €/kg muss rot werden')
assert.notDeepEqual(spOk(misc2.replace("u.size>1?'Grundpreis-Spanne':", "u.size>1?'€/kg-Spanne':")), [], 'Mutation gemischt €/kg muss rot werden')
const spl = (ids) => { const u = new Set(ids.map(id => S.perKgLabel(rows.find(r => r.id === id) ?? {}))); return u.size > 1 ? 'Grundpreis-Spanne' : `${[...u][0]}-Spanne` }
assert.equal(spl([3221, 3220]), '€/l-Spanne'); assert.equal(spl([3221, 8]), 'Grundpreis-Spanne'); assert.equal(spl([8]), '€/kg-Spanne')
console.log('[size-unit] Fabrik-Spannen-Badge folgt Einheit (€/kg, €/l, gemischt „Grundpreis-Spanne“); 2 Mutationen rot – OK')
