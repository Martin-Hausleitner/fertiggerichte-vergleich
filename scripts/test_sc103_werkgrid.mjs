// sensecheck 103 P2-1: Fabrik-Karten („Gleicher Hersteller“) dürfen auf dem Handy nicht von der
// overflow-x-Produktzeile aufgeblasen werden: Grid grid-cols-1 + Card min-w-0, Kopf umbrechbar.
import fs from 'node:fs'
const s = fs.readFileSync(new URL('../src/views/Misc.tsx', import.meta.url), 'utf8')
const fail = m => { console.error('[sc103] FAIL: ' + m); process.exit(1) }
const grid = s.match(/<div className="([^"]*)" data-testid="werk-grid">/)
if (!grid) fail('werk-grid fehlt')
if (!/\bgrid-cols-1\b/.test(grid[1]) || !/\bmd:grid-cols-2\b/.test(grid[1])) fail('werk-grid braucht grid-cols-1 md:grid-cols-2: ' + grid[1])
const card = s.match(/<Card key=\{g\.code\} className="([^"]*)"><div className="([^"]*)">/)
if (!card) fail('Werk-Card nicht gefunden')
if (!/\bmin-w-0\b/.test(card[1])) fail('Werk-Card ohne min-w-0')
if (!/\bflex-wrap\b/.test(card[2])) fail('Kartenkopf ohne flex-wrap (Spannen-Badge muss umbrechen)')
if (!/data-testid="spread-badge"/.test(s)) fail('spread-badge fehlt')
console.log('[sc103] ok: Werk-Grid grid-cols-1 + Card min-w-0 + Kopf flex-wrap')
