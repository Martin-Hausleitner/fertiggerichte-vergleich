// Sensecheck 29 (1) e2e on dist/: parked old numeric favourites → restore dialog → user picks the version → exactly those products
// become favourites (uids), parked list cleared, fg-favs-meta written. Run after `npm run build`: node scripts/e2e_legacy_favs.mjs
import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFileSync, existsSync, statSync } from 'fs'
import { join, extname } from 'path'
import { execFileSync } from 'child_process'
import assert from 'node:assert/strict'
const ROOT = new URL('../dist', import.meta.url).pathname
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' }
const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]); if (p === '/') p = '/index.html'
  const fp = join(ROOT, p); if (!fp.startsWith(ROOT) || !existsSync(fp) || statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'content-type': MIME[extname(fp)] || 'application/octet-stream' }); res.end(readFileSync(fp))
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/`
const D = JSON.parse(readFileSync(join(ROOT, 'data.json'), 'utf8'))
const old = JSON.parse(execFileSync('git', ['show', '94e0cd2:public/data.json'], { maxBuffer: 1 << 28, encoding: 'utf8' })).rows
const nums = [463, 1200, 2000, 3000], want = nums.map(n => D.rows.find(r => r.name === old[n].name && r.store === old[n].store).uid)
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } }); const errs = []
page.on('pageerror', e => errs.push(e.message))
await page.goto(base); await page.evaluate(n => { localStorage.clear(); localStorage.setItem('fg-favs-legacy', JSON.stringify(n)) }, nums)
await page.goto(base + '#tab=alle'); await page.reload(); await page.waitForSelector('[data-testid=legacy-favs]', { timeout: 30000 })
await page.click('[data-testid=legacy-favs]'); await page.waitForSelector('[data-testid=legacy-favs-sheet] input[type=radio]', { timeout: 30000 })
// the option whose product list is the 94e0cd2 list
const labels = page.locator('[data-testid=legacy-favs-sheet] label'); const n = await labels.count(); let hit = -1
for (let i = 0; i < n; i++) { const t = await labels.nth(i).innerText(); if (nums.every((_, k) => t.includes(old[nums[k]].name))) { hit = i; break } }
assert.ok(hit >= 0, '94e0cd2 option shown'); await labels.nth(hit).locator('input[type=radio]').check()
await page.click('[data-testid=legacy-favs-apply]'); await page.waitForTimeout(300)
const ls = await page.evaluate(() => ({ favs: JSON.parse(localStorage.getItem('fg-favs-uid') || '[]'), parked: JSON.parse(localStorage.getItem('fg-favs-legacy') || '[]'), meta: JSON.parse(localStorage.getItem('fg-favs-meta') || 'null') }))
assert.deepEqual([...ls.favs].sort(), [...want].sort(), 'restored favourites = 94e0cd2 products'); assert.deepEqual(ls.parked, [])
assert.equal(ls.meta?.dataVersion, D.dataVersion); assert.equal(ls.meta?.rows, D.rows.length)
assert.equal(await page.locator('[data-testid=legacy-favs]').count(), 0, 'button gone after restore')
// old fg-favs (never migrated) → unresolvable numbers parked, not mapped to the current row at that index
await page.evaluate(n => { localStorage.clear(); localStorage.setItem('fg-favs', JSON.stringify(n)) }, nums); await page.reload(); await page.waitForSelector('[data-testid=legacy-favs]', { timeout: 30000 })
const ls2 = await page.evaluate(() => ({ favs: JSON.parse(localStorage.getItem('fg-favs-uid') || '[]'), parked: JSON.parse(localStorage.getItem('fg-favs-legacy') || '[]'), old: localStorage.getItem('fg-favs') }))
assert.deepEqual(ls2.favs, []); assert.deepEqual(ls2.parked, nums); assert.equal(ls2.old, null)
assert.deepEqual(errs, [], 'no page errors')
console.log(`[e2e legacy favs] OK: ${nums} (94e0cd2) → ${want.length} uids via restore dialog (${n} options), meta ${ls.meta.dataVersion}, fg-favs → parked ${ls2.parked.length}, 0 page errors`)
await browser.close(); server.close()
