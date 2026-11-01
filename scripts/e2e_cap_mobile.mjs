// Sensecheck 93 P3: the provider-cap hint ("Ohne Limit kämen N …") must not get lost inside the 5-line paragraph on mobile.
// 390 px: own line (display block, starts at the paragraph's left edge below its first line, badge background).
// 1366 px: unchanged inline text. Counts per list = capHidden oracle from data.json; no hint for an empty list or with "ohne Limit".
// Run after `npm run build`: node scripts/e2e_cap_mobile.mjs
import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFileSync, existsSync, statSync } from 'fs'
import { join, extname } from 'path'
import assert from 'node:assert/strict'
const ROOT = process.env.PW_DIST || new URL('../dist', import.meta.url).pathname
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' }
const server = createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]); if (p === '/') p = '/index.html'
  const fp = join(ROOT, p); if (!fp.startsWith(ROOT) || !existsSync(fp) || statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'content-type': MIME[extname(fp)] || 'application/octet-stream' }); res.end(readFileSync(fp))
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}/`
// Oracle (SC96 P3-1): expected hidden count per list straight from the built data.json - uncapped top N ids missing from the capped list.
const D = JSON.parse(readFileSync(join(ROOT, 'data.json'), 'utf8')); const BY = new Set(D.rows.map(r => r.id))
const ORA = Object.fromEntries([['pli', 'topPLI'], ['h', 'topHealth'], ['pe', 'topPE'], ['light', 'topLight']].map(([k, L]) => { const c = D[L] || [], u = D[L + 'Uncapped'] || []; return [k, u.slice(0, c.length).filter(i => !c.includes(i) && BY.has(i)).length] }))
const LISTS = [['🏆 Preis-Leistung', 'pli'], ['💚 Gesündeste', 'h'], ['💪 Protein pro €', 'pe'], ['🥗 Leichte Mahlzeiten', 'light']]
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] }); const errs = []; const seen = {}
for (const [w, h] of [[390, 844], [1366, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } }); page.on('pageerror', e => errs.push(e.message))
  await page.route(u => !u.href.startsWith(base), r => r.abort())
  await page.goto(base + '#tab=top'); await page.waitForSelector('[data-testid=nolimit], button:has-text("Preis-Leistung")', { timeout: 30000 })
  for (const [label, k] of LISTS) {
    await page.getByRole('button', { name: label }).click(); await page.waitForTimeout(200)
    const el = page.locator('[data-testid=cap-hidden]')
    if (!(await el.count())) { seen[`${k}@${w}`] = 0; continue }
    assert.ok(ORA[k] > 0, `${k}@${w}: no cap-hidden element when the oracle is 0`) // SC96 P3-2: check absence, not just a 0 in the text
    const m = await el.evaluate(e => { const p = e.closest('p'), cs = getComputedStyle(e), pr = p.getBoundingClientRect(), er = e.getClientRects()[0], lh = parseFloat(getComputedStyle(p).lineHeight) || 20
      return { disp: cs.display, bg: cs.backgroundColor, top: er.top - pr.top, left: Math.round(er.left - pr.left), lh, txt: e.textContent, docW: document.documentElement.scrollWidth } })
    const n = +(m.txt.match(/kämen (\d+)/) || [])[1]; seen[`${k}@${w}`] = n
    assert.ok(m.docW <= w, `${k}@${w}: no horizontal overflow (${m.docW})`)
    if (w < 640) {
      assert.equal(m.disp, 'block', `${k}@390: cap hint on its own line`); assert.equal(m.left, 0, `${k}@390: starts at paragraph left`)
      assert.ok(m.top >= m.lh * 0.9, `${k}@390: below the first text line (top ${m.top}, lh ${m.lh})`); assert.notEqual(m.bg, 'rgba(0, 0, 0, 0)', `${k}@390: badge background`)
    } else {
      assert.equal(m.disp, 'inline', `${k}@1366: desktop unchanged (inline)`); assert.equal(m.bg, 'rgba(0, 0, 0, 0)', `${k}@1366: no badge`)
    }
  }
  // "ohne Limit" removes the hint
  await page.getByRole('button', { name: '🏆 Preis-Leistung' }).click(); await page.locator('[data-testid=nolimit] input').check(); await page.waitForTimeout(200)
  for (const [label, k] of LISTS) { // SC96 P3-3: every capped list
    await page.getByRole('button', { name: label }).click(); await page.waitForTimeout(200)
    assert.equal(await page.locator('[data-testid=cap-hidden]').count(), 0, `${k}@${w}: no hint with ohne Limit`)
  }
  await page.close()
}
await browser.close(); server.close()
for (const k of ['pli', 'h', 'pe', 'light']) for (const w of [390, 1366]) assert.equal(seen[`${k}@${w}`], ORA[k], `${k}@${w}: shown ${seen[`${k}@${w}`]} = oracle ${ORA[k]}`)
assert.ok(seen['pli@390'] > 0, 'at least one list shows the hint'); assert.equal(seen['light@390'], 0, 'topLight: no hint')
assert.deepEqual(errs, [], 'no page errors')
console.log(`[e2e-cap-mobile] OK – pli ${seen['pli@390']}, h ${seen['h@390']}, pe ${seen['pe@390']}, light ${seen['light@390']}; 390 px eigene Zeile/Badge, 1366 px inline`)
