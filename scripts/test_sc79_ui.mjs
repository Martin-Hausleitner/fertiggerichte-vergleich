// SC79 P2: rankableLight-aware helpers in Top, Health, HealthRadar, Planner, Netz3D
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const src = f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')
const checks = [
  ['views/Top.tsx', /isRowRankable\(r\)&&r\.eur10p/, /R\.filter\(r=>r\.rankable&&/],
  ['views/Health.tsx', /y:rowP100k\(r\)/, /r\.p100k!=null&&r\.salt/],
  ['components/health.tsx', /const v=rowP100k\(r\)/, /r=>r\.p100k==null/],
  ['views/Planner.tsx', /isRowRankable\(r\)&&r\.price/, /r\.rankable&&r\.price/],
  ['views/Netz3D.tsx', /rowPli\(r\)\?\?0/, /\br\.pli\b/],
]
for (const [f, must, mustNot] of checks) { const s = src(f); assert.match(s, must, f); assert.doesNotMatch(s, mustNot, f) }
const D = JSON.parse(readFileSync(new URL('../public/data.json', import.meta.url), 'utf8'))
const rows = Array.isArray(D) ? D : (D.rows ?? D.R ?? [])
const light = rows.filter(r => !r.rankable && r.rankableLight).length
assert.ok(light > 0, 'rankableLight rows present')
console.log(`[sc79] OK: 5 views use isRowRankable/rowPli/rowP100k; ${light} rankableLight rows now eligible`)
