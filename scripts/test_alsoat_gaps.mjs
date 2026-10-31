// Sensecheck 86 P3 (SC83 P3): alsoAt-Lücken zählen und absichern.
// Gruppe = gleiche EAN in >1 Shop. Für jede aktive Zeile (nicht dupOf) muss jeder andere Shop der Gruppe
// in alsoAt (gleiche Packung) oder alsoPack (andere Packung) stehen; pro EAN höchstens 1 gerankte Zeile.
import { readFileSync } from 'node:fs';
const file = process.argv[2] || 'public/data.json';
const rows = JSON.parse(readFileSync(file, 'utf8')).rows;
const groups = new Map();
for (const r of rows) { if (!r.ean) continue; if (!groups.has(r.ean)) groups.set(r.ean, []); groups.get(r.ean).push(r); }
let multi = 0, gapsAll = 0; const gaps = [], doubleRanked = [];
for (const [ean, g] of groups) {
  const stores = new Set(g.map((r) => r.store));
  if (stores.size < 2) continue;
  multi++;
  if (g.filter((r) => r.rankable).length > 1) doubleRanked.push(ean);
  for (const r of g) {
    const known = new Set([...(r.alsoAt || []), ...(r.alsoPack || []).map((p) => p && p.store)]);
    const miss = [...stores].filter((s) => s !== r.store && !known.has(s));
    if (!miss.length) continue;
    gapsAll++;
    if (r.dupOf == null) gaps.push(`#${r.id} ${r.store} (EAN ${ean}) fehlt: ${miss.join(', ')}`);
  }
}
console.log(`alsoAt: ${multi} EAN-Gruppen in >1 Shop, Lücken gesamt ${gapsAll} (davon aktive Zeilen ${gaps.length}), doppelt gerankt ${doubleRanked.length}`);
let fail = false;
if (gaps.length) { fail = true; console.error('FAIL alsoAt-Lücken bei aktiven Zeilen:\n  ' + gaps.slice(0, 30).join('\n  ')); }
if (doubleRanked.length) { fail = true; console.error('FAIL mehr als 1 gerankte Zeile je EAN: ' + doubleRanked.slice(0, 30).join(', ')); }
if (multi === 0) { fail = true; console.error('FAIL keine EAN-Gruppen gefunden – Datenformat geändert?'); }
if (fail) process.exit(1);
console.log('ok test_alsoat_gaps');
