// Sensecheck 86 P3: dupOf-Invariante prüfbar machen.
// Hart: Ziel existiert, keine Ketten (Ziel ist selbst kein dupOf), kein Selbstverweis, versteckte Zeile nie gerankt.
// Gezählt: dupOf-Paare ohne pPor (versteckt (h) oder Ziel (t)) – Budget darf nicht wachsen (main 23, sc83-data 16).
// Budget senken, sobald die Daten (Health Connector Builder) die pPor-Lücken schließen.
import { readFileSync } from 'node:fs';
const file = process.argv[2] || 'public/data.json';
const MAX_PPOR_GAPS = Number(process.env.DUPOF_PPOR_MAX ?? 23);
const rows = JSON.parse(readFileSync(file, 'utf8')).rows;
const by = new Map(rows.map((r) => [r.id, r]));
const dups = rows.filter((r) => r.dupOf != null);
const hard = [], gaps = [];
for (const r of dups) {
  const t = by.get(r.dupOf);
  if (!t) { hard.push(`#${r.id} dupOf #${r.dupOf} existiert nicht`); continue; }
  if (t.id === r.id) hard.push(`#${r.id} dupOf sich selbst`);
  if (t.dupOf != null) hard.push(`#${r.id} → #${t.id} ist selbst dupOf #${t.dupOf} (Kette)`);
  if (r.rankable) hard.push(`#${r.id} ist dupOf, aber gerankt`);
  if (r.pPor == null || t.pPor == null) gaps.push(`#${r.id}→#${t.id}${r.pPor == null ? '(h)' : ''}${t.pPor == null ? '(t)' : ''}`);
}
console.log(`dupOf: ${dups.length} Zeilen, harte Verstöße ${hard.length}, pPor-Lücken ${gaps.length} (Budget ${MAX_PPOR_GAPS}): ${gaps.join(' ')}`);
let fail = false;
if (!dups.length) { fail = true; console.error('FAIL keine dupOf-Zeilen gefunden – Datenformat geändert?'); }
if (hard.length) { fail = true; console.error('FAIL dupOf-Invariante:\n  ' + hard.slice(0, 30).join('\n  ')); }
if (gaps.length > MAX_PPOR_GAPS) { fail = true; console.error(`FAIL pPor-Lücken ${gaps.length} > Budget ${MAX_PPOR_GAPS}`); }
if (fail) process.exit(1);
console.log('ok test_dupof_invariant');
