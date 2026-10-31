// Sensecheck 86 P3 (SC83 P3): alsoAt-Lücken zählen und absichern.
// Gruppe = gleiche EAN in >1 Shop. Für jede aktive Zeile (nicht dupOf) muss jeder andere Shop der Gruppe
// in alsoAt (gleiche Packung) oder alsoPack (andere Packung) stehen; pro EAN höchstens 1 gerankte Zeile.
// SC87 P3(3): Die echten Daten haben 0 Zeilen, deren Gruppen-Store nur via alsoPack abgedeckt ist – der
// alsoPack-Pfad wird daher bei jedem Lauf zusätzlich mit einer synthetischen Fixture geprüft (inkl. Mutation).
import { readFileSync } from 'node:fs';

export function check(rows) {
  const groups = new Map();
  for (const r of rows) { if (!r.ean) continue; if (!groups.has(r.ean)) groups.set(r.ean, []); groups.get(r.ean).push(r); }
  let multi = 0, gapsAll = 0, viaPackOnly = 0; const gaps = [], doubleRanked = [];
  for (const [ean, g] of groups) {
    const stores = new Set(g.map((r) => r.store));
    if (stores.size < 2) continue;
    multi++;
    if (g.filter((r) => r.rankable).length > 1) doubleRanked.push(ean);
    for (const r of g) {
      const at = new Set(r.alsoAt || []);
      const known = new Set([...at, ...(r.alsoPack || []).map((p) => p && p.store)]);
      for (const s of stores) if (s !== r.store && !at.has(s) && known.has(s)) viaPackOnly++;
      const miss = [...stores].filter((s) => s !== r.store && !known.has(s));
      if (!miss.length) continue;
      gapsAll++;
      if (r.dupOf == null) gaps.push(`#${r.id} ${r.store} (EAN ${ean}) fehlt: ${miss.join(', ')}`);
    }
  }
  return { multi, gapsAll, viaPackOnly, gaps, doubleRanked };
}

function selftest() {
  const fx = [
    { id: 1, ean: '9000000000001', store: 'billa', rankable: true, alsoAt: [], alsoPack: [{ store: 'spar', id: 2 }] },
    { id: 2, ean: '9000000000001', store: 'spar', rankable: false, dupOf: 1, alsoAt: [], alsoPack: [] },
    { id: 3, ean: '9000000000002', store: 'hofer', rankable: true, alsoAt: ['penny'] },
    { id: 4, ean: '9000000000002', store: 'penny', rankable: false, alsoAt: ['hofer'] },
  ];
  const ok = check(fx);
  const errs = [];
  if (ok.gaps.length || ok.doubleRanked.length) errs.push('Fixture muss grün sein: ' + ok.gaps.join('; '));
  if (ok.viaPackOnly !== 1) errs.push(`Fixture: genau 1 Store nur via alsoPack erwartet, ist ${ok.viaPackOnly}`);
  const mut = check(fx.map((r) => (r.id === 1 ? { ...r, alsoPack: [] } : r)));
  if (mut.gaps.length !== 1 || !mut.gaps[0].startsWith('#1 billa')) errs.push('Mutation alsoPack entfernt muss genau #1 als Lücke melden');
  const mut2 = check(fx.map((r) => (r.id === 4 ? { ...r, rankable: true } : r)));
  if (mut2.doubleRanked.length !== 1) errs.push('Mutation 2× gerankt je EAN muss fehlschlagen');
  const mut3 = check(fx.map((r) => (r.id === 2 ? { ...r, alsoPack: [] } : r)));
  if (mut3.gaps.length) errs.push('dupOf-Zeile ohne alsoPack darf keine aktive Lücke sein');
  return errs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const st = selftest();
  if (st.length) { console.error('FAIL selftest alsoPack-Fixture:\n  ' + st.join('\n  ')); process.exit(1); }
  console.log('selftest alsoPack-Fixture ok (Pfad nur-via-alsoPack + 3 Mutationen)');
  const file = process.argv[2] || 'public/data.json';
  const { multi, gapsAll, viaPackOnly, gaps, doubleRanked } = check(JSON.parse(readFileSync(file, 'utf8')).rows);
  console.log(`alsoAt: ${multi} EAN-Gruppen in >1 Shop, Lücken gesamt ${gapsAll} (davon aktive Zeilen ${gaps.length}), doppelt gerankt ${doubleRanked.length}, Stores nur via alsoPack ${viaPackOnly}`);
  let fail = false;
  if (gaps.length) { fail = true; console.error('FAIL alsoAt-Lücken bei aktiven Zeilen:\n  ' + gaps.slice(0, 30).join('\n  ')); }
  if (doubleRanked.length) { fail = true; console.error('FAIL mehr als 1 gerankte Zeile je EAN: ' + doubleRanked.slice(0, 30).join(', ')); }
  if (multi === 0) { fail = true; console.error('FAIL keine EAN-Gruppen gefunden – Datenformat geändert?'); }
  if (fail) process.exit(1);
  console.log('ok test_alsoat_gaps');
}
