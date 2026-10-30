// SC83 P3: Heute-Kopfzeile und Sonntags-Check müssen Europe/Vienna nutzen, nicht die Geräte-TZ.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const s = readFileSync(new URL('../src/views/Heute.tsx', import.meta.url), 'utf8')
assert.ok(!/now\.getDay\(\)/.test(s), 'Heute.tsx: Sonntags-Check darf nicht now.getDay() (Geräte-TZ) nutzen')
assert.ok(/viennaDayMin\(now\)\.day === 6/.test(s), 'Heute.tsx: sunday = viennaDayMin(now).day === 6 (Mo=0…So=6)')
assert.ok(/toLocaleString\('de-AT', \{[^}]*timeZone: 'Europe\/Vienna'/.test(s), 'Heute.tsx: Kopfzeile mit timeZone Europe/Vienna')
// So 00:30 Wien = Sa 23:30 UTC (Winterzeit) → Kopfzeile Sonntag
const d = new Date('2026-10-31T23:30:00Z')
assert.match(d.toLocaleString('de-AT', { weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' }), /Sonntag/)
const wd = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', weekday: 'short' }).format(d)
assert.equal(wd, 'Sun')
console.log('test_heute_tz ok')
